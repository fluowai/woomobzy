
import { supabase } from './supabase';
import { Lead } from '../types';

export const leadService = {
  // Create a new lead
  async create(lead: Partial<Lead>) {
    // Basic validation
    if (!lead.name || !lead.phone) {
      throw new Error('Nome e Telefone são obrigatórios');
    }

    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        property_id: lead.propertyId, // Map propertyId to property_id (snake_case)
        status: 'Novo',
        source: lead.source || 'Site'
      })
      .select()
      .single();

    if (error) throw error;
    
    // --- TRIGGER WHATSAPP AUTOMATION (Async / Fire & Forget) ---
    (async () => {
      try {
        // Buscar configurações da Evolution API
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('integrations')
          .single();

        if (!settingsData?.integrations?.evolutionApi?.enabled) {
          console.log('⚠️ WhatsApp desativado nas configurações');
          return;
        }

        const config = settingsData.integrations.evolutionApi;
        
        // Formatar telefone
        const cleanPhone = lead.phone!.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // Mensagem
        const propertyTitle = lead.property?.title || 'um de nossos imóveis';
        const message = `Olá, ${lead.name}! 👋\n\nRecebemos seu interesse em *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

        // Enviar via Evolution API
        const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;
        
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'apikey': config.token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message
          })
        });

        console.log(`✅ WhatsApp enviado para ${lead.name}`);
      } catch (err) {
        console.error('❌ Erro ao enviar WhatsApp:', err);
      }
    })();

    return mapToModel(data);
  },

  // List leads for Kanban (Single Tenant)
  async list() {
    let query = supabase
      .from('crm_leads')
      .select(`
        *,
        properties (
          title,
          price,
          images
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapToModel);
  },



  // Update lead status (drag and drop)
  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('crm_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  }
};

const mapToModel = (dbItem: any): Lead => ({
  id: dbItem.id,
  name: dbItem.name,
  email: dbItem.email,
  phone: dbItem.phone,
  source: dbItem.source,
  status: dbItem.status,
  budget: 0, // Not captured yet
  preferences: {},
  createdAt: dbItem.created_at,
  propertyId: dbItem.property_id,
  property: dbItem.properties ? {
    title: dbItem.properties.title,
    price: dbItem.properties.price,
    image: dbItem.properties.images?.[0]
  } : undefined
});
