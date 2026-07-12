export enum PropertyStatus {
  AVAILABLE = 'Disponível',
  RENTED = 'Alugado',
  SOLD = 'Vendido',
  RESERVED = 'Reservado',
  PENDING = 'Pendente',
}

export enum PropertyType {
  FAZENDA = 'Fazenda',
  SITIO = 'Sitio',
  CHACARA = 'Chacara',
  ESTANCIA = 'Estancia',
  HARAS = 'Haras',
  GRANJA = 'Granja',
  AGROPECUARIA = 'Agropecuaria',
  TERRENO_RURAL = 'Terreno Rural',
  GLEBA = 'Gleba',
  LOTE_RURAL = 'Lote Rural',
  AREA_PRODUTIVA = 'Area Produtiva',
  APARTAMENTO = 'Apartamento',
  CASA = 'Casa',
  SOBRADO = 'Sobrado',
  TERRENO_URBANO = 'Terreno Urbano',
  SALA_COMERCIAL = 'Sala Comercial',
  GALPAO_INDUSTRIAL = 'Galpao Industrial',
  LOFT = 'Loft',
  STUDIO = 'Studio',
  COBERTURA = 'Cobertura',
}

export enum PropertyPurpose {
  SALE = 'Venda',
  RENT = 'Aluguel Anual',
  SEASONAL = 'Temporada',
  BOTH = 'Venda e Aluguel',
}

export enum PropertyAptitude {
  AGRICULTURE = 'Agricultura',
  CATTLE = 'Pecuaria',
  MIXED = 'Mista',
  FORESTRY = 'Silvicultura',
  LEISURE = 'Lazer',
  COFFEE = 'Cafe',
  GRAINS = 'Graos',
  FRUIT = 'Fruticultura',
  DAIRY = 'Leite',
  REFORESTATION = 'Reflorestamento',
}

export enum TopographyType {
  PLANA = 'Plana',
  ONDULADA = 'Ondulada',
  LEVE_ONDULADA = 'Levemente Ondulada',
  MONTANHOSA = 'Montanhosa',
}

export enum SoilTexture {
  ARENOSO = 'Arenoso',
  ARGILOSO = 'Argiloso',
  MISTO = 'Misto',
  MASSAPE = 'Massape',
  TERRA_ROXA = 'Terra Roxa',
  LATOSSOLO = 'Latossolo',
}

export enum AlqueireType {
  PAULISTA = 'Paulista (2.42 ha)',
  MINEIRO = 'Mineiro (4.84 ha)',
  GOIANO = 'Goiano (4.84 ha)',
  BAIANO = 'Baiano (9.68 ha)',
}

export enum LivestockCategory {
  CORTE = 'Gado de Corte',
  LEITE = 'Gado de Leite',
  CRIA = 'Cria',
  RECRIA = 'Recria',
  ENGORDA = 'Engorda',
  CICLO_COMPLETO = 'Ciclo Completo',
}

export interface Property {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  descriptionDraft?: string;
  price: number;
  type: PropertyType;
  purpose: PropertyPurpose;
  aptitude: PropertyAptitude[];
  status: PropertyStatus;
  total_area_ha?: number;
  property_type?: string;
  updated_at?: string;
  location: {
    city: string;
    neighborhood: string;
    state: string;
    address: string;
  };
  features: {
    areaHectares: number;
    areaAlqueires?: number;
    alqueireType?: AlqueireType;
    areaAcres?: number;
    areaM2?: number;
    areaConstruida?: number;
    preferredUnit?: 'ha' | 'alqueire' | 'acre' | 'm2';
    dormitorios?: number;
    suites?: number;
    banheiros?: number;
    vagas?: number;
    andar?: number;
    condominio?: number;
    iptu?: number;
    topography?: TopographyType;
    soilTexture?: SoilTexture;
    altitude?: number;
    pluviometry?: number;
    supportCapacity?: number;
    infra?: {
      casaSede: boolean;
      casasFuncionarios: number;
      curral: boolean;
      brete: boolean;
      balanca: boolean;
      galpaes: number;
      barracao: boolean;
      paiol: boolean;
      tulha: boolean;
      armazem: boolean;
      confinamento: boolean;
      cocheira: boolean;
      estabulo: boolean;
      cercas: string;
      piquetes: number;
      estradasInternas: boolean;
      energiaEletrica: boolean;
      energiaSolar: boolean;
      pocoArtesiano: boolean;
      caixaDagua: boolean;
      irrigacao: boolean;
      pivotCentral: boolean;
    };
    water?: {
      rio: boolean;
      corrego: boolean;
      riacho: boolean;
      nascente: boolean;
      represa: boolean;
      acude: boolean;
      lago: boolean;
      bebedouros: boolean;
      captacaoAgua: boolean;
      outorga: boolean;
    };
    livestock?: {
      category: LivestockCategory[];
      totalHeads: number;
      ua: number;
      confinamento: boolean;
    };
    agriculture?: {
      crops: string[];
      safra: string;
      rotation: boolean;
      irrigatedArea: number;
      mechanizableArea: number;
    };
    legal?: {
      matricula: string;
      escritura: boolean;
      statusDocumental?: 'Regularizado' | 'Pendente' | 'Em Inventario' | 'Posse';
      ccir: boolean;
      ccirNumber?: string;
      car: boolean;
      carNumber?: string;
      itr: boolean;
      itrNumber?: string;
      geo: boolean;
      geoNumber?: string;
      reservaLegal: number;
      app: number;
      incra: string;
      outorgaAgua: boolean;
      regularizacaoFundiaria: boolean;
      geometry?: any;
    };
    commercial?: {
      pricePerHa?: number;
      pricePerAlqueire?: number;
      commissionPercentage?: number;
      isPorteiraFechada: boolean;
      permuta: boolean;
      arrendamento: boolean;
      parcelado: boolean;
    };
    casaSede?: boolean;
    caseiros?: number;
    galpoes?: number;
    currais?: boolean;
    tipoSolo?: string;
    usoAtual?: string[];
    temGado?: boolean;
    capacidadeCabecas?: number;
    fontesAgua?: string[];
    percentualMata?: number;
  };
  images: string[];
  source?: string;
  external_id?: string;
  external_updated_at?: string;
  external_listing_status?: string;
  imported_at?: string;
  published_at?: string;
  highlighted?: boolean;
  ownerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  brokerId: string;
  createdAt: string;
  analysis?: PropertyAnalysis;
}

export interface ClimateData {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgRainfall: number;
  totalRainfall: number;
  humidity: number;
  season: string;
  location: string;
}

export interface PropertyAnalysis {
  climate: ClimateData;
  aptitude: {
    cattle: {
      score: number;
      type: string[];
      notes: string;
    };
    agriculture: {
      score: number;
      crops: string[];
      notes: string;
    };
  };
  risks: string[];
  opportunities: string[];
  overallScore: number;
  aiInsights: string;
  analyzedAt: string;
}
