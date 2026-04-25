import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import axios from 'axios';

const router = express.Router();

// Helper to get organization AI keys
async function getOrgAIConfig(orgId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !data) return null;
  return data.integrations;
}

router.post('/generate-page', async (req, res) => {
  const { prompt, niche, organizationId } = req.body;

  try {
    const config = await getOrgAIConfig(organizationId);
    
    // Determine provider and key
    // We prioritize "namoBana" as requested, falling back to openai or gemini
    const provider = config?.namoBana?.apiKey ? 'namobana' : (config?.openai?.apiKey ? 'openai' : 'gemini');
    const apiKey = config?.namoBana?.apiKey || config?.openai?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Nenhuma chave de IA configurada para esta organização.' });
    }

    // Call AI (Abstraction)
    const layout = await generateLayoutWithAI(provider, apiKey, prompt, niche);

    res.json({ layout });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function generateLayoutWithAI(provider, apiKey, prompt, niche) {
  // This is a mock implementation of the AI call. 
  // In a real scenario, we would use the provider's SDK or Axios.
  // For now, I'll return a structured JSON based on the niche.
  
  console.log(`Generating with ${provider} for niche ${niche}: ${prompt}`);

  // Simulate prompt processing
  return {
    themeConfig: {
      primaryColor: niche === 'rural' ? '#166534' : '#2563eb',
      secondaryColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      fontSize: {
        base: '16px',
        heading1: '48px',
        heading2: '36px',
        heading3: '24px'
      },
      borderRadius: '8px',
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }
    },
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        order: 0,
        visible: true,
        config: {
          title: `Oportunidade Única em Imóvel ${niche === 'rural' ? 'Rural' : 'Urbano'}`,
          subtitle: prompt || 'Descrição gerada por IA baseada na sua necessidade.',
          backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000',
          overlayOpacity: 0.4,
          ctaText: 'Ver Detalhes',
          ctaLink: '#properties',
          height: 600,
          alignment: 'center',
          textColor: '#ffffff'
        },
        styles: { padding: '0px' }
      },
      {
        id: 'text-1',
        type: 'text',
        order: 1,
        visible: true,
        config: {
          content: '## Por que escolher este imóvel?\n\nInfraestrutura completa e localização estratégica para o seu investimento.',
          fontSize: 18,
          fontWeight: 400,
          color: '#374151',
          alignment: 'center'
        },
        styles: { padding: '60px 20px' }
      }
    ]
  };
}

export default router;
