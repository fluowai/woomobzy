import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();

// Função auxiliar para escapar caracteres especiais do XML
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ----------------------------------------------------------------------
// GET /api/public/zap/feed/:domain.xml
// Carga de Anúncios no padrão vrsync (XML)
// ----------------------------------------------------------------------
router.get('/feed/:domain.xml', async (req, res) => {
  try {
    const { domain } = req.params;
    const supabase = getSupabaseServer();

    // 1. Identificar o organization_id pelo domínio
    // Busca na tabela domains (ou organizations.custom_domain)
    let organizationId = null;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .ilike('custom_domain', domain)
      .maybeSingle();

    if (orgData) {
      organizationId = orgData.id;
    } else {
      const { data: domainData } = await supabase
        .from('domains')
        .select('organization_id')
        .ilike('domain', domain)
        .maybeSingle();
      if (domainData) {
        organizationId = domainData.organization_id;
      }
    }

    if (!organizationId) {
      return res.status(404).send('<Erro>Organização não encontrada para o domínio informado.</Erro>');
    }

    // 2. Buscar imóveis disponíveis
    // OBS: Ajustar status de acordo com o padrão de disponibilidade do banco
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['Disponível', 'Publicado']) // Depende do domínio de valores do banco
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Zap XML] Erro ao buscar imóveis:', error.message);
      return res.status(500).send('<Erro>Erro ao buscar imóveis.</Erro>');
    }

    // 3. Montar o XML via String Template
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<Carga xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n`;
    xml += `  <Imoveis>\n`;

    for (const prop of properties || []) {
      const features = prop.features || {};
      const ownerInfo = prop.owner_info || {};
      const images = prop.images || [];

      // Mapeamento de Transação
      let transaction = 'Venda'; // Padrão
      if (prop.purpose === 'Aluguel' || prop.purpose === 'Locação') {
        transaction = 'Locação';
      }

      // Mapeamento de Tipo
      const typeMap = {
        Apartamento: 'Apartamento',
        Casa: 'Casa',
        Sobrado: 'Casa',
        Terreno: 'Lote/Terreno',
        Comercial: 'Loja/Salão',
        Fazenda: 'Fazenda/Sítio/Chácara',
        Sitio: 'Fazenda/Sítio/Chácara',
      };
      const propertyType = typeMap[prop.property_type] || 'Outros';

      xml += `    <Imovel>\n`;
      xml += `      <CodigoImovel>${escapeXml(prop.id)}</CodigoImovel>\n`;
      xml += `      <TipoImovel>${escapeXml(propertyType)}</TipoImovel>\n`;
      xml += `      <SubTipoImovel>${escapeXml(prop.property_type)}</SubTipoImovel>\n`;
      xml += `      <CategoriaImovel>Padrão</CategoriaImovel>\n`;
      
      // Localização
      xml += `      <Bairro>${escapeXml(prop.neighborhood || features.bairro)}</Bairro>\n`;
      xml += `      <Cidade>${escapeXml(prop.city || features.cidade)}</Cidade>\n`;
      xml += `      <Estado>${escapeXml(prop.state || features.estado)}</Estado>\n`;
      xml += `      <CEP>${escapeXml(features.cep)}</CEP>\n`;
      
      // Valores
      xml += `      <PrecoVenda>${transaction === 'Venda' ? (prop.price || 0) : 0}</PrecoVenda>\n`;
      xml += `      <PrecoLocacao>${transaction === 'Locação' ? (prop.price || 0) : 0}</PrecoLocacao>\n`;
      xml += `      <ValorCondominio>${features.condominio || 0}</ValorCondominio>\n`;
      xml += `      <ValorIPTU>${features.iptu || 0}</ValorIPTU>\n`;

      // Características
      xml += `      <AreaUtil>${features.areaM2 || features.areaConstruida || prop.useful_area_ha || 0}</AreaUtil>\n`;
      xml += `      <AreaTotal>${features.areaTotal || prop.total_area_ha || 0}</AreaTotal>\n`;
      xml += `      <QtdDormitorios>${features.dormitorios || 0}</QtdDormitorios>\n`;
      xml += `      <QtdSuites>${features.suites || 0}</QtdSuites>\n`;
      xml += `      <QtdBanheiros>${features.banheiros || 0}</QtdBanheiros>\n`;
      xml += `      <QtdVagas>${features.vagas || 0}</QtdVagas>\n`;

      xml += `      <Observacao><![CDATA[${prop.description || prop.title || ''}]]></Observacao>\n`;
      
      // Título do Anúncio
      xml += `      <TituloImovel><![CDATA[${prop.title || ''}]]></TituloImovel>\n`;

      // Fotos
      if (images.length > 0) {
        xml += `      <Fotos>\n`;
        images.forEach((imgUrl, idx) => {
          // O Zap usa Principal para a primeira foto
          const principal = idx === 0 ? '1' : '0';
          xml += `        <Foto>\n`;
          xml += `          <Principal>${principal}</Principal>\n`;
          xml += `          <URLArquivo>${escapeXml(imgUrl)}</URLArquivo>\n`;
          xml += `        </Foto>\n`;
        });
        xml += `      </Fotos>\n`;
      }

      xml += `    </Imovel>\n`;
    }

    xml += `  </Imoveis>\n`;
    xml += `</Carga>\n`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('[Zap XML] Erro inesperado:', error.message);
    res.status(500).send('<Erro>Erro interno no servidor</Erro>');
  }
});

// ----------------------------------------------------------------------
// POST /api/public/zap/leads
// Webhook para receber leads do portal ZAP/VivaReal
// ----------------------------------------------------------------------
router.post('/leads', async (req, res) => {
  try {
    const payload = req.body;
    
    // O Zap envia os dados num formato específico. 
    // Ex: { leadOrigin: "Zap", clientListingId: "ID_DO_IMOVEL", name: "Fulano", email: "...", ddd: "11", phone: "999999999", message: "..." }
    const { 
      name, 
      email, 
      ddd,
      phone, 
      message, 
      clientListingId, 
      leadOrigin,
      organizationId // Pode vir customizado no header ou querystring dependendo da configuração do webhook
    } = payload;

    // Se o organizationId não vier no payload, ele precisa vir pela querystring (Ex: /leads?org_id=UUID)
    const orgId = organizationId || req.query.org_id;

    if (!orgId) {
      return res.status(400).json({ error: 'organizationId ou org_id não fornecido' });
    }

    // Formata telefone
    const fullPhone = ddd && phone ? `${ddd}${phone}` : (phone || '');

    const supabase = getSupabaseServer();

    // Busca um SDR (Admin) disponível na organização para pré-qualificar o lead.
    // NÃO atribuímos ao corretor (broker) nesta etapa para não inflar o Kanban de vendas.
    const { data: sdrs } = await supabase
      .from('users')
      .select('id, role')
      .eq('organization_id', orgId)
      .in('role', ['admin', 'superadmin']) // Apenas perfis administrativos/SDR
      .limit(1);

    const assignedAgentId = sdrs && sdrs.length > 0 ? sdrs[0].id : null;

    // Insere o Lead na tabela
    // O usuário requisitou que o status seja para qualificação do SDR, 
    // então usaremos status: 'NEW' (Novo) e deixaremos a automação 'send-welcome' desabilitada para esse lead.
    const leadData = {
      organization_id: orgId,
      name: name || 'Lead Portal ZAP',
      email: email || null,
      phone: fullPhone,
      source: 'PORTAL',
      notes: message ? `Mensagem do Portal: ${message}\nOrigem: ${leadOrigin || 'ZAP'}` : `Origem: ${leadOrigin || 'ZAP'}`,
      property_id: clientListingId || null,
      status: 'NEW', // Para que o SDR qualifique manualmente
      assigned_to: assignedAgentId, // Vincula ao agente encontrado
    };

    const { error } = await supabase
      .from('leads')
      .insert([leadData]);

    if (error) {
      console.error('[Zap Webhook] Erro ao inserir lead:', error.message);
      return res.status(500).json({ error: 'Erro ao processar o lead no banco de dados' });
    }

    // Retorna 200 OK para o Zap parar de enviar tentativas
    res.status(200).json({ success: true, message: 'Lead recebido com sucesso' });

  } catch (error) {
    console.error('[Zap Webhook] Erro inesperado:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
