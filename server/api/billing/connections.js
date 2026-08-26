import { Router } from 'express';
import { verifyAuth, verifyMegaAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { AsgardPayService } from '../../../services/asgardpayService.js';
import logger from '../../utils/logger.js';

const router = Router();

// ============================================
// Pool de Conexões (Mega Admin)
// O pool é a capacidade total que o mega admin distribui.
// Não há compra do Meta — o mega admin apenas define quantas
// conexões estão disponíveis para alocar entre revendas.
// ============================================

router.get('/pool', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: pool } = await supabase
      .from('connection_pool')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { count: totalAllocated } = await supabase
      .from('connection_allocations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('allocation_type', 'reseller_pool');

    const totalCapacity = pool?.total_purchased || 0;
    const available = totalCapacity - (totalAllocated || 0);

    res.json({
      totalCapacity,
      totalAllocated: totalAllocated || 0,
      available: Math.max(0, available),
    });
  } catch (error) {
    logger.error('Erro ao buscar pool de conexões:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pool/set', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const { totalCapacity, notes } = req.body;
    if (totalCapacity === undefined || totalCapacity < 0) {
      return res.status(400).json({ error: 'totalCapacity deve ser >= 0' });
    }

    const supabase = getSupabaseServer();

    const { data: existing } = await supabase
      .from('connection_pool')
      .select('*')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('connection_pool')
        .update({
          total_purchased: totalCapacity,
          notes: notes || existing.notes,
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('connection_pool')
        .insert({
          total_purchased: totalCapacity,
          notes,
        });
      if (error) throw error;
    }

    res.json({ success: true, totalCapacity });
  } catch (error) {
    logger.error('Erro ao definir pool de conexões:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Alocação Mega Admin → Reseller
// O mega admin libera X conexões para uma revenda.
// Gera cobrança via AsgardPay (mega admin cobra da revenda).
// ============================================

router.get('/allocations/:orgId', verifyAuth, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const orgId = req.params.orgId;

    const { data: asSeller } = await supabase
      .from('connection_allocations')
      .select(`
        *,
        to_org:organizations!connection_allocations_to_org_id_fkey(id, name, slug),
        instance:whatsapp_instances(id, name, phone, status)
      `)
      .eq('from_org_id', orgId)
      .order('created_at', { ascending: false });

    const { data: asBuyer } = await supabase
      .from('connection_allocations')
      .select(`
        *,
        from_org:organizations!connection_allocations_from_org_id_fkey(id, name, slug),
        instance:whatsapp_instances(id, name, phone, status)
      `)
      .eq('to_org_id', orgId)
      .order('created_at', { ascending: false });

    const { data: org } = await supabase
      .from('organizations')
      .select('connection_credits, connection_price_per_unit')
      .eq('id', orgId)
      .single();

    res.json({
      asSeller: asSeller || [],
      asBuyer: asBuyer || [],
      credits: org?.connection_credits || 0,
      pricePerUnit: org?.connection_price_per_unit || 0,
    });
  } catch (error) {
    logger.error('Erro ao buscar alocações:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/allocate', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const { toOrgId, quantity, pricePerConnection, expiresAt } = req.body;
    if (!toOrgId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'toOrgId e quantity obrigatórios' });
    }

    const supabase = getSupabaseServer();
    const fromOrgId = req.orgId;

    // Verificar pool disponível
    const { count: alreadyAllocated } = await supabase
      .from('connection_allocations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('allocation_type', 'reseller_pool');

    const { data: pool } = await supabase
      .from('connection_pool')
      .select('total_purchased')
      .limit(1)
      .single();

    const totalCapacity = pool?.total_purchased || 0;
    const poolAvailable = totalCapacity - (alreadyAllocated || 0);

    if (quantity > poolAvailable) {
      return res.status(400).json({
        error: `Pool insuficiente. Disponível: ${poolAvailable}, solicitado: ${quantity}`,
      });
    }

    // Criar billing (mega admin cobra da revenda)
    const billingPeriod = new Date().toISOString().slice(0, 7);
    const totalAmount = quantity * (pricePerConnection || 0);

    const { data: billing, error: billingError } = await supabase
      .from('connection_billing')
      .insert({
        seller_org_id: fromOrgId,
        buyer_org_id: toOrgId,
        connections_count: quantity,
        price_per_connection: pricePerConnection || 0,
        total_amount: totalAmount,
        billing_period: billingPeriod,
        status: 'pending',
      })
      .select()
      .single();

    if (billingError) throw billingError;

    // Criar alocações (uma por conexão)
    const allocations = [];
    for (let i = 0; i < quantity; i++) {
      const { data: alloc, error: allocError } = await supabase
        .from('connection_allocations')
        .insert({
          from_org_id: fromOrgId,
          to_org_id: toOrgId,
          allocation_type: 'reseller_pool',
          status: 'pending',
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (allocError) throw allocError;
      allocations.push(alloc);
    }

    // Atualizar créditos da revenda
    await supabase
      .from('organizations')
      .update({
        connection_credits: (await getOrgCredits(toOrgId)) + quantity,
        connection_price_per_unit: pricePerConnection || 0,
      })
      .eq('id', toOrgId);

    // Gerar cobrança AsgardPay (mega admin cobra da revenda)
    let paymentUrl = null;
    if (totalAmount > 0) {
      try {
        const { data: buyerOrg } = await supabase
          .from('organizations')
          .select('asgardpay_public_key, asgardpay_secret_key, owner_email, owner_name, name')
          .eq('id', toOrgId)
          .single();

        const { data: globalSettings } = await supabase
          .from('saas_settings')
          .select('asgardpay_public_key, asgardpay_secret_key')
          .single();

        const asgardKeys = (buyerOrg?.asgardpay_public_key && buyerOrg?.asgardpay_secret_key)
          ? { publicKey: buyerOrg.asgardpay_public_key, secretKey: buyerOrg.asgardpay_secret_key }
          : (globalSettings?.asgardpay_public_key && globalSettings?.asgardpay_secret_key)
            ? { publicKey: globalSettings.asgardpay_public_key, secretKey: globalSettings.asgardpay_secret_key }
            : null;

        if (asgardKeys) {
          const asgardpay = new AsgardPayService(asgardKeys);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);

          const payment = await asgardpay.createPayment({
            clientId: toOrgId,
            clientEmail: buyerOrg?.owner_email || 'admin@imobzy.com',
            clientName: buyerOrg?.owner_name || buyerOrg?.name || 'Revenda',
            amount: totalAmount,
            description: `${quantity} conexões WhatsApp - ${billingPeriod}`,
            dueDate: dueDate.toISOString().split('T')[0],
            type: 'pix',
          });

          await supabase
            .from('connection_billing')
            .update({
              asgardpay_invoice_id: payment.id,
              asgardpay_payment_url: payment.invoiceUrl,
            })
            .eq('id', billing.id);

          paymentUrl = payment.invoiceUrl;
        }
      } catch (payError) {
        logger.warn('Erro ao criar cobrança AsgardPay (billing criado sem gateway):', payError);
      }
    }

    res.json({
      success: true,
      billing,
      allocationsCount: allocations.length,
      paymentUrl,
    });
  } catch (error) {
    logger.error('Erro ao alocar conexões:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Alocação Reseller → Tenant
// O reseller libera 1 conexão para um cliente.
// O cliente cadastra suas próprias credenciais Meta.
// Não há billing neste nível (combinado offline).
// ============================================

router.post('/allocate/tenant', verifyAuth, async (req, res) => {
  try {
    const userRole = req.userRole;
    if (userRole !== 'superadmin' && userRole !== 'megaadmin') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const { toTenantId, instanceId } = req.body;
    if (!toTenantId) {
      return res.status(400).json({ error: 'toTenantId obrigatório' });
    }

    const supabase = getSupabaseServer();
    const resellerOrgId = req.orgId;

    // Verificar créditos disponíveis da revenda
    const resellerCredits = await getOrgCredits(resellerOrgId);
    if (resellerCredits <= 0) {
      return res.status(400).json({ error: 'Sem conexões disponíveis na sua revenda' });
    }

    // Verificar se tenant já possui conexão ativa
    const { data: existingAllocation } = await supabase
      .from('connection_allocations')
      .select('id')
      .eq('to_org_id', toTenantId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existingAllocation) {
      return res.status(400).json({ error: 'Tenant já possui conexão ativa' });
    }

    // Criar alocação
    const { data: allocation, error } = await supabase
      .from('connection_allocations')
      .insert({
        from_org_id: resellerOrgId,
        to_org_id: toTenantId,
        instance_id: instanceId || null,
        allocation_type: 'tenant_active',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Decrementar créditos da revenda
    await supabase
      .from('organizations')
      .update({
        connection_credits: Math.max(0, resellerCredits - 1),
      })
      .eq('id', resellerOrgId);

    res.json({ success: true, allocation });
  } catch (error) {
    logger.error('Erro ao alocar conexão para tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/revoke/:allocationId', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data: alloc } = await supabase
      .from('connection_allocations')
      .select('to_org_id, allocation_type')
      .eq('id', req.params.allocationId)
      .single();

    if (!alloc) {
      return res.status(404).json({ error: 'Alocação não encontrada' });
    }

    const { error } = await supabase
      .from('connection_allocations')
      .update({ status: 'revoked' })
      .eq('id', req.params.allocationId);

    if (error) throw error;

    // Se era reseller_pool, devolver crédito ao pool
    // Se era tenant_active, devolver crédito ao reseller
    if (alloc.allocation_type === 'tenant_active') {
      await supabase
        .from('organizations')
        .update({
          connection_credits: Math.max(0, (await getOrgCredits(alloc.to_org_id)) - 1),
        })
        .eq('id', alloc.to_org_id);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao revogar alocação:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Billing (Mega Admin)
// ============================================

router.get('/billing', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('connection_billing')
      .select(`
        *,
        seller:organizations!connection_billing_seller_org_id_fkey(id, name, slug),
        buyer:organizations!connection_billing_buyer_org_id_fkey(id, name, slug)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    logger.error('Erro ao buscar billing:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/billing/:id/pay', verifyAuth, verifyMegaAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('connection_billing')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: req.body.paymentMethod || 'manual',
      })
      .eq('id', req.params.id);

    if (error) throw error;

    const { data: billing } = await supabase
      .from('connection_billing')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (billing) {
      await supabase
        .from('connection_allocations')
        .update({ status: 'active' })
        .eq('from_org_id', billing.seller_org_id)
        .eq('to_org_id', billing.buyer_org_id)
        .eq('status', 'pending');
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao marcar como pago:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/credits/:orgId', verifyAuth, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data: org } = await supabase
      .from('organizations')
      .select('connection_credits, connection_price_per_unit')
      .eq('id', req.params.orgId)
      .single();

    res.json({
      credits: org?.connection_credits || 0,
      pricePerUnit: org?.connection_price_per_unit || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getOrgCredits(orgId) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('organizations')
    .select('connection_credits')
    .eq('id', orgId)
    .single();
  return data?.connection_credits || 0;
}

export default router;
