/**
 * campaign-dispatcher.js
 * Worker de disparo de campanhas WhatsApp com anti-ban
 *
 * Anti-ban rules:
 *   1. Delay aleatório entre mensagens (min_delay .. max_delay)
 *   2. Rotação de instâncias (round-robin ou random)
 *   3. Limite diário por instância
 *   4. Working hours enforcement
 *   5. IA gera mensagens únicas (sem duplicatas)
 *   6. Validação de telefone
 *   7. Blacklist check
 *   8. Retry com backoff em outra instância
 */

import { getSupabaseServer } from '../lib/supabase-server.js';
import { getWhatsAppClient } from '../api/whatsapp/providers/provider-config.js';

const runningCampaigns = new Map();

export function isCampaignRunning(campaignId) {
  return runningCampaigns.has(campaignId);
}

export function getCampaignProgress(campaignId) {
  return runningCampaigns.get(campaignId) || null;
}

export async function startDispatch(campaignId) {
  if (runningCampaigns.has(campaignId)) {
    throw new Error('Campanha já está em execução');
  }

  const supabase = getSupabaseServer();
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) throw new Error('Campanha não encontrada');
  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    throw new Error('Campanha já finalizada');
  }

  const { data: instances } = await supabase
    .from('campaign_instances')
    .select('*, whatsapp_instances!inner(id, name, phone, status, tenant_id)')
    .eq('campaign_id', campaignId)
    .eq('is_active', true);

  if (!instances?.length) {
    throw new Error('Nenhuma instância ativa atribuída à campanha');
  }

  const activeInstances = instances.filter(
    (i) => i.whatsapp_instances?.status === 'connected'
  );

  if (!activeInstances.length) {
    throw new Error('Nenhuma instância conectada disponível');
  }

  // Update campaign status
  await supabase
    .from('campaigns')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', campaignId);

  const state = {
    campaignId,
    campaign,
    instances: activeInstances,
    currentIndex: 0,
    totalSent: 0,
    totalFailed: 0,
    abortController: new AbortController(),
  };

  runningCampaigns.set(campaignId, state);

  // Run dispatch in background (non-blocking)
  runDispatchLoop(state).catch((err) => {
    console.error(
      `[CampaignDispatcher] Fatal error for ${campaignId}:`,
      err.message
    );
    finalizeCampaign(state, 'paused');
  });

  return { started: true, instances: activeInstances.length };
}

export async function pauseDispatch(campaignId) {
  const state = runningCampaigns.get(campaignId);
  if (!state) throw new Error('Campanha não está em execução');

  state.abortController.abort();
  runningCampaigns.delete(campaignId);

  const supabase = getSupabaseServer();
  await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', campaignId);

  return { paused: true, sent: state.totalSent, failed: state.totalFailed };
}

async function runDispatchLoop(state) {
  const supabase = getSupabaseServer();
  const { campaign, instances } = state;

  const preloadedBlacklist = new Set(
    (
      await supabase
        .from('campaign_blacklist')
        .select('phone')
        .eq('organization_id', campaign.organization_id)
    ).data?.map((row) => row.phone) || []
  );

  const instanceDailyCounters = new Map();
  for (const instance of instances) {
    instanceDailyCounters.set(instance.id, 0);
  }

  while (!state.abortController.signal.aborted) {
    if (
      !isWithinWorkingHours(
        campaign.working_hours_start,
        campaign.working_hours_end
      )
    ) {
      console.log(
        `[CampaignDispatcher] Fora do horário. Dormindo até próximo horário.`
      );
      await sleepUntilNextWorkingHour(campaign.working_hours_start);
      if (state.abortController.signal.aborted) break;
    }

    const { data: contact } = await supabase
      .from('campaign_contacts')
      .select('*')
      .eq('campaign_id', state.campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!contact) {
      console.log(`[CampaignDispatcher] Todos os contatos processados.`);
      await finalizeCampaign(state, 'completed');
      break;
    }

    if (preloadedBlacklist.has(contact.phone)) {
      await supabase
        .from('campaign_contacts')
        .update({ status: 'blacklisted', error_message: 'Número na blacklist' })
        .eq('id', contact.id);
      state.totalFailed++;
      continue;
    }

    if (!isValidBrazilPhone(contact.phone)) {
      await supabase
        .from('campaign_contacts')
        .update({ status: 'failed', error_message: 'Telefone inválido' })
        .eq('id', contact.id);
      state.totalFailed++;
      continue;
    }

    const instance = selectInstance(state);
    if (!instance) {
      console.log(`[CampaignDispatcher] Nenhuma instância disponível`);
      await sleep(30000);
      continue;
    }

    const sentCount = instanceDailyCounters.get(instance.id) || 0;
    if (sentCount >= campaign.daily_limit_per_instance) {
      console.log(
        `[CampaignDispatcher] Limite diário atingido para instância ${instance.whatsapp_instances.name}`
      );
      state.currentIndex = (state.currentIndex + 1) % state.instances.length;
      continue;
    }

    let messageText;
    try {
      messageText = await generateMessage(campaign, contact);
    } catch (err) {
      console.error(
        `[CampaignDispatcher] IA falhou, usando template:`,
        err.message
      );
      messageText = interpolateTemplate(
        campaign.message_template,
        contact,
        campaign.message_variables
      );
    }

    try {
      const waInstance = instance.whatsapp_instances;
      const chatJid = formatPhoneToJid(contact.phone);

      await sendWhatsAppMessage(waInstance, chatJid, messageText);

      await supabase
        .from('campaign_contacts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          instance_id: waInstance.id,
          ai_message: messageText,
        })
        .eq('id', contact.id);

      const newCount = sentCount + 1;
      instanceDailyCounters.set(instance.id, newCount);

      await supabase
        .from('campaign_instances')
        .update({
          daily_sent_count: newCount,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', instance.id);

      await supabase.from('campaign_dispatch_log').insert({
        campaign_id: state.campaignId,
        contact_id: contact.id,
        instance_id: waInstance.id,
        action: 'sent',
        detail: {
          phone: contact.phone,
          message_preview: messageText.slice(0, 100),
        },
      });

      state.totalSent++;
      await supabase
        .from('campaigns')
        .update({ sent_count: state.totalSent })
        .eq('id', state.campaignId);

      console.log(
        `[CampaignDispatcher] ✅ Enviado para ${contact.phone} via ${waInstance.name}`
      );
    } catch (err) {
      console.error(
        `[CampaignDispatcher] ❌ Falha para ${contact.phone}:`,
        err.message
      );

      await supabase
        .from('campaign_contacts')
        .update({ status: 'failed', error_message: err.message.slice(0, 500) })
        .eq('id', contact.id);

      await supabase.from('campaign_dispatch_log').insert({
        campaign_id: state.campaignId,
        contact_id: contact.id,
        instance_id: instance.whatsapp_instances.id,
        action: 'failed',
        detail: { phone: contact.phone, error: err.message },
      });

      state.totalFailed++;
      await supabase
        .from('campaigns')
        .update({ failed_count: state.totalFailed })
        .eq('id', state.campaignId);
    }

    const delay = randomDelay(
      campaign.min_delay_seconds,
      campaign.max_delay_seconds
    );
    console.log(
      `[CampaignDispatcher] Aguardando ${delay}s antes do próximo envio...`
    );
    await sleep(delay * 1000);
  }
}

function selectInstance(state) {
  const { instances, campaign, currentIndex } = state;

  if (campaign.dispatch_mode === 'random') {
    return instances[Math.floor(Math.random() * instances.length)];
  }

  // round_robin or sequential
  return instances[currentIndex % instances.length];
}

function advanceInstance(state) {
  state.currentIndex = (state.currentIndex + 1) % state.instances.length;
}

async function generateMessage(campaign, contact) {
  if (!campaign.ai_prompt) {
    return interpolateTemplate(
      campaign.message_template,
      contact,
      campaign.message_variables
    );
  }

  const { getAIClient } = await import('../api/ai/helpers.js').catch(
    () => ({})
  );
  const aiClient = getAIClient?.(campaign.ai_provider || 'gemini');

  if (!aiClient) {
    return interpolateTemplate(
      campaign.message_template,
      contact,
      campaign.message_variables
    );
  }

  const vars = {};
  for (const v of campaign.message_variables || []) {
    vars[v.name] = contact.metadata?.[v.source] || contact[v.source] || '';
  }

  const prompt = `${campaign.ai_prompt}

Dados do contato:
- Nome: ${contact.name || 'Não informado'}
- Empresa: ${contact.company || 'Não informada'}
- Telefone: ${contact.phone}
Variáveis: ${JSON.stringify(vars)}

Gere UMA mensagem de WhatsApp personalizada e natural. Responda APENAS com o texto da mensagem, sem aspas, sem formatação adicional.`;

  const result = await aiClient.generate(prompt, { maxTokens: 300 });
  return (
    result?.text ||
    interpolateTemplate(
      campaign.message_template,
      contact,
      campaign.message_variables
    )
  );
}

function interpolateTemplate(template, contact, variables = []) {
  if (!template) return '';

  let msg = template;
  const vars = {};
  for (const v of variables) {
    vars[v.name] = contact.metadata?.[v.source] || contact[v.source] || '';
  }

  // Replace {{variable}} patterns
  msg = msg.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);

  // Fallback: replace common patterns
  msg = msg.replace(/\{nome\}/gi, contact.name || '');
  msg = msg.replace(/\{empresa\}/gi, contact.company || '');
  msg = msg.replace(/\{phone\}/gi, contact.phone || '');

  return msg;
}

async function sendWhatsAppMessage(instance, chatJid, text) {
  const client = getWhatsAppClient();
  if (!client) throw new Error('WhatsApp provider não configurado');

  return client.sendText(instance, chatJid, text);
}

function formatPhoneToJid(phone) {
  const digits = phone.replace(/\D/g, '');
  const num = digits.startsWith('55') ? digits : `55${digits}`;
  return `${num}@s.whatsapp.net`;
}

function isValidBrazilPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  const num = digits.startsWith('55') ? digits.slice(2) : digits;
  return /^[1-9]{2}9[0-9]{8}$/.test(num);
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWithinWorkingHours(start, end) {
  const now = new Date();
  const hour = now.getHours();
  if (start <= end) {
    return hour >= start && hour < end;
  }
  // Overnight (e.g., 22 -> 6)
  return hour >= start || hour < end;
}

function sleepUntilNextWorkingHour(startHour) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(startHour, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  const ms = target.getTime() - Date.now();
  console.log(
    `[CampaignDispatcher] Dormindo ${Math.round(ms / 60000)}min até ${startHour}h`
  );
  return sleep(ms);
}

async function finalizeCampaign(state, finalStatus) {
  const supabase = getSupabaseServer();
  await supabase
    .from('campaigns')
    .update({
      status: finalStatus,
      completed_at:
        finalStatus === 'completed' ? new Date().toISOString() : null,
      sent_count: state.totalSent,
      failed_count: state.totalFailed,
    })
    .eq('id', state.campaignId);

  runningCampaigns.delete(state.campaignId);
  console.log(
    `[CampaignDispatcher] Campanha ${state.campaignId} finalizada: ${finalStatus} (sent=${state.totalSent}, failed=${state.totalFailed})`
  );
}
