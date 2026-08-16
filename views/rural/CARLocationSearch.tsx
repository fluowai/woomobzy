/**
 * views/rural/CARLocationSearch.tsx
 *
 * Interface para busca de CAR/SICAR via localização ou link do Google Maps.
 */
import { logger } from '@/utils/logger';

import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Map as MapIcon,
  Database,
  Info,
  ArrowRight,
  Navigation as NavIcon,
  Trash2,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
  LayersControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { propertyService } from '../../services/properties';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet icons with safety checks
if (typeof window !== 'undefined') {
  try {
    if (L.Icon.Default && L.Icon.Default.prototype) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  } catch (e) {
    logger.warn('[Leaflet] Erro ao configurar ícones padrão:', e);
  }
}

const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

interface CARCandidate {
  codImovel: string;
  areaHa: number | null;
  status: string | null;
  municipio: string | null;
  uf: string | null;
  sourceLayer: string;
  matchMode: string;
  confidence: string;
  distanceMeters: number;
  geometry: any;
  rawProperties: any;
}

const CARLocationSearch: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CARCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CARCandidate | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [inputData, setInputData] = useState<any>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);

  const addProgress = (msg: string) => setProgress((prev) => [...prev, msg]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setSelectedCandidate(null);
    setProgress([]);
    setInputData(null);

    try {
      addProgress('Processando link do Google Maps...');
      const coordinateMatch = inputValue
        .trim()
        .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      const requestBody = coordinateMatch
        ? { lat: Number(coordinateMatch[1]), lng: Number(coordinateMatch[2]) }
        : { googleMapsUrl: inputValue };
      const response = await callApi('/api/rural/find-car-by-location', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.success) {
        addProgress('Coordenadas extraídas com sucesso.');
        addProgress(
          `UF identificada: ${response.location?.uf || 'Desconhecida'}`
        );
        addProgress('Consulta SICAR WFS concluída.');

        setInputData(response.input);
        setResults(response.matches);

        if (response.matches.length === 0) {
          setError('Nenhum imóvel rural foi encontrado para esta localização.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar busca.');
    } finally {
      setIsLoading(false);
    }
  };

  const MapUpdater = ({
    geometry,
    point,
  }: {
    geometry?: any;
    point?: [number, number];
  }) => {
    const map = useMap();
    React.useEffect(() => {
      if (geometry) {
        const bounds = L.geoJSON(geometry).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
      } else if (point) {
        map.setView(point, 16);
      }
    }, [geometry, point, map]);
    return null;
  };

  const createPropertyFromCandidate = async () => {
    if (!selectedCandidate) return;

    setSavingCandidate(true);
    setError(null);
    try {
      const created = await propertyService.create({
        title: `Fazenda ${selectedCandidate.municipio || selectedCandidate.codImovel}`,
        description: `Propriedade rural identificada pelo CAR ${selectedCandidate.codImovel}.`,
        type: 'Fazenda' as any,
        purpose: 'Venda' as any,
        status: 'Pendente' as any,
        price: 0,
        niche: 'rural',
        location: {
          city: selectedCandidate.municipio || '',
          state: selectedCandidate.uf || '',
          address: '',
          neighborhood: '',
        },
        features: {
          areaHectares: selectedCandidate.areaHa || 0,
          preferredUnit: 'ha',
          legal: {
            car: true,
            carNumber: selectedCandidate.codImovel,
            geometry: selectedCandidate.geometry,
            reservaLegal: 0,
            app: 0,
          },
          rural: {
            car_source: selectedCandidate.sourceLayer,
            car_match_mode: selectedCandidate.matchMode,
            car_confidence: selectedCandidate.confidence,
            car_raw_properties: selectedCandidate.rawProperties,
          },
        } as any,
      } as any);

      navigate(`/rural/properties/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar propriedade a partir do CAR.');
    } finally {
      setSavingCandidate(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold uppercase italic tracking-tighter flex items-center gap-3">
          <NavIcon className="text-emerald-600" size={32} />
          Localizar CAR por Localização
        </h1>
        <p className="text-slate-500 font-medium small uppercase tracking-widest text-[10px]">
          Identificação Automática de Imóveis Rurais via Google Maps
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Painel de Busca */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Info size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Instruções
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Cole o link do Google Maps da fazenda ou as coordenadas (lat, lng)
              para buscarmos o polígono do CAR.
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="https://www.google.com/maps/..."
                  className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue}
                  className="absolute right-2 top-2 p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Search size={20} />
                  )}
                </button>
              </div>
            </form>

            {/* Progresso */}
            {progress.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                {progress.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase"
                  >
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {p}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 animate-pulse uppercase">
                    <Loader2 size={12} className="animate-spin" />
                    Consultando fontes públicas...
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase">
                    Atenção
                  </p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Candidatos */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest px-2">
                Imóveis Encontrados ({results.length})
              </h3>
              <div className="space-y-3">
                {results.map((candidate) => (
                  <button
                    key={candidate.codImovel}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`w-full text-left p-4 rounded-3xl border transition-all ${
                      selectedCandidate?.codImovel === candidate.codImovel
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-white border-slate-100 text-slate-900 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          selectedCandidate?.codImovel === candidate.codImovel
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {candidate.confidence} Confiança
                      </span>
                      <ChevronRight size={16} />
                    </div>
                    <p className="text-xs font-bold truncate mb-1">
                      {candidate.codImovel}
                    </p>
                    <div
                      className={`flex gap-3 text-[10px] font-medium ${selectedCandidate?.codImovel === candidate.codImovel ? 'text-white/80' : 'text-slate-400'}`}
                    >
                      <span>{candidate.areaHa?.toFixed(2)} ha</span>
                      <span>
                        {candidate.municipio} - {candidate.uf}
                      </span>
                    </div>
                    {candidate.matchMode === 'nearby_radius' && (
                      <p className="text-[9px] mt-2 italic font-bold">
                        Localizado a aprox. {candidate.distanceMeters}m
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mapa e Ações */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden relative shadow-2xl h-[600px]">
            <MapContainer
              center={[-14.235, -51.925]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url={SAT_URL} />
              <MapUpdater
                geometry={selectedCandidate?.geometry}
                point={inputData ? [inputData.lat, inputData.lng] : undefined}
              />

              {inputData && (
                <Marker position={[inputData.lat, inputData.lng]}>
                  <Popup>
                    <div className="text-[10px] font-bold uppercase">
                      Ponto de Interesse
                    </div>
                  </Popup>
                </Marker>
              )}

              {selectedCandidate && (
                <GeoJSON
                  key={selectedCandidate.codImovel}
                  data={selectedCandidate.geometry}
                  style={{ color: '#10b981', weight: 3, fillOpacity: 0.3 }}
                />
              )}
            </MapContainer>

            {!selectedCandidate && !isLoading && !results.length && (
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                  <MapIcon className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Inicie uma busca para visualizar o mapa
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedCandidate && (
            <div className="bg-emerald-900 text-white p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-1">
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  Imóvel Selecionado
                </p>
                <h2 className="text-xl font-bold">
                  {selectedCandidate.codImovel}
                </h2>
                <p className="text-emerald-200/60 text-xs font-medium italic">
                  Pronto para gerar dossiê ambiental e jurídico completo
                </p>
              </div>
              <button
                className="group flex items-center gap-3 bg-white text-emerald-900 px-8 py-4 rounded-2xl font-bold uppercase text-xs hover:bg-emerald-50 transition-all"
                onClick={createPropertyFromCandidate}
                disabled={savingCandidate}
              >
                {savingCandidate ? 'Salvando imóvel...' : 'Gerar Dossiê Rural'}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CARLocationSearch;
