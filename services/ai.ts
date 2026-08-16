import { logger } from '@/utils/logger';
import { Property } from '../types';
import {
  LandingPage,
  BlockType,
  BlockConfig,
  LandingPageTheme,
  Block,
} from '../types/landingPage';
import { v4 as uuidv4 } from 'uuid';
import { geminiService } from './geminiService';
import { openaiService } from './openaiService';
import { groqService } from './groqService';

export interface AIConfig {
  provider?: 'openai' | 'gemini' | 'groq';
  openaiKey?: string;
  geminiKey?: string;
  groqKey?: string;
}

export const generateLandingPageFromProperty = async (
  property: Property,
  config?: AIConfig
): Promise<Partial<LandingPage>> => {
  // Construct enhanced prompt with copywriting expertise
  const propertyImages =
    property.images && property.images.length > 0 ? property.images : [];

  const prompt = `
Você é um ESPECIALISTA em copywriting imobiliário e marketing de alto padrão, focado exclusivamente no mercado RURAL brasileiro.
Sua missão: criar uma landing page IRRESISTÍVEL para vender este imóvel rural.

=== DADOS DO IMÓVEL ===
Título: ${property.title}
Tipo: ${property.type}
Preço: R$ ${property.price.toLocaleString('pt-BR')}
Localização: ${property.location.city} - ${property.location.state}
Endereço: ${property.location.address || property.location.neighborhood}

--- CARACTERÍSTICAS TÉCNICAS ---
Área Total: ${property.features.areaHectares} hectares
Astudão Principal: ${property.aptitude?.join(', ') || 'Rural'}
Topografia: ${property.features.topography || 'Não informada'}
Textura do Solo: ${property.features.soilTexture || 'Não informada'}
Altitude: ${property.features.altitude ? property.features.altitude + 'm' : 'Não informada'}

--- INFRAESTRUTURA E BENFEITORIAS ---
Sede: ${property.features.infra?.casaSede ? 'Sim' : 'Não'}
Casas Func.: ${property.features.infra?.casasFuncionarios || 0}
Galpões: ${property.features.infra?.galpaes || 0}
Piquetes: ${property.features.infra?.piquetes || 0}
Outros: ${
    [
      property.features.infra?.curral ? 'Curral' : '',
      property.features.infra?.brete ? 'Brete' : '',
      property.features.infra?.balanca ? 'Balança' : '',
      property.features.infra?.energiaSolar ? 'Energia Solar' : '',
      property.features.infra?.irrigacao ? 'Sistema de Irrigação' : '',
      property.features.infra?.pivotCentral ? 'Pivot Central' : '',
    ]
      .filter(Boolean)
      .join(', ') || 'Básico'
  }

--- RECURSOS HÍDRICOS ---
Fontes: ${
    [
      property.features.water?.rio ? 'Rio' : '',
      property.features.water?.corrego ? 'Córrego' : '',
      property.features.water?.nascente ? 'Nascente' : '',
      property.features.water?.represa ? 'Represa' : '',
      property.features.infra?.pocoArtesiano ? 'Poço Artesiano' : '',
    ]
      .filter(Boolean)
      .join(', ') || 'Não detalhadas'
  }

--- DOCUMENTAÇÃO ---
Regularização: ${
    [
      property.features.legal?.car ? 'CAR' : '',
      property.features.legal?.ccir ? 'CCIR' : '',
      property.features.legal?.geo ? 'GEO' : '',
      property.features.legal?.itr ? 'ITR' : '',
      property.features.legal?.escritura ? 'Escritura' : '',
    ]
      .filter(Boolean)
      .join(', ') || 'Consulte'
  }
Reserva Legal: ${property.features.legal?.reservaLegal || 0}%
APP: ${property.features.legal?.app || 0}%

Descrição Original: 
${property.description}

Imagens Disponíveis: ${propertyImages.length} fotos profissionais

=== SUA TAREFA ===
Gerar um JSON com blocos de landing page que VENDEM.

REGRAS DE OURO DO COPYWRITING:
1. BENEFÍCIOS > Características (ex: "Água em abundância o ano todo" em vez de "Rio e Nascente")
2. EMOÇÃO > Razão (criar desejo de investimento e qualidade de vida)
3. ESPECÍFICO > Genérico (use os dados de solo, altitude e infraestrutura para dar autoridade)
4. AÇÃO > Passividade (verbos fortes: descubra, garanta, conquiste)
5. URGÊNCIA e EXCLUSIVIDADE (focar no potencial de valorização e produtividade)

ESTRUTURA OBRIGATÓRIA (RETORNE APENAS O JSON):

{
  "name": "Nome curto para a página",
  "title": "Título SEO persuasivo",
  "description": "Meta description de 150-160 caracteres",
  "themeConfig": {
    "primaryColor": "#2d5016",
    "secondaryColor": "#8b4513", 
    "fontFamily": "Montserrat"
  },
  "blocks": [
    {
      "type": "hero",
      "config": {
        "title": "Título EMOCIONAL",
        "subtitle": "Benefício principal com área e local",
        "backgroundImage": "${propertyImages[0] || ''}",
        "overlayOpacity": 0.4,
        "ctaText": "Saiba Mais",
        "ctaLink": "#contato"
      }
    },
    {
      "type": "stats",
      "config": {
        "stats": [
          {"value": "${property.features.areaHectares} ha", "label": "Área Total", "icon": "🌿"},
          {"value": "${property.features.soilTexture || 'Misto'}", "label": "Qualidade do Solo", "icon": "🚜"},
          {"value": "${property.features.topography || 'Plana'}", "label": "Topografia", "icon": "📐"}
        ]
      }
    },
    {
      "type": "text",
      "config": {
        "content": "<p>Venda o potencial produtivo e a qualidade de vida aqui...</p>"
      }
    },
    {
      "type": "features",
      "config": {
        "features": [
           // Liste 6 diferenciais transformados em benefícios
        ]
      }
    }
  ]
}

RETORNE APENAS O JSON. SEM MARKDOWN. SEM EXPLICAÇÕES.
`;

  try {
    let text = '{}';

    // Choose Provider with fallback
    if (config?.openaiKey) {
      logger.info('🤖 Using OpenAI for landing page generation...');
      text = await openaiService.generateText(prompt, config.openaiKey);
    } else if (config?.geminiKey) {
      logger.info('🤖 Using Gemini (Config) for landing page generation...');
      text = await geminiService.generateText(prompt); // geminiService handles its own key currently, but we could refactor
    } else if (config?.groqKey) {
      logger.info('🤖 Using Groq for landing page generation...');
      text = await groqService.generateText(prompt, config.groqKey);
    } else {
      // Default to env key if available (Gemini)
      logger.info(
        '🤖 Using Default Gemini (Env) for landing page generation...'
      );
      text = await geminiService.generateText(prompt);
    }

    // Clean JSON string if returned with ```json
    const cleanJson = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleanJson);

    // Post-process to ensure IDs and types match our system
    let blocks: Block[] = (parsed.blocks || []).map(
      (b: any, index: number) => ({
        id: uuidv4(),
        type: b.type as BlockType,
        order: index,
        visible: true,
        config: b.config,
        styles: { padding: '40px 20px' },
        responsive: {},
      })
    );

    // FORCE property images into blocks (post-processing override)
    if (propertyImages.length > 0) {
      // 1. Find hero block and inject first image
      const heroBlock = blocks.find((b) => b.type === BlockType.HERO);
      if (heroBlock && heroBlock.config) {
        (heroBlock.config as any).backgroundImage = propertyImages[0];
      }

      // 2. Find or create PROPERTY_CAROUSEL block if 2+ images
      if (propertyImages.length >= 2) {
        let carouselBlock = blocks.find(
          (b) => b.type === BlockType.PROPERTY_CAROUSEL
        );

        // Convert image URLs to carousel format
        const carouselImages = propertyImages.map((url, idx) => ({
          src: url,
          alt: `${property.title} - Vista ${idx + 1}`,
          caption: `Explore cada detalhe desta propriedade`,
        }));

        if (!carouselBlock) {
          // Create new carousel block
          carouselBlock = {
            id: uuidv4(),
            type: BlockType.PROPERTY_CAROUSEL,
            order: blocks.length,
            visible: true,
            config: {
              images: carouselImages,
              autoplay: false,
              autoplayDelay: 4000,
              showThumbnails: true,
              showDots: true,
            } as any,
            styles: { padding: '40px 20px' },
            responsive: {},
          };
          blocks.push(carouselBlock);
        } else {
          // Update existing carousel
          carouselBlock.config = {
            ...carouselBlock.config,
            images: carouselImages,
            autoplay: false,
            autoplayDelay: 4000,
            showThumbnails: true,
            showDots: true,
          } as any;
        }
      }

      // 3. Find image blocks and populate them
      blocks.forEach((block, index) => {
        if (block.type === BlockType.IMAGE && propertyImages[index + 1]) {
          block.config = {
            ...block.config,
            src: propertyImages[index + 1] || propertyImages[0],
            alt: property.title,
          } as any;
        }
      });
    }

    return {
      name: parsed.name || property.title,
      title: parsed.title || property.title,
      description: parsed.description || property.description,
      themeConfig: {
        ...parsed.themeConfig,
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderRadius: '0.5rem',
        spacing: {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
        },
        fontSize: {
          base: '1rem',
          heading1: '2.5rem',
          heading2: '2rem',
          heading3: '1.75rem',
        },
      } as LandingPageTheme,
      blocks: blocks,
    };
  } catch (error) {
    logger.error('Error generating landing page:', error);
    throw new Error(
      'Failed to generate landing page content: ' + (error as any).message
    );
  }
};
