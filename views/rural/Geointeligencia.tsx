import React, { useState } from 'react';
import { Map, Layers, Eye, Download, ToggleLeft, ToggleRight, AlertTriangle, TreePine, Droplets, Mountain } from 'lucide-react';
import { MapContainer, TileLayer, LayersControl, WMSTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface LayerConfig {
  name: string;
  url: string;
  layer: string;
  active: boolean;
  icon: any;
  color: string;
}

const Geointeligencia: React.FC = () => {
  const [layers, setLayers] = useState<LayerConfig[]>([
    { name: 'SIGEF / INCRA', url: 'https://acervofundiario.incra.gov.br/i3geo/ogc.php', layer: 'sigef_particular', active: false, icon: Map, color: 'text-emerald-600' },
    { name: 'CAR (Cadastro Ambiental)', url: '', layer: 'car', active: false, icon: TreePine, color: 'text-green-600' },
    { name: 'Desmatamento PRODES', url: '', layer: 'prodes', active: false, icon: AlertTriangle, color: 'text-red-600' },
    { name: 'Hidrografia', url: '', layer: 'hidrografia', active: false, icon: Droplets, color: 'text-blue-600' },
    { name: 'Relevo / Topografia', url: '', layer: 'relevo', active: false, icon: Mountain, color: 'text-amber-600' },
  ]);

  const toggleLayer = (idx: number) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, active: !l.active } : l));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
          <Layers className="text-emerald-600" size={32} />
          Geointeligência
        </h1>
        <p className="text-black/60 font-medium">Camadas WMS/WFS, sobreposição ambiental, histórico de uso do solo e alertas.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Layers, label: 'Camadas Disponíveis', value: '5', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Eye, label: 'Camadas Ativas', value: String(layers.filter(l => l.active).length), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: AlertTriangle, label: 'Alertas Ambientais', value: '0', color: 'text-red-600', bg: 'bg-red-50' },
          { icon: Download, label: 'Mapas Exportados', value: '0', color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Map + Layer Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Layer Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-black flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            Camadas GIS
          </h3>
          <div className="space-y-3">
            {layers.map((layer, idx) => (
              <button
                key={idx}
                onClick={() => toggleLayer(idx)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                  layer.active ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <layer.icon size={18} className={layer.active ? layer.color : 'text-slate-400'} />
                  <span className={`text-sm font-medium ${layer.active ? 'text-black' : 'text-slate-500'}`}>{layer.name}</span>
                </div>
                {layer.active ? (
                  <ToggleRight size={22} className="text-emerald-600" />
                ) : (
                  <ToggleLeft size={22} className="text-slate-300" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button className="w-full flex items-center gap-2 justify-center p-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
              <Download size={16} /> Exportar Mapa (PDF)
            </button>
            <button className="w-full flex items-center gap-2 justify-center p-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
              <Eye size={16} /> Histórico de Uso do Solo
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ minHeight: '600px' }}>
          <MapContainer center={[-14.235, -51.925]} zoom={5} style={{ height: '600px', width: '100%' }} scrollWheelZoom={true}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satélite">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Terreno">
                <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Estrada">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
            </LayersControl>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default Geointeligencia;
