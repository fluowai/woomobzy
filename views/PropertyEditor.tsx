import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  MapPin,
  Home,
  Info,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Plus,
  Loader2,
  FileText,
  Check,
  X,
  History,
  Activity,
  Upload,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { kml } from '@tmcw/togeojson';
import { MOCK_PROPERTIES } from '../constants';
import {
  Property,
  PropertyType,
  PropertyStatus,
  PropertyPurpose,
  PropertyAptitude,
} from '../types';
import { ruralDataService } from '../services/ruralDataService';
import { generateSmartDescription } from '../services/geminiService';
import { uploadFile } from '../services/storage';
import { propertyService } from '../services/properties';
import { propertyAnalysisService } from '../services/propertyAnalysisService';
import { PropertyAnalysisCard } from '../components/PropertyAnalysisCard';
import {
  toHectares,
  fromHectares,
  getAlqueireFactor,
  formatArea,
} from '../utils/rural';
import {
  AlqueireType,
  TopographyType,
  SoilTexture,
  LivestockCategory,
} from '../types';
import RuralMap from '../components/RuralMap';
import { useAuth } from '../context/AuthContext';

const PropertyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isNew = id === 'new';

  const niche = profile?.organization?.niche || 'hybrid';

  const RURAL_TYPES = [
    PropertyType.FAZENDA,
    PropertyType.SITIO,
    PropertyType.CHACARA,
    PropertyType.ESTANCIA,
    PropertyType.HARAS,
    PropertyType.GRANJA,
    PropertyType.AGROPECUARIA,
    PropertyType.TERRENO_RURAL,
    PropertyType.GLEBA,
    PropertyType.LOTE_RURAL,
    PropertyType.AREA_PRODUTIVA,
  ];

  const URBAN_TYPES = [
    PropertyType.APARTAMENTO,
    PropertyType.CASA,
    PropertyType.SOBRADO,
    PropertyType.TERRENO_URBANO,
    PropertyType.SALA_COMERCIAL,
    PropertyType.GALPAO_INDUSTRIAL,
    PropertyType.LOFT,
    PropertyType.STUDIO,
    PropertyType.COBERTURA,
  ];

  const filteredTypes =
    niche === 'rural'
      ? RURAL_TYPES
      : niche === 'traditional'
        ? URBAN_TYPES
        : Object.values(PropertyType);

  // Detecção dinâmica do tipo de imóvel para exibição de campos
  const isRuralType = formData.type && RURAL_TYPES.includes(formData.type as PropertyType);
  const isUrbanType = formData.type && URBAN_TYPES.includes(formData.type as PropertyType);

  const [loading, setLoading] = useState(false);
  const [loadingCar, setLoadingCar] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    price: 0,
    type: PropertyType.FAZENDA,
    purpose: PropertyPurpose.SALE,
    aptitude: [],
    status: PropertyStatus.AVAILABLE,
    description: '',
    descriptionDraft: '',
    location: { city: '', neighborhood: '', state: '', address: '' },
    features: {
      areaHectares: 0,
      areaAlqueires: 0,
      alqueireType: AlqueireType.PAULISTA,
      preferredUnit: 'ha',
      // Urban fields
      areaPrivativa: 0,
      areaTotalM2: 0,
      andar: 0,
      quartos: 0,
      suites: 0,
      banheiros: 0,
      vagas: 0,
      condominio: 0,
      iptu: 0,
      infra: {
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
      water: {
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
      livestock: { category: [], totalHeads: 0, ua: 0, confinamento: false },
      agriculture: {
        crops: [],
        safra: '',
        rotation: false,
        irrigatedArea: 0,
        mechanizableArea: 0,
      },
      legal: {
        matricula: '',
        escritura: false,
        ccir: false,
        car: false,
        itr: false,
        geo: false,
        reservaLegal: 0,
        app: 0,
        incra: '',
        outorgaAgua: false,
        regularizacaoFundiaria: false,
      },
      commercial: {
        pricePerHa: 0,
        pricePerAlqueire: 0,
        isPorteiraFechada: false,
        permuta: false,
        arrendamento: false,
        parcelado: false,
      },
    },
    images: [],
  });

  useEffect(() => {
    const loadProperty = async () => {
      if (!isNew && id) {
        try {
          setLoading(true);
          const data = await propertyService.getById(id);
          setFormData(data);
        } catch (error) {
          logger.error('Erro ao carregar imóvel', error);
          navigate(`/${niche}/properties`);
        } finally {
          setLoading(false);
        }
      }
    };
    loadProperty();
  }, [id, isNew, navigate]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.title?.trim()) {
      alert('Por favor, informe o título do imóvel.');
      return;
    }

    setLoading(true);
    logger.info('💾 Iniciando salvamento do imóvel...', { isNew, id });

    try {
      const payload = {
        ...formData,
        organization_id: profile?.organization_id,
      };

      logger.info('📦 Payload de salvamento:', payload);

      if (isNew) {
        const result = await propertyService.create(payload);
        logger.info('✅ Imóvel criado com sucesso:', result);
        alert('Imóvel criado com sucesso!');
      } else if (id) {
        const result = await propertyService.update(id, payload);
        logger.info('✅ Imóvel atualizado com sucesso:', result);
        alert('Imóvel atualizado com sucesso!');
      }
      navigate(`/${niche}/properties`);
    } catch (error: any) {
      logger.error('❌ Erro detalhado ao salvar:', error);
      alert(
        `Erro ao salvar imóvel: ${error.message || 'Erro desconhecido'}. Verifique o console para mais detalhes.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAiDescription = async () => {
    if (!formData.title || formData.price === 0) {
      alert(
        'Por favor, preencha as características básicas antes de gerar a descrição.'
      );
      return;
    }
    setAiGenerating(true);
    const desc = await generateSmartDescription(formData);
    if (desc) {
      setFormData((prev) => ({ ...prev, descriptionDraft: desc }));
    }
    setAiGenerating(false);
  };

  const handleAnalyzeProperty = async () => {
    if (
      !formData.location?.city ||
      !formData.location?.state ||
      !formData.features?.areaHectares
    ) {
      alert(
        'Preencha pelo menos a Cidade, Estado e Área total (Hectares) para realizar a análise.'
      );
      return;
    }

    try {
      setAnalyzing(true);
      const analysis = await propertyAnalysisService.analyzeProperty(
        formData.location.city,
        formData.location.state,
        formData.features.areaHectares,
        formData.features.tipoSolo || 'Misto'
      );

      setFormData((prev) => ({ ...prev, analysis }));
    } catch (error) {
      logger.error('Erro na análise', error);
      alert(
        'Erro ao realizar análise. Verifique se a cidade e estado estão corretos.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const applyDraft = () => {
    setFormData((prev) => ({
      ...prev,
      description: prev.descriptionDraft || prev.description,
      descriptionDraft: '',
    }));
  };

  const discardDraft = () => {
    setFormData((prev) => ({ ...prev, descriptionDraft: '' }));
  };

  const handleImportCAR = async () => {
    const carNumber = formData.features?.legal?.carNumber;
    if (!carNumber) {
      alert('Por favor, insira o número do CAR primeiro.');
      return;
    }

    setLoadingCar(true);
    try {
      const data = await ruralDataService.fetchCarData(carNumber);
      const mapped = ruralDataService.mapSicarToFeatures(data);

      setFormData((prev) => ({
        ...prev,
        features: {
          ...prev.features!,
          areaHectares: mapped.areaHectares || prev.features?.areaHectares,
          legal: {
            ...prev.features!.legal!,
            reservaLegal:
              mapped.reservaLegal || prev.features?.legal?.reservaLegal,
            app: mapped.app || prev.features?.legal?.app,
          },
        },
      }));
      alert('Dados importados com sucesso do SICAR!');
    } catch (error: any) {
      logger.error(error);
      alert(
        error.message ||
          'Erro ao importar dados do CAR. O sistema pode estar instável ou o código é inválido.'
      );
    } finally {
      setLoadingCar(false);
    }
  };

  const handleKmlImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        const geoJSON = kml(dom);

        if (geoJSON && geoJSON.features.length > 0) {
          const firstFeature = geoJSON.features[0];
          setFormData((prev) => ({
            ...prev,
            features: {
              ...prev.features!,
              legal: {
                ...prev.features?.legal!,
                geometry: firstFeature,
              },
            },
          }));
          alert('KML importado com sucesso!');
        }
      } catch (error) {
        logger.error('Erro ao importar KML:', error);
        alert('Erro ao processar arquivo KML.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
             onClick={() => navigate(`/${niche}/properties`)}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isNew ? 'Novo Imóvel' : 'Editar Imóvel'}
            </h1>
            <p className="text-slate-500 text-sm">
              Preencha os detalhes para publicar no portal.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => navigate(`/${niche}/properties`)}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-white transition-colors text-center"
          >
            Cancelar
          </button>
          {niche !== 'traditional' && (
            <button
              type="button"
              onClick={handleAnalyzeProperty}
              disabled={analyzing}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Activity size={20} />
              )}
              Análise Inteligente
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            Salvar Alterações
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Seção 1: Informações Básicas */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Info size={20} />
            <h2 className="font-bold uppercase tracking-wider text-sm">
              Informações Básicas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Título do Anúncio
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ex: Apartamento Moderno com Vista para o Mar"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Finalidade
                </label>
                <select
                  value={formData.purpose || PropertyPurpose.SALE}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purpose: e.target.value as PropertyPurpose,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(PropertyPurpose).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type || PropertyType.FAZENDA}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as PropertyType,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {filteredTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status || PropertyStatus.AVAILABLE}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as PropertyStatus,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(PropertyStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Localização */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <MapPin size={20} />
            <h2 className="font-bold uppercase tracking-wider text-sm">
              Localização
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Endereço Completo
              </label>
              <input
                type="text"
                value={formData.location?.address || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location!,
                      address: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={formData.location?.neighborhood || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location!,
                      neighborhood: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={formData.location?.city || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location!, city: e.target.value },
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={formData.location?.state || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location!, state: e.target.value },
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Localização & Georreferenciamento - RURAL ONLY */}
        {isRuralType && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <MapPin size={20} />
                <h2 className="font-bold uppercase tracking-wider text-sm">
                  Georreferenciamento & Mapa
                </h2>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".kml"
                  onChange={handleKmlImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  <Upload size={14} />
                  IMPORTAR KML
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-4">
                Desenhe os limites da propriedade no mapa para calcular a área
                automaticamente e visualizar camadas do SIGEF/CAR.
              </p>
              <RuralMap
                height="500px"
                initialGeoJson={formData.features?.legal?.geometry}
                onPolygonCreated={(geoJson) => {
                  setFormData((prev) => ({
                    ...prev,
                    features: {
                      ...prev.features!,
                      legal: {
                        ...prev.features?.legal!,
                        geometry: geoJson,
                      },
                      // TODO: Trigger area update here based on polygon if needed
                    },
                  }));
                }}
              />
            </div>
          </div>
        )}

        {/* Seção 3: Características Rurais - RURAL ONLY */}
        {isRuralType && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <Home size={20} />
              <h2 className="font-bold uppercase tracking-wider text-sm">
                Características Rurais
              </h2>
            </div>

            {/* Aptidão */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">
                Aptidão e Vocação
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.values(PropertyAptitude).map((apt) => (
                  <label
                    key={apt}
                    className={`
                  flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                  ${
                    formData.aptitude?.includes(apt)
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-600'
                  }
                `}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.aptitude?.includes(apt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            aptitude: [...(prev.aptitude || []), apt],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            aptitude:
                              prev.aptitude?.filter((a) => a !== apt) || [],
                          }));
                        }
                      }}
                    />
                    <span className="text-sm font-semibold">{apt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Área da Propriedade - Área Inteligente */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                  1
                </span>
                Área e Medidas (Conversão Automática)
              </h3>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Unidade Principal de Exibição
                  </h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredUnit"
                        value="ha"
                        checked={
                          formData.features?.preferredUnit === 'ha' ||
                          !formData.features?.preferredUnit
                        }
                        onChange={() =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features!,
                              preferredUnit: 'ha',
                            },
                          })
                        }
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Hectares (Padrão)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredUnit"
                        value="alqueire"
                        checked={
                          formData.features?.preferredUnit === 'alqueire'
                        }
                        onChange={() =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features!,
                              preferredUnit: 'alqueire',
                            },
                          })
                        }
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Alqueires
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Área em Hectares (ha) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.features?.areaHectares || 0}
                        onChange={(e) => {
                          const ha = Number(e.target.value);
                          const alqFactor = getAlqueireFactor(
                            formData.features?.alqueireType ||
                              AlqueireType.PAULISTA
                          );
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features!,
                              areaHectares: ha,
                              areaAlqueires: ha / alqFactor,
                              areaAcres: fromHectares(ha, 'acre'),
                            },
                          });
                        }}
                        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                        placeholder="Ex: 100"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">
                        ha
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      Tipo de Alqueire
                      <div className="relative group">
                        <Info
                          size={14}
                          className="text-slate-400 cursor-help"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Paulista: 2.42 ha
                          <br />
                          Mineiro/Goiano: 4.84 ha
                          <br />
                          Baiano: 9.68 ha
                        </div>
                      </div>
                    </label>
                    <select
                      value={
                        formData.features?.alqueireType || AlqueireType.PAULISTA
                      }
                      onChange={(e) => {
                        const type = e.target.value as AlqueireType;
                        const ha = formData.features?.areaHectares || 0;
                        const alqFactor = getAlqueireFactor(type);
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            alqueireType: type,
                            areaAlqueires: ha / alqFactor,
                          },
                        });
                      }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {Object.values(AlqueireType).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Área em Alqueires
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={
                          formData.features?.areaAlqueires?.toFixed(2) || 0
                        }
                        disabled
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">
                        alq
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Características Técnicas da Terra */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                  2
                </span>
                Características Técnicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Topografia
                  </label>
                  <select
                    value={
                      formData.features?.topography || TopographyType.PLANA
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          topography: e.target.value as TopographyType,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(TopographyType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Textura do Solo
                  </label>
                  <select
                    value={formData.features?.soilTexture || SoilTexture.MISTO}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          soilTexture: e.target.value as SoilTexture,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(SoilTexture).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Altitude (metros)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.features?.altitude || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            altitude: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: 850"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      m
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Infraestrutura e Benfeitorias */}
            <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                  3
                </span>
                Infraestrutura e Benfeitorias
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                {[
                  { key: 'casaSede', label: 'Casa Sede' },
                  { key: 'curral', label: 'Currais' },
                  { key: 'brete', label: 'Brete' },
                  { key: 'balanca', label: 'Balança' },
                  { key: 'barracao', label: 'Barracão' },
                  { key: 'paiol', label: 'Paiol' },
                  { key: 'armazem', label: 'Armazém' },
                  { key: 'confinamento', label: 'Confinamento' },
                  { key: 'energiaSolar', label: 'Energia Solar' },
                  { key: 'pocoArtesiano', label: 'Poço Artesiano' },
                  { key: 'irrigacao', label: 'Irrigação' },
                  { key: 'pivotCentral', label: 'Pivot Central' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={!!(formData.features?.infra as any)?.[item.key]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            infra: {
                              ...formData.features!.infra!,
                              [item.key]: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-all"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Casas de Funcionários
                  </label>
                  <input
                    type="number"
                    value={formData.features?.infra?.casasFuncionarios || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          infra: {
                            ...formData.features!.infra!,
                            casasFuncionarios: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Galpões
                  </label>
                  <input
                    type="number"
                    value={formData.features?.infra?.galpaes || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          infra: {
                            ...formData.features!.infra!,
                            galpaes: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Piquetes
                  </label>
                  <input
                    type="number"
                    value={formData.features?.infra?.piquetes || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          infra: {
                            ...formData.features!.infra!,
                            piquetes: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Recursos Hídricos */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                  4
                </span>
                Recursos Hídricos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { key: 'rio', label: 'Rio' },
                  { key: 'corrego', label: 'Córrego' },
                  { key: 'nascente', label: 'Nascente' },
                  { key: 'represa', label: 'Represa' },
                  { key: 'outorga', label: 'Outorga de Água' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`
                  flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                  ${
                    (formData.features?.water as any)?.[item.key]
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-600'
                  }
                `}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!!(formData.features?.water as any)?.[item.key]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            water: {
                              ...formData.features!.water!,
                              [item.key]: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    <span className="text-xs font-bold uppercase">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Documentação e Legalização */}
            <div>
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                  5
                </span>
                Documentação e Legalização
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      key: 'car',
                      label: 'CAR',
                      numberKey: 'carNumber',
                      placeholder: 'Código CAR (UF-XXXXXXX-...)',
                      url: 'https://www.car.gov.br/#/consultar',
                    },
                    {
                      key: 'ccir',
                      label: 'CCIR',
                      numberKey: 'ccirNumber',
                      placeholder: 'Código INCRA (13 dígitos)',
                      url: 'https://sncr.incra.gov.br/sncr-web/consultarImovelRural.do',
                    },
                    {
                      key: 'geo',
                      label: 'GEO',
                      numberKey: 'geoNumber',
                      placeholder: 'Código SIGEF',
                      url: 'https://sigef.incra.gov.br/consultar/parcelas/',
                    },
                    {
                      key: 'itr',
                      label: 'ITR',
                      numberKey: 'itrNumber',
                      placeholder: 'NIRF (8 dígitos)',
                      url: 'https://servicos.receita.fazenda.gov.br/servicos/certidaonirf/certidao/emissao',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              !!(formData.features?.legal as any)?.[item.key]
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                features: {
                                  ...formData.features!,
                                  legal: {
                                    ...formData.features!.legal!,
                                    [item.key]: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            {item.label}
                          </span>
                        </label>

                        {(formData.features?.legal as any)?.[
                          item.numberKey
                        ] && (
                          <div className="flex items-center gap-2">
                            {item.key === 'car' && (
                              <button
                                type="button"
                                onClick={handleImportCAR}
                                disabled={loadingCar}
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                {loadingCar
                                  ? 'Importando...'
                                  : 'Importar Dados'}{' '}
                                <ArrowLeft size={10} className="rotate-180" />
                              </button>
                            )}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              Consultar Portal <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>

                      {(formData.features?.legal as any)?.[item.key] && (
                        <input
                          type="text"
                          placeholder={item.placeholder}
                          value={
                            (formData.features?.legal as any)?.[
                              item.numberKey
                            ] || ''
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              features: {
                                ...formData.features!,
                                legal: {
                                  ...formData.features!.legal!,
                                  [item.numberKey]: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      )}
                    </div>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!formData.features?.legal?.escritura}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            legal: {
                              ...formData.features!.legal!,
                              escritura: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Escritura
                    </span>
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Matrícula (Nº)
                    </label>
                    <input
                      type="text"
                      value={formData.features?.legal?.matricula || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            legal: {
                              ...formData.features!.legal!,
                              matricula: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: 12.345"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Reserva Legal (%)
                      </label>
                      <input
                        type="number"
                        value={formData.features?.legal?.reservaLegal || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features!,
                              legal: {
                                ...formData.features!.legal!,
                                reservaLegal: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        APP (%)
                      </label>
                      <input
                        type="number"
                        value={formData.features?.legal?.app || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features!,
                              legal: {
                                ...formData.features!.legal!,
                                app: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seção 3.1: Características Urbanas - URBAN ONLY */}
        {isUrbanType && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <Home size={20} />
              <h2 className="font-bold uppercase tracking-wider text-sm">
                Características do Imóvel
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Área Privativa (m²)
                </label>
                <input
                  type="number"
                  value={formData.features?.areaPrivativa || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        areaPrivativa: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: 85"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Área Total (m²)
                </label>
                <input
                  type="number"
                  value={formData.features?.areaTotalM2 || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        areaTotalM2: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: 120"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Andar
                </label>
                <input
                  type="number"
                  value={formData.features?.andar || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        andar: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: 12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Quartos
                </label>
                <input
                  type="number"
                  value={formData.features?.quartos || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        quartos: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Suítes
                </label>
                <input
                  type="number"
                  value={formData.features?.suites || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        suites: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Banheiros
                </label>
                <input
                  type="number"
                  value={formData.features?.banheiros || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        banheiros: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vagas
                </label>
                <input
                  type="number"
                  value={formData.features?.vagas || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        vagas: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor do Condomínio (R$)
                </label>
                <input
                  type="number"
                  value={formData.features?.condominio || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        condominio: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor do IPTU (Anual - R$)
                </label>
                <input
                  type="number"
                  value={formData.features?.iptu || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: {
                        ...formData.features!,
                        iptu: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Seção 4: Descrição & IA */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <Sparkles size={20} />
              <h2 className="font-bold uppercase tracking-wider text-sm">
                Descrição do Anúncio
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAiDescription}
              disabled={aiGenerating}
              className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {aiGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              GERAR COM IA
            </button>
          </div>

          <div className="space-y-6">
            {/* Campo Principal */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Conteúdo Publicado
              </label>
              <textarea
                rows={8}
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                placeholder="Descreva os diferenciais deste imóvel..."
              />
            </div>

            {/* Campo de Rascunho (Visível apenas se houver rascunho) */}
            {formData.descriptionDraft && (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                    <FileText size={16} />
                    Sugestão Gerada pela IA
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyDraft}
                      className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
                    >
                      <Check size={14} /> Aplicar Rascunho
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      className="flex items-center gap-1.5 bg-white text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors"
                    >
                      <Trash2 size={14} /> Descartar
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={formData.descriptionDraft}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descriptionDraft: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-white/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none italic text-slate-700"
                />
                <p className="mt-2 text-[10px] text-amber-600 font-medium italic">
                  * Você pode editar esta sugestão antes de aplicar ou
                  simplesmente clicar em "Aplicar" para substituir a descrição
                  atual.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Seção 5: Análise Inteligente - RURAL ONLY */}
        {niche !== 'traditional' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles size={20} />
                <h2 className="font-bold uppercase tracking-wider text-sm">
                  Análise Inteligente (IA)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAnalyzeProperty}
                disabled={analyzing}
                className="flex items-center gap-2 text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {analyzing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                ANALISAR PROPRIEDADE
              </button>
            </div>

            {!formData.analysis && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Sparkles className="mx-auto text-slate-300 mb-3" size={32} />
                <h3 className="text-slate-900 font-bold mb-1">
                  Descubra o potencial desta propriedade
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Nossa IA analisa dados climáticos e de solo para gerar
                  insights sobre aptidão agrícola e pecuária.
                </p>
              </div>
            )}

            {formData.analysis && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PropertyAnalysisCard analysis={formData.analysis} />
              </div>
            )}
          </div>
        )}

        {/* Seção 6: Mídia */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <ImageIcon size={20} />
            <h2 className="font-bold uppercase tracking-wider text-sm">
              Fotos e Vídeos
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {formData.images?.map((img, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100"
              >
                <img src={img} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      images: prev.images?.filter((_, i) => i !== idx),
                    }))
                  }
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50 cursor-pointer relative">
              {loading ? ( // Reusing loading state for simplicity, or create specific uploading state
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Plus size={32} />
                  <span className="text-xs font-bold mt-2 uppercase tracking-tighter">
                    Add Fotos
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    // Simples upload sequencial
                    // Idealmente mostrar loader específico
                    for (let i = 0; i < files.length; i++) {
                      const publicUrl = await uploadFile(
                        files[i],
                        'property-images'
                      );
                      if (publicUrl) {
                        setFormData((prev) => ({
                          ...prev,
                          images: [...(prev.images || []), publicUrl],
                        }));
                      }
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PropertyEditor;
