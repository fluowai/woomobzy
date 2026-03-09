
import { Property, PropertyStatus, PropertyType, Lead, User, SiteSettings } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'João do Campo',
  role: 'ADMIN',
  agencyName: 'Fazendas Brasil Select',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80'
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  agencyName: 'Minha Imobiliária',
  templateId: 'modern',
  primaryColor: '#4F46E5', // Indigo 600
  secondaryColor: '#1E293B', // Slate 800
  logoUrl: '',
  logoHeight: 80,
  contactPhone: '(11) 99999-9999',
  contactEmail: 'contato@imobiliaria.com',
  socialLinks: {
    instagram: '',
    facebook: '',
    whatsapp: ''
  },
  footerText: 'Sua imobiliária de confiança no mercado.'
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'f1',
    title: 'Fazenda Produtiva - 1.200 Hectares de Soja',
    description: 'Propriedade de alto desempenho com infraestrutura completa, silos, sede luxuosa e excelente logística de escoamento no Mato Grosso.',
    price: 45000000,
    type: PropertyType.LAND,
    status: PropertyStatus.AVAILABLE,
    location: {
      city: 'Sorriso',
      neighborhood: 'Região da Chapada',
      state: 'MT',
      address: 'Rodovia Transamazônica, Km 45'
    },
    features: {
      bedrooms: 6,
      bathrooms: 8,
      area: 12000000,
      garages: 10
    },
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80'
    ],
    brokerId: 'u1',
    createdAt: '2024-01-15'
  },
  {
    id: 'f2',
    title: 'Haras de Cinema em Tatuí - Elite',
    description: 'O melhor haras da região, pronto para criação de cavalos Quarto de Milha. Pista de treinamento oficial e baias climatizadas.',
    price: 8500000,
    type: PropertyType.HOUSE,
    status: PropertyStatus.AVAILABLE,
    location: {
      city: 'Tatuí',
      neighborhood: 'Interior de SP',
      state: 'SP',
      address: 'Estrada Municipal do Sol, 500'
    },
    features: {
      bedrooms: 4,
      bathrooms: 5,
      area: 50000,
      garages: 6
    },
    images: [
      'https://images.unsplash.com/photo-1534329535361-1f6a01149a4a?auto=format&fit=crop&w=1200&q=80'
    ],
    brokerId: 'u1',
    createdAt: '2024-02-10'
  },
  {
    id: 'f3',
    title: 'Sítio Produtor de Café em Minas',
    description: 'Terras férteis com altitude ideal para café gourmet. Produção ativa e exportação direta.',
    price: 3200000,
    type: PropertyType.HOUSE,
    status: PropertyStatus.RESERVED,
    location: {
      city: 'Três Pontas',
      neighborhood: 'Sul de Minas',
      state: 'MG',
      address: 'Fazenda das Águas, CP 10'
    },
    features: {
      bedrooms: 3,
      bathrooms: 2,
      area: 150000,
      garages: 4
    },
    images: [
      'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?auto=format&fit=crop&w=1200&q=80'
    ],
    brokerId: 'u1',
    createdAt: '2024-03-05'
  }
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    name: 'Investidor Agrícola S.A.',
    email: 'diretoria@agroinvest.com.br',
    phone: '(61) 98888-0000',
    source: 'Portal Fazendas Brasil',
    status: 'Proposta',
    budget: 50000000,
    preferences: { type: PropertyType.LAND, neighborhood: 'Mato Grosso' },
    createdAt: '2024-05-22'
  },
  {
    id: 'l2',
    name: 'Carlos Mendes (Criador)',
    email: 'carlos.mendes@email.com',
    phone: '(11) 97777-6666',
    source: 'WhatsApp',
    status: 'Em Atendimento',
    budget: 10000000,
    preferences: { type: PropertyType.HOUSE, neighborhood: 'Interior SP' },
    createdAt: '2024-05-21'
  }
];
