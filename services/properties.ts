import { supabase } from './supabase';
import { Property, PropertyType, PropertyStatus, PropertyPurpose, PropertyAptitude } from '../types';

export const propertyService = {
  // Listar Imóveis (Supports filtering by organizationId)
  async list(organizationId?: string) {
    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
  
    const { data, error } = await query;

    if (error) throw error;
    return data.map(mapToModel);
  },

  // Obter um Imóvel por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  // Criar Imóvel
  async create(property: Partial<Property>) {
    const payload = mapToDatabase(property);
    const { data, error } = await supabase
      .from('properties')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  // Atualizar Imóvel
  async update(id: string, property: Partial<Property>) {
    const payload = mapToDatabase(property);
    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  },

  // Excluir Imóvel
  async delete(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Submeter Imóvel (Público)
  async submit(property: Partial<Property>) {
    const payload = mapToDatabase(property);
    payload.status = 'Pendente'; // Força status pendente para submissões públicas
    
    const { data, error } = await supabase
      .from('properties')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapToModel(data);
  }
};

// Mappers para converter entre Banco de Dados (snake_case/flat) e Modelo da Aplicação (CamelCase/Nested)
const mapToModel = (dbItem: any): Property => ({
  id: dbItem.id,
  title: dbItem.title || '',
  description: dbItem.description || '',
  price: dbItem.price || 0,
  type: dbItem.type as PropertyType,
  purpose: (dbItem.purpose as PropertyPurpose) || PropertyPurpose.SALE,
  aptitude: (dbItem.aptitude as PropertyAptitude[]) || [],
  status: dbItem.status as PropertyStatus,
  location: {
    city: dbItem.city || '',
    neighborhood: dbItem.neighborhood || '',
    state: dbItem.state || '',
    address: dbItem.address || ''
  },
  features: {
    ...dbItem.features,
    areaHectares: dbItem.area_total_ha || dbItem.features?.areaHectares || 0,
    // Garantir estrutura mínima para evitar erros de undefined
    infra: dbItem.features?.infra || { casaSede: false, casasFuncionarios: 0, curral: false, brete: false, balanca: false, galpaes: 0, barracao: false, paiol: false, tulha: false, armazem: false, confinamento: false, cocheira: false, estabulo: false, cercas: '', piquetes: 0, estradasInternas: false, energiaEletrica: false, energiaSolar: false, pocoArtesiano: false, caixaDagua: false, irrigacao: false, pivotCentral: false },
    water: dbItem.features?.water || { rio: false, corrego: false, riacho: false, nascente: false, represa: false, acude: false, lago: false, bebedouros: false, captacaoAgua: false, outorga: false },
    livestock: dbItem.features?.livestock || { category: [], totalHeads: 0, ua: 0, confinamento: false },
    agriculture: dbItem.features?.agriculture || { crops: [], safra: '', rotation: false, irrigatedArea: 0, mechanizableArea: 0 },
    legal: dbItem.features?.legal || { 
      matricula: '', 
      escritura: false, 
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
      regularizacaoFundiaria: false 
    },
    commercial: dbItem.features?.commercial || { pricePerHa: 0, pricePerAlqueire: 0, isPorteiraFechada: false, permuta: false, arrendamento: false, parcelado: false }
  },
  images: dbItem.images || [],
  highlighted: dbItem.highlighted,
  ownerInfo: dbItem.owner_info,
  brokerId: dbItem.broker_id || '',
  createdAt: dbItem.created_at,
  analysis: dbItem.analysis
});

const mapToDatabase = (model: Partial<Property>): any => {
  const payload: any = {
    title: model.title,
    description: model.description,
    price: model.price,
    type: model.type,
    purpose: model.purpose,
    aptitude: model.aptitude,
    status: model.status,
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
    // Novas colunas especializadas para filtros
    area_total_ha: model.features?.areaHectares,
    topography: model.features?.topography,
    soil_texture: model.features?.soilTexture
  };

  // Cálculo de densidade de valor se o preço e a área existirem
  if (model.price && model.features?.areaHectares && model.features.areaHectares > 0) {
    payload.price_per_ha = model.price / model.features.areaHectares;
  }

  return payload;
};

