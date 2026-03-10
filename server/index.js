
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuração de ambiente para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') }); // Carrega .env antes de tudo

import { sendContactFormEmail } from './services/emailService.js';
import tenantHandler from './api/tenant/index.js';
const currentTenantHandler = tenantHandler;
const resolveTenantHandler = tenantHandler;
import { addDomain, verifyDomain, removeDomain } from './api/domains.js';
import { cloneSite } from './services/siteCloner.js';

// Evolution API Handlers
import evolutionWebhookHandler from './api/evolution/webhook.js';
import { getChats, getMessages, sendMessage } from './api/evolution/chat.js';
import { getInstances, createInstance, deleteInstance, connectInstance, logoutInstance } from './api/evolution/instances.js';

const app = express();
app.use(cors());
app.use(express.json());

// Log middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Credenciais do Supabase não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONNECTION TEST ENDPOINT ---
app.post('/api/test-connection', async (req, res) => {
    const { baseUrl, token, instanceName } = req.body;

    if (!baseUrl || !token || !instanceName) {
        return res.status(400).json({ error: 'Configuração incompleta' });
    }

    try {
        console.log(`🔌 Testando conexão com: ${baseUrl} / ${instanceName}`);
        
        // Tenta obter o estado da conexão
        const apiUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'apikey': token
            }
        });

        // Evolution API v2 geralmente retorna objecto com 'instance' e 'state'
        const state = response.data?.instance?.state || response.data?.state;

        if (state === 'open' || state === 'connecting') {
             res.json({ status: 'success', state, message: 'Conexão estabelecida com sucesso!' });
        } else {
             res.json({ status: 'warning', state, message: `Instância encontrada, mas estado é: ${state}` });
        }

    } catch (e) {
        console.error('❌ Falha no teste de conexão:', e.message);
        const errorMsg = e.response?.data?.message || e.message;
        res.status(200).json({ status: 'error', error: errorMsg });
    }
});

// --- WHATSAPP ENDPOINT ---
app.post('/api/send-welcome', async (req, res) => {
    const { name, phone, propertyTitle } = req.body;
    
    if (!name || !phone) return res.status(400).json({ error: 'Dados insuficientes' });

    try {
        // 1. Buscar Configurações do Banco de Dados
        const { data: settingsData, error } = await supabase
            .from('site_settings')
            .select('integrations')
            .single();

        if (error || !settingsData?.integrations?.evolutionApi?.enabled) {
            console.log('⚠️ Envio de WhatsApp ignorado: Integração desativada ou não configurada.');
            return res.json({ status: 'skipeed', reason: 'disabled' });
        }

        const config = settingsData.integrations.evolutionApi;
        
        // 2. Formatar Telefone (remover caracteres não numéricos)
        const cleanPhone = phone.replace(/\D/g, '');
        // Adicionar código do país se necessário (assumindo BR 55)
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // 3. Montar Mensagem
        const message = `Olá, ${name}! 👋\n\nRecebemos seu interesse no imóvel *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

        // 4. Enviar via Evolution API
        const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
        
        console.log(`📤 Enviando WhatsApp para ${formattedPhone} via ${apiUrl}`);

        await axios.post(apiUrl, {
            number: formattedPhone,
            text: message
        }, {
            headers: {
                'apikey': config.token,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ WhatsApp enviado com sucesso para ${name}`);
        res.json({ status: 'sent' });

    } catch (e) {
        console.error('❌ Erro ao enviar WhatsApp:', e.message);
        // Não retornar 500 para não quebrar o fluxo do frontend, apenas logar
        res.status(200).json({ status: 'error', error: e.message });
    }
});

// --- CONTACT FORM ENDPOINT ---
app.post('/api/contact', async (req, res) => {
    const { 
        name, email, phone, message,
        // Tracking data
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer_url, landing_page_url, client_id, fbp, fbc, session_data
    } = req.body;
    
    // Validation
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    try {
        console.log(`📧 Novo contato recebido de: ${name} (${email})`);
        if (utm_source) {
            console.log(`📊 Origem: ${utm_source} / ${utm_medium} / ${utm_campaign}`);
        }
        
        // 1. Get site settings for contact email and WhatsApp template
        const { data: settingsData, error: settingsError } = await supabase
            .from('site_settings')
            .select('contact_email, contact_whatsapp_template, integrations')
            .single();
        
        if (settingsError) {
            console.error('❌ Erro ao buscar configurações:', settingsError);
        }
        
        const contactEmail = settingsData?.contact_email || 'contato@fazendasbrasil.com';
        const whatsappTemplate = settingsData?.contact_whatsapp_template || 
            'Olá {name}! Recebemos seu contato através do formulário "Fale Conosco". Nossa equipe já está analisando sua mensagem e entrará em contato em breve. Obrigado!';
        
        // 2. Create lead in CRM with tracking data
        const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .insert([{
                name,
                email,
                phone,
                source: utm_source || 'Fale Conosco',
                status: 'Novo',
                notes: message,
                // Tracking fields
                utm_source,
                utm_medium,
                utm_campaign,
                utm_term,
                utm_content,
                referrer_url,
                landing_page_url,
                client_id,
                fbp,
                fbc,
                session_data: session_data ? JSON.stringify(session_data) : null
            }])
            .select()
            .single();
        
        if (leadError) {
            console.error('❌ Erro ao criar lead:', JSON.stringify(leadError, null, 2));
            throw new Error(`Erro ao salvar contato no CRM: ${leadError.message || JSON.stringify(leadError)}`);
        }
        
        console.log(`✅ Lead criado com sucesso: ${leadData.id}`);
        
        // 3. Send email notification
        try {
            await sendContactFormEmail({ name, email, phone, message }, contactEmail);
            console.log(`✅ Email de notificação enviado para ${contactEmail}`);
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError.message);
            // Continue even if email fails
        }
        
        // 4. Send WhatsApp auto-reply
        if (settingsData?.integrations?.evolutionApi?.enabled) {
            try {
                const config = settingsData.integrations.evolutionApi;
                const cleanPhone = phone.replace(/\D/g, '');
                const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                
                // Replace template variables
                const whatsappMessage = whatsappTemplate
                    .replace(/{name}/g, name)
                    .replace(/{email}/g, email)
                    .replace(/{phone}/g, phone)
                    .replace(/{message}/g, message);
                
                const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
                
                await axios.post(apiUrl, {
                    number: formattedPhone,
                    text: whatsappMessage
                }, {
                    headers: {
                        'apikey': config.token,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`✅ WhatsApp enviado para ${name}`);
            } catch (whatsappError) {
                console.error('❌ Erro ao enviar WhatsApp:', whatsappError.message);
                // Continue even if WhatsApp fails
            }
        }
        
        // Return success
        res.json({ 
            success: true, 
            message: 'Contato recebido com sucesso!',
            leadId: leadData.id
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar contato:', error);
        res.status(500).json({ 
            error: 'Erro ao processar seu contato. Por favor, tente novamente.' 
        });
    }
});

// --- TENANT ENDPOINTS (Local Dev & Compatibility) ---
// Resolve Tenant
app.get('/api/tenant/resolve', (req, res) => resolveTenantHandler(req, res));

// Current Tenant (uses same logic as Vercel Function)
app.get('/api/tenant/current', (req, res) => currentTenantHandler(req, res));

// --- AUTH MIDDLEWARE ---
const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
        // Verificar se é um usuário válido
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        // Verificar se é admin na tabela profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
            return res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
        }

        req.user = user; // Anexar usuário ao request
        next();
    } catch (e) {
        console.error('Erro na verificação de admin:', e);
        res.status(500).json({ error: 'Erro interno de autenticação' });
    }
};

// --- ADMIN USER MANAGEMENT ENDPOINTS ---

// PUT /api/admin/users/:id/password - Alterar senha do usuário
app.put('/api/admin/users/:id/password', verifyAdmin, async (req, res) => {
    console.log(`[AUTH] Solicitada alteração de senha para ID: ${req.params.id}`);
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    try {
        console.log(`🔐 Admin ${req.user.email} alterando senha do usuário ${id}`);

        const { data, error } = await supabase.auth.admin.updateUserById(
            id,
            { password: password }
        );

        if (error) throw error;

        res.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/users/:id - Excluir usuário completamente
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    console.log(`[AUTH] Solicitada exclusão do usuário ID: ${req.params.id}`);
    const { id } = req.params;

    // Prevenir auto-exclusão
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Você não pode excluir sua própria conta por aqui.' });
    }

    try {
        console.log(`🗑️ Admin ${req.user.email} excluindo usuário ${id}`);

        const { error } = await supabase.auth.admin.deleteUser(id);

        if (error) throw error;

        // Opcional: Limpar dados órfãos se não houver cascade no banco
        // Mas geralmente on delete cascade resolve profiles/leads etc.

        res.json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- RURAL DATA PROXY ENDPOINTS ---
app.get('/api/rural/car/:code', async (req, res) => {
    const { code } = req.params;
    try {
        console.log(`[RURAL] Consultando CAR: ${code}`);
        const response = await fetch(`https://api-gateway-v2.registrorural.com.br/car/consulta/${code}/demonstrativo`);
        
        if (!response.ok) throw new Error(`Erro na API oficial: ${response.statusText}`);
        
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Erro ao consultar CAR:', error);
        res.status(500).json({ error: 'Erro na consulta do CAR.' });
    }
});

app.post('/api/properties/:id/technical', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const technicalData = req.body;

    try {
        const { data, error } = await supabase
            .from('properties')
            .update({
                total_area_ha: technicalData.total_area,
                useful_area_ha: technicalData.useful_area,
                biome: technicalData.biome,
                topography: technicalData.topography,
                aptitude: technicalData.aptitude,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, property: data });
    } catch (error) {
        console.error('Erro ao atualizar dados técnicos:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- DOMAIN AUTOMATION ENDPOINTS ---

// ============================================
// SITE TEXTS API - Sistema de Textos Editáveis
// ============================================

// GET /api/texts - Listar todos os textos
app.get('/api/texts', async (req, res) => {
    try {
        const { category, section } = req.query;
        
        let query = supabase.from('site_texts').select('*');
        
        if (category) {
            query = query.eq('category', category);
        }
        
        if (section) {
            query = query.eq('section', section);
        }
        
        const { data, error } = await query.order('section', { ascending: true });
        
        if (error) {
            console.error('❌ Erro ao buscar textos:', error);
            return res.status(500).json({ error: 'Erro ao buscar textos' });
        }
        
        // Transformar array em objeto chave-valor para facilitar uso no frontend
        const textsMap = {};
        data.forEach(text => {
            textsMap[text.key] = text.value;
        });
        
        res.json({ 
            success: true, 
            texts: textsMap,
            raw: data // Enviar também os dados completos para o admin
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar textos:', error);
        res.status(500).json({ error: 'Erro ao processar textos' });
    }
});

// GET /api/texts/:key - Buscar texto específico
app.get('/api/texts/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const { data, error } = await supabase
            .from('site_texts')
            .select('*')
            .eq('key', key)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Texto não encontrado' });
            }
            console.error('❌ Erro ao buscar texto:', error);
            return res.status(500).json({ error: 'Erro ao buscar texto' });
        }
        
        res.json({ success: true, text: data });
        
    } catch (error) {
        console.error('❌ Erro ao processar texto:', error);
        res.status(500).json({ error: 'Erro ao processar texto' });
    }
});

// PUT /api/texts/:key - Atualizar texto específico
app.put('/api/texts/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        if (!value) {
            return res.status(400).json({ error: 'Valor é obrigatório' });
        }
        
        const { data, error } = await supabase
            .from('site_texts')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Erro ao atualizar texto:', error);
            return res.status(500).json({ error: 'Erro ao atualizar texto' });
        }
        
        console.log(`✅ Texto atualizado: ${key} = "${value}"`);
        res.json({ success: true, text: data });
        
    } catch (error) {
        console.error('❌ Erro ao processar atualização:', error);
        res.status(500).json({ error: 'Erro ao processar atualização' });
    }
});

// POST /api/texts/bulk - Atualização em massa
app.post('/api/texts/bulk', async (req, res) => {
    try {
        const { updates } = req.body; // Array de { key, value }
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates deve ser um array não vazio' });
        }
        
        console.log(`📝 Atualizando ${updates.length} textos em massa...`);
        
        const results = [];
        const errors = [];
        
        for (const update of updates) {
            try {
                const { data, error } = await supabase
                    .from('site_texts')
                    .update({ value: update.value, updated_at: new Date().toISOString() })
                    .eq('key', update.key)
                    .select()
                    .single();
                
                if (error) {
                    errors.push({ key: update.key, error: error.message });
                } else {
                    results.push(data);
                }
            } catch (err) {
                errors.push({ key: update.key, error: err.message });
            }
        }
        
        console.log(`✅ Atualizados: ${results.length}, ❌ Erros: ${errors.length}`);
        
        res.json({ 
            success: true, 
            updated: results.length,
            errors: errors.length,
            results,
            errorDetails: errors
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar atualização em massa:', error);
        res.status(500).json({ error: 'Erro ao processar atualização em massa' });
    }
});

// POST /api/texts/seed - Popular textos iniciais (apenas para setup)
app.post('/api/texts/seed', async (req, res) => {
    try {
        console.log('🌱 Iniciando seed de textos...');
        
        // Verificar se já existem textos
        const { count } = await supabase
            .from('site_texts')
            .select('*', { count: 'exact', head: true });
        
        if (count > 0) {
            return res.status(400).json({ 
                error: 'Textos já existem no banco. Use /api/texts/bulk para atualizar.' 
            });
        }
        
        // Executar seed (na prática, o seed SQL já foi executado)
        // Este endpoint é apenas para referência/debug
        res.json({ 
            success: true, 
            message: 'Execute o arquivo seed_site_texts.sql no Supabase SQL Editor' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar seed:', error);
        res.status(500).json({ error: 'Erro ao processar seed' });
    }
});

// DELETE /api/texts/:key - Deletar texto (restaura para default)
app.delete('/api/texts/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        // Buscar o valor padrão
        const { data: textData, error: fetchError } = await supabase
            .from('site_texts')
            .select('default_value')
            .eq('key', key)
            .single();
        
        if (fetchError) {
            return res.status(404).json({ error: 'Texto não encontrado' });
        }
        
        // Restaurar para o valor padrão
        const { data, error } = await supabase
            .from('site_texts')
            .update({ value: textData.default_value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Erro ao restaurar texto:', error);
            return res.status(500).json({ error: 'Erro ao restaurar texto' });
        }
        
        console.log(`🔄 Texto restaurado para padrão: ${key}`);
        res.json({ success: true, text: data, message: 'Texto restaurado para o valor padrão' });
        
    } catch (error) {
        console.error('❌ Erro ao processar restauração:', error);
        res.status(500).json({ error: 'Erro ao processar restauração' });
    }
});


// Endpoint de Migração
app.post('/api/migrate', async (req, res) => {
  const { startUrl } = req.body;
  if (!startUrl) return res.status(400).json({ error: 'URL é obrigatória' });

  console.log(`🚀 Recebida solicitação de migração para: ${startUrl}`);
  
  // Responde imediatamente para não bloquear o front (processamento em background)
  res.json({ message: 'Migração iniciada em background', status: 'started' });

  try {
    await runScraper(startUrl);
  } catch (error) {
    console.error("❌ Erro no processo de scraper:", error);
  }
});

// AI CLONE SITE
app.post('/api/ai/clone-site', async (req, res) => {
    const { url, organizationId } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        const layoutConfig = await cloneSite(url, organizationId);
        res.json({ success: true, layout: layoutConfig });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const BASE_URL = 'https://www.fazendasbrasil.com.br';

async function runScraper(targetUrl) {
    console.log(`🚜 Iniciando scraper em: ${targetUrl}`);
    
    // Tenta pegar múltiplas páginas (ex: 3 páginas para teste)
    // Para simplificar, vamos pegar apenas a URL passada e processar seus links
    
    try {
        const { data: pageHtml } = await axios.get(targetUrl, {
             headers: { 
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
               'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
             }
        });
        
        console.log(`📄 HTML salvo em debug_scrape.html (${pageHtml.length} bytes)`);

        const $ = cheerio.load(pageHtml);
        
        console.log(`📄 HTML carregado: ${pageHtml.length} caracteres.`);

        const propertyLinks = [];
        
        // Nova estratégia: procurar pelos IDs dos cards de propriedade
        // Ex: <div class="col-sm-6 col-md-4 col-lg-4 col-xl-4 col-xxl-3 card-deck" id="property-25">
        $('[id^="property-"]').each((i, el) => {
            const id = $(el).attr('id');
            if (id) {
                const propertyId = id.replace('property-', '');
                // Pegar o link real dentro do card
                const link = $(el).find('a[href*="/imoveis/"]').first().attr('href');
                if (link) {
                    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    console.log(`   ✅ Imóvel #${propertyId}: ${fullUrl}`);
                    if (!propertyLinks.includes(fullUrl)) propertyLinks.push(fullUrl);
                }
            }
        });

        console.log(`🔎 Encontrados ${propertyLinks.length} imóveis válidos.`);
        
        // Limitar para teste (processar apenas os primeiros 5)
        const linksToProcess = propertyLinks.slice(0, 5);
        console.log(`📦 Processando ${linksToProcess.length} imóveis (limitado para teste)...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < linksToProcess.length; i++) {
            try {
                const link = linksToProcess[i];
                console.log(`\n[${i + 1}/${linksToProcess.length}] Processando: ${link}`);
                const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                await processProperty(fullUrl);
                successCount++;
                console.log(`✅ Sucesso! Total processado: ${successCount}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Erro ao processar item ${i + 1}:`, error.message);
                console.error(`Stack:`, error.stack);
            }
            
            // Delay anti-bloqueio
            console.log(`⏳ Aguardando 2 segundos...`);
            await new Promise(r => setTimeout(r, 2000));
        }
        
        console.log(`\n🏁 Ciclo finalizado!`);
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);

    } catch (e) {
        console.error("Erro ao acessar página de listagem:", e.message);
    }
}

async function processProperty(url) {
    try {
        console.time(`Processando ${url}`);
        const { data: html } = await axios.get(url, {
             headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        // Extração Robusta
        const title = $('h1').text().trim() || $('h2').first().text().trim() || 'Sem Título';
        const bodyText = $('body').text();

        // Preço
        let price = 0;
        let priceText = $('.valor').text().trim() || $('.price').text().trim(); 
        if (!priceText) {
            // Regex fallback
            const match = bodyText.match(/R\$\s?([\d.,]+)/);
            if (match) priceText = match[1];
        }
        if (priceText) {
             price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        }

        // Location
        let city = 'Importado'; 
        let state = 'BR';
        const titleMatch = title.match(/em\s(.*?)\s-\s([A-Z]{2})/);
        if (titleMatch) {
            city = titleMatch[1].trim();
            state = titleMatch[2].trim();
        }

        // Description
        const description = $('.descricao-imovel').text().trim() || $('.description').text().trim() || $('p').text().slice(0, 300);

        // Area e Imagens
        let area = 0;
        const areaMatch = bodyText.match(/([\d.,]+)\s?(hectares|ha|alqueires)/i);
        if (areaMatch) {
           let val = parseFloat(areaMatch[1].replace('.','').replace(',','.'));
           if (areaMatch[2].toLowerCase().includes('alq')) val *= 48400; // Alqueire SP
           else val *= 10000; // Hectare
           area = val;
        }

        const images = [];
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.endsWith('.jpg') || src.endsWith('.png')) && !src.includes('logo')) {
                const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                if (images.length < 10 && !images.includes(full)) images.push(full);
            }
        });

        // Upsert no Supabase
        const propertyData = {
            title,
            description,
            price: price || 0,
            type: 'Fazenda',
            status: 'Disponível',
            city,
            state, 
            features: { area, bedrooms: 0, bathrooms: 0 },
            images,
            highlighted: true,
            created_at: new Date().toISOString()
        };
        
        console.log(`   💾 Tentando salvar: ${title}`);
        console.log(`   📊 Dados:`, JSON.stringify(propertyData, null, 2));
        
        const { data, error } = await supabase.from('properties').upsert(propertyData, { onConflict: 'title' });

        if (error) {
            console.error(`   ❌ Falha DB: ${title}`);
            console.error(`   ❌ Erro completo:`, JSON.stringify(error, null, 2));
        } else {
            console.log(`   ✅ Migrado com sucesso: ${title}`);
        }
        
        console.timeEnd(`Processando ${url}`);

    } catch (e) {
        console.error(`   ⚠️ Erro ao ler imóvel ${url}:`, e.message);
    }
}

// Health Check
app.get('/', (req, res) => {
  res.send('Servidor de Migração Online 🚀');
});

// --- SECURE IMPERSONATION ROUTES ---
import { startImpersonation, exchangeImpersonationToken } from './api/support/impersonate.js';

app.post('/api/support/impersonate', startImpersonation);
app.post('/api/support/exchange', exchangeImpersonationToken);

// --- EVOLUTION API ROUTES ---
app.post('/api/evolution/webhook', evolutionWebhookHandler);
app.get('/api/evolution/chats', getChats);
app.get('/api/evolution/messages/:remoteJid', getMessages);
app.post('/api/evolution/messages/send', sendMessage);

// Evolution Instances
app.get('/api/evolution/instances', getInstances);
app.post('/api/evolution/instances', createInstance);
app.delete('/api/evolution/instances/:id', deleteInstance);
app.get('/api/evolution/instances/:instanceName/connect', connectInstance);
app.post('/api/evolution/instances/:instanceName/logout', logoutInstance);
// --- ONBOARDING & DOMAIN AUTOMATION ---
import { provisionTenantDomain } from './domainService.js';

app.post('/api/onboarding', async (req, res) => {
    const {
        // User
        email, password, name,
        // Organization
        agencyName, creci, phone, whatsapp,
        // Branding
        primaryColor, secondaryColor, logoUrl,
        // Profile
        profileType, // 'rural', 'traditional', 'hybrid'
        themeId,
        // Plan
        plan, // 'free', 'basic', 'pro', 'enterprise'
        region,
    } = req.body;

    if (!email || !password || !agencyName) {
        return res.status(400).json({ error: 'Email, senha e nome da imobiliária são obrigatórios' });
    }

    try {
        console.log(`🚀 Onboarding: Iniciando criação para ${agencyName} (${email})`);

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, agencyName },
        });

        if (authError) {
            console.error('❌ Auth error:', authError.message);
            return res.status(400).json({ error: authError.message });
        }

        const userId = authData.user.id;
        console.log(`✅ Usuário criado: ${userId}`);

        // 2. Create organization
        const slug = agencyName
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: agencyName,
                slug,
                subdomain: slug,
                primary_color: primaryColor || '#064e3b',
                secondary_color: secondaryColor || '#d4af37',
                logo_url: logoUrl || null,
                plan: plan || 'free',
                niche: profileType || 'traditional',
                status: 'active',
            })
            .select()
            .single();

        if (orgError) {
            console.error('❌ Org error:', orgError.message);
            return res.status(400).json({ error: `Erro ao criar organização: ${orgError.message}` });
        }

        console.log(`✅ Organização criada: ${orgData.id} (${slug})`);

        // 3. Update user profile with org link (Upsert to guarantee existance)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                organization_id: orgData.id,
                role: 'admin',
                name: name || agencyName,
                email: email,
                phone: phone || whatsapp,
                creci: creci || null,
            });

        if (profileError) {
            console.warn('⚠️ Profile update warning:', profileError.message);
        }

        // 4. Provision subdomain (WHM/cPanel + Vercel) — async, don't block
        let domainResult = null;
        try {
            domainResult = await provisionTenantDomain(slug);
            console.log(`🌐 Domain provisioning result:`, domainResult);

            // Save domain info to database
            if (domainResult.success) {
                await supabase.from('domains').insert({
                    organization_id: orgData.id,
                    domain: domainResult.fullDomain,
                    is_primary: true,
                    status: 'active',
                });
            }
        } catch (domainError) {
            console.warn('⚠️ Domain provisioning failed (non-blocking):', domainError.message);
        }

        // 5. Return success
        const mainDomain = process.env.WHM_MAIN_DOMAIN || 'imobzy.com.br';
        res.json({
            success: true,
            user: { id: userId, email },
            organization: { id: orgData.id, slug, name: agencyName },
            domain: {
                subdomain: slug,
                fullDomain: `${slug}.${mainDomain}`,
                provisioned: domainResult?.success || false,
                whm: domainResult?.whm || null,
                vercel: domainResult?.vercel || null,
            },
            panelUrl: `${process.env.VITE_PANEL_URL || 'http://localhost:3005'}/login`,
        });

    } catch (error) {
        console.error('❌ Onboarding fatal error:', error);
        res.status(500).json({ error: 'Erro interno ao processar onboarding.' });
    }
});

const PORT = process.env.PORT || 3002;

// Only start the server if not running in a serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🔌 Servidor de Migração rodando na porta ${PORT}`);
    });
}

// Export for Vercel Serverless Function
export default app;
