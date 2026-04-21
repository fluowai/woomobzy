import { z } from 'zod';

export const propertySchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  property_type: z.enum([
    'FAZENDA',
    'SITIO',
    'CHACARA',
    'HARAS',
    'AREA_AGRICOLA',
    'AREA_PECUARIA',
    'REFLORESTAMENTO',
    'LAZER_RURAL',
    'ARRENDAMENTO',
    'CASA',
    'APARTAMENTO',
    'TERRENO',
    'COMERCIAL',
    'SALAS',
    'LOJAS',
    'GALPOES',
    'SOBRADO',
    'FLAT',
    'KITNET',
  ]),
  category: z.enum(['RURAL', 'URBAN']),
  total_area: z.number().positive('Área total deve ser positiva'),
  useful_area: z.number().optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  city: z.string().min(2, 'Cidade inválida'),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  price_total: z.number().positive('Preço deve ser positivo'),
  price_per_unit: z.number().optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'SOLD', 'SUSPENDED', 'ARCHIVED'])
    .optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  status: z
    .enum([
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'PROPOSITION',
      'NEGOTIATION',
      'CLOSED_WON',
      'CLOSED_LOST',
    ])
    .optional(),
  source: z
    .enum([
      'WEBSITE',
      'WHATSAPP',
      'PHONE',
      'REFERRAL',
      'PORTAL',
      'SOCIAL_MEDIA',
      'OFFLINE',
    ])
    .optional(),
  interest_type: z.array(z.string()).optional(),
  min_area: z.number().optional(),
  max_budget: z.number().optional(),
  preferred_location: z.array(z.string()).optional(),
  notes: z.string().optional(),
  property_id: z.string().uuid().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  property_id: z.string().uuid().optional(),
  source: z.string().optional(),
});

export const landingPageSchema = z.object({
  name: z.string().min(2, 'Nome inválido'),
  slug: z
    .string()
    .min(2, 'Slug inválido')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
  title: z.string().optional(),
  description: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.array(z.string()).optional(),
  is_published: z.boolean().optional(),
  is_home: z.boolean().optional(),
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        styles: z.record(z.string()),
        content: z.record(z.unknown()),
      })
    )
    .optional(),
});

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  return schema.safeParse(data);
};
