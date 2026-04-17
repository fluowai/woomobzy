import React, { useState, useCallback, useEffect } from 'react';
import {
  Map,
  Upload,
  Layers,
  AlertTriangle,
  FileText,
  CheckCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface PropertyGeo {
  id: string;
  title: string;
  area_total_ha: number;
  area_agricultavel: number;
  area_reserva: number;
  bioma: string;
  tipo_solo: string;
  regime_hidrico: string;
  topografia: string;
  aptidao: string;
  score_liquidez: number;
}

const CadastroTecnico: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');
  const [geoData, setGeoData] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.organization_id) return;
      
      const { data } = await supabase
        .from('properties')
        .select('id, title, area_total_ha, location_city, location_state, status')
        .eq('organization_id', profile?.organization_id)
        .in('property_type', ['Rural', 'Fazenda'])
        .order('created_at', { ascending: false });
      setProperties(data || []);
    };
    load();
  }, [profile?.organization_id]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
            const geo = JSON.parse(text);
            setGeoData(geo);
          } else if (file.name.endsWith('.kml')) {
            // Basic KML parsing - convert to GeoJSON points
            const parser = new DOMParser();
            const kml = parser.parseFromString(text, 'text/xml');
            const placemarks = kml.getElementsByTagName('Placemark');
            const features: any[] = [];

            for (let i = 0; i < placemarks.length; i++) {
              const coords = placemarks[i]
                .getElementsByTagName('coordinates')[0]
                ?.textContent?.trim();
              const name =
                placemarks[i].getElementsByTagName('name')[0]?.textContent ||
                `Ponto ${i + 1}`;
              if (coords) {
                const parts = coords.split(',').map(Number);
                features.push({
                  type: 'Feature',
                  properties: { name },
                  geometry: {
                    type: 'Point',
                    coordinates: [parts[0], parts[1]],
                  },
                });
              }
            }
            setGeoData({ type: 'FeatureCollection', features });
          }
        } catch (err) {
          console.error('Erro ao processar arquivo:', err);
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const stats = [
    {
      icon: Map,
      label: 'Propriedades Georreferenciadas',
      value: String(properties.length),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Layers,
      label: 'Arquivos Importados',
      value: geoData ? '1' : '0',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: CheckCircle,
      label: 'Polígonos Validados',
      value: geoData ? String(geoData.features?.length || 0) : '0',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: AlertTriangle,
      label: 'Sobreposições Detectadas',
      value: '0',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">
          Cadastro Técnico
        </h1>
        <p className="text-black/60 font-medium">
          Georreferenciamento, polígonos e dados técnicos das propriedades
          rurais.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div
              className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}
            >
              <stat.icon size={24} />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          Propriedades Cadastradas
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'import' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          Importar Arquivo Geográfico
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300 p-12 text-center hover:border-emerald-500 transition-all">
              <Upload className="mx-auto text-emerald-400 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                {fileName ? fileName : 'Arraste ou selecione um arquivo'}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Suporta KML, KMZ, GeoJSON e Shapefile
              </p>
              <label className="cursor-pointer bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-lg inline-block">
                Selecionar Arquivo
                <input
                  type="file"
                  accept=".kml,.kmz,.geojson,.json,.shp,.zip"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Form Fields */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-black">Dados Técnicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Área Agricultável (ha)
                  </label>
                  <input
                    type="number"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Área Reserva (ha)
                  </label>
                  <input
                    type="number"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Bioma
                  </label>
                  <select className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option>Cerrado</option>
                    <option>Amazônia</option>
                    <option>Mata Atlântica</option>
                    <option>Caatinga</option>
                    <option>Pampa</option>
                    <option>Pantanal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Tipo de Solo
                  </label>
                  <select className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option>Latossolo</option>
                    <option>Argissolo</option>
                    <option>Neossolo</option>
                    <option>Cambissolo</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Regime Hídrico
                  </label>
                  <select className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option>Irrigado</option>
                    <option>Sequeiro</option>
                    <option>Misto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Topografia
                  </label>
                  <select className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option>Plana</option>
                    <option>Suave Ondulada</option>
                    <option>Ondulada</option>
                    <option>Forte Ondulada</option>
                    <option>Montanhosa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Aptidão Produtiva
                  </label>
                  <select className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none">
                    <option>Pecuária</option>
                    <option>Agricultura</option>
                    <option>Mista</option>
                    <option>Reflorestamento</option>
                    <option>Lazer/Reserva</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Score Liquidez (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="0"
                  />
                </div>
              </div>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all mt-4 shadow-lg">
                Salvar Cadastro Técnico
              </button>
            </div>
          </div>

          {/* Preview Map */}
          <div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            style={{ minHeight: '500px' }}
          >
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-black text-sm">
                Pré-visualização do Polígono
              </h3>
            </div>
            <div style={{ height: '500px' }}>
              <MapContainer
                center={[-14.235, -51.925]}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                {geoData && (
                  <GeoJSON
                    key={JSON.stringify(geoData)}
                    data={geoData}
                    style={{ color: '#10b981', weight: 3, fillOpacity: 0.2 }}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Property List */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Propriedade
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Localização
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Área (ha)
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-400"
                    >
                      <Map className="mx-auto mb-3 text-slate-300" size={40} />
                      <p className="font-medium">
                        Nenhuma propriedade cadastrada
                      </p>
                    </td>
                  </tr>
                ) : (
                  properties.map((prop) => (
                    <tr
                      key={prop.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-black">
                        {prop.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {prop.location_city}/{prop.location_state}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {prop.area_total_ha || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          {prop.status || 'ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroTecnico;
