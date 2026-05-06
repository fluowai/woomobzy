import {
  Property,
  PropertyType,
  PropertyPurpose,
  PropertyAptitude,
  PropertyStatus,
} from '../types';
import { supabase } from './supabase';

export const propertyService = {
  // Listar Imóveis (Implicitly Isolated by Backend Token)
  async list(page: number = 1, limit: number = 50) {
    const { data: { session } } = await supabase.auth.getSession();
    const orgId = session?.user?.user_metadata?.organization_id;

    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []).map(mapToModel);
  },

  // Obter um Imóvel por ID
  async getById(id: string) {
    const data = await callApi(`/api/properties/${id}`);
    return mapToModel(data.property);
  },

  // Criar Imóvel
  async create(property: Partial<Property>) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = mapToDatabase({ 
        ...property, 
        organization_id: (property as any).organization_id || session?.user?.user_metadata?.organization_id 
      });
      
      console.log('🚀 Payload sendo enviado ao Supabase:', payload);

      const { data, error } = await supabase
        .from('properties')
        .insert(payload)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erro retornado pelo Supabase:', error);
        throw error;
      }
      return mapToModel(data);
    } catch (err) {
      console.error('❌ Erro na execução do service.create:', err);
      throw err;
    }
  },

  // Atualizar Imóvel
  async update(id: string, property: Partial<Property>) {
    const payload = mapToDatabase(property);
    const data = await callApi(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapToModel(data.property);
  },

  // Excluir Imóvel
  async delete(id: string) {
    await callApi(`/api/properties/${id}`, {
      method: 'DELETE',
    });
  },

  // Submeter novo imóvel (para landing pages)
  async submit(property: Partial<Property>) {
    const data = await callApi('/api/properties', {
      method: 'POST',
      body: JSON.stringify(property),
    });
    return mapToModel(data.property);
  },
};

// Mappers para converter entre Banco de Dados (snake_case/flat) e Modelo da Aplicação (CamelCase/Nested)
const mapToModel = (dbItem: any): Property => ({
  id: dbItem.id,
  organization_id: dbItem.organization_id,
  title: dbItem.title || '',
  description: dbItem.description || '',
  price: dbItem.price || 0,
  type: (dbItem.property_type || dbItem.type) as PropertyType,
  purpose: (dbItem.purpose as PropertyPurpose) || PropertyPurpose.SALE,
  aptitude: (dbItem.aptitude as PropertyAptitude[]) || [],
  status: dbItem.status as PropertyStatus,
  location: {
    city: dbItem.city || '',
    neighborhood: dbItem.neighborhood || '',
    state: dbItem.state || '',
    address: dbItem.address || '',
  },
  features: {
    ...dbItem.features,
    areaHectares: dbItem.total_area_ha || dbItem.features?.areaHectares || 0,
    // Garantir estrutura mínima para evitar erros de undefined
    infra: dbItem.features?.infra || {
      casaSede: false,
      casasFuncionarios: 0,
      curral: false,
      brete: false,
      balanca: false,
      galpaes: 0,
      barracao: false,
      paiol: false,
      tulha: false,
      armazem: false,
      confinamento: false,
      cocheira: false,
      estabulo: false,
      cercas: '',
      piquetes: 0,
      estradasInternas: false,
      energiaEletrica: false,
      energiaSolar: false,
      pocoArtesiano: false,
      caixaDagua: false,
      irrigacao: false,
      pivotCentral: false,
    },
    water: dbItem.features?.water || {
      rio: false,
      corrego: false,
      riacho: false,
      nascente: false,
      represa: false,
      acude: false,
      lago: false,
      bebedouros: false,
      captacaoAgua: false,
      outorga: false,
    },
    livestock: dbItem.features?.livestock || {
      category: [],
      totalHeads: 0,
      ua: 0,
      confinamento: false,
    },
    agriculture: dbItem.features?.agriculture || {
      crops: [],
      safra: '',
      rotation: false,
      irrigatedArea: 0,
      mechanizableArea: 0,
    },
    legal: dbItem.features?.legal || {
      matricula: '',
      escritura: false,
      statusDocumental: 'Regularizado',
      ccir: false,
      ccirNumber: '',
      car: false,
      carNumber: '',
      itr: false,
      itrNumber: '',
      geo: false,
      geoNumber: '',
      reservaLegal: 0,
      app: 0,
      incra: '',
      outorgaAgua: false,
      regularizacaoFundiaria: false,
    },
    commercial: dbItem.features?.commercial || {
      pricePerHa: 0,
      pricePerAlqueire: 0,
      commissionPercentage: 5,
      isPorteiraFechada: false,
      permuta: false,
      arrendamento: false,
      parcelado: false,
    },
  },
  images: dbItem.images || [],
  highlighted: dbItem.highlighted,
  ownerInfo: dbItem.owner_info,
  brokerId: dbItem.broker_id || '',
  createdAt: dbItem.created_at,
  analysis: dbItem.analysis,
  niche: dbItem.niche || 'urbano',
});

const mapToDatabase = (
  model: Partial<Property> & { organization_id?: string }
): any => {
  const payload: any = {
    title: model.title,
    description: model.description,
    price: model.price,
    property_type: model.type,
    purpose: model.purpose,
    aptitude: model.aptitude,
    status: model.status,
    organization_id: (model as any).organization_id,
    niche: (model as any).niche || 'urbano',
    // Flat location fields
    city: model.location?.city,
    neighborhood: model.location?.neighborhood,
    state: model.location?.state,
    address: model.location?.address,
    // JSONB features
    features: model.features,
    images: model.images,
    highlighted: model.highlighted,
    owner_info: model.ownerInfo,
    analysis: model.analysis,
    // Colunas especializadas para filtros (devem existir no banco)
    total_area_ha: (model.features?.areaHectares && model.features.areaHectares > 0) ? model.features.areaHectares : null,
  };

  // Cálculo de densidade de valor condicional (Rural vs Urbano)
  if (
    model.price &&
    model.features?.areaHectares &&
    model.features.areaHectares > 0
  ) {
    payload.price_per_ha = model.price / model.features.areaHectares;
  } else if (
    model.price &&
    model.features?.areaM2 &&
    model.features.areaM2 > 0
  ) {
    // Para urbanos, salvamos densidade por m2
    payload.price_per_m2 = model.price / model.features.areaM2;
  }

  return payload;
};
