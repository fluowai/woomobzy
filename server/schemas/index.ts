import { z } from 'zod';

export const propertySchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  property_type: z.enum([
    'Fazenda',
    'Sítio',
    'Chácara',
    'Estância',
    'Haras',
    'Granja',
    'Agropecuária',
    'Terreno Rural',
    'Gleba',
    'Lote Rural',
    'Área Produtiva',
    'Apartamento',
    'Casa',
    'Sobrado',
    'Terreno Urbano',
    'Sala Comercial',
    'Galpão Industrial',
    'Loft',
    'Studio',
    'Cobertura',
  ]),
  purpose: z.enum(['Venda', 'Aluguel', 'Venda e Aluguel']).optional(),
  price: z.number().positive('Preço deve ser positivo').optional(),
  total_area_ha: z.number().positive('Área total deve ser positiva').optional(),
  useful_area_ha: z.number().optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  city: z.string().min(2, 'Cidade inválida'),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  status: z
    .enum(['Disponível', 'Alugado', 'Vendido', 'Reservado', 'Pendente'])
    .optional(),
  images: z.array(z.string()).optional(),
  features: z.record(z.unknown()).optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  status: z
    .enum([
      'Novo',
      'Contatado',
      'Qualificado',
      'Proposta',
      'Negociação',
      'Ganho',
      'Perdido',
    ])
    .optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  property_id: z.string().uuid().optional(),
  ad_reference: z.string().optional(),
  organic_channel: z.string().optional(),
  campaign: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  property_id: z.string().uuid().optional(),
  organization_id: z.string().uuid('Organização inválida'),
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
