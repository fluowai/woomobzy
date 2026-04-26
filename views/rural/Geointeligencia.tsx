import React, { useState, useEffect } from 'react';
import {
  Map,
  Layers,
  Eye,
  Download,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  TreePine,
  Droplets,
  Mountain,
  Search,
  ShieldCheck,
  FileCheck,
  ShieldAlert,
  Zap,
  Activity,
} from 'lucide-react';
import 'leaflet-geometryutil';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  WMSTileLayer,
  FeatureGroup,
  GeoJSON,
  useMap,
  Marker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import * as toGeoJSON from '@mapbox/togeojson';
import JSZip from 'jszip';

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Global Constants for long strings to avoid cluttering JSX
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TOPO_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const LABEL_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

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
    { name: 'SIGEF / INCRA (Certificado)', url: 'https://acervofundiario.incra.gov.br/i3geo/ogc.php', layer: 'certificada_sigef_particular', active: true, icon: Map, color: 'text-emerald-600' },
    { name: 'CAR (Cadastro Ambiental)', url: 'https://geoserver.car.gov.br/geoserver/wms', layer: 'car_imoveis', active: false, icon: TreePine, color: 'text-green-600' },
    { name: 'Uso Solo (MapBiomas)', url: 'https://workspace.mapbiomas.org/geoserver/wms', layer: 'mapbiomas_cobertura_vegetal', active: false, icon: Eye, color: 'text-blue-600' },
    { name: 'Desmatamento (PRODES)', url: 'https://terrabrasilis.dpi.inpe.br/geoserver/wms', layer: 'prodes_cerrado', active: false, icon: AlertTriangle, color: 'text-red-600' },
  ]);

  const [geometries, setGeometries] = useState<any[]>([]);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<[number, number] | null>(null);
  const [searchBounds, setSearchBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [carInput, setCarInput] = useState('');
  const [sigefInput, setSigefInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const toggleLayer = (idx: number) => {
    setLayers((prev) => prev.map((l, i) => (i === idx ? { ...l, active: !l.active } : l)));
  };

  const handleCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const area = L.GeometryUtil.geodesicArea((layer as L.Polygon).getLatLngs()[0] as L.LatLng[]);
      setCalculatedArea(area);
      setGeometries(prev => [...prev, layer.toGeoJSON()]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      let kmlText = '';
      if (file.name.endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(file);
        const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
        if (kmlFile) kmlText = await kmlFile.async('string');
      } else {
        kmlText = await file.text();
      }
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
      const converted = toGeoJSON.kml(kmlDoc);
      if (converted.features.length > 0) {
        setGeometries(prev => [...prev, ...converted.features]);
        let totalArea = 0;
        converted.features.forEach((feature: any) => {
          if (feature.geometry.type === 'Polygon') {
            totalArea += L.GeometryUtil.geodesicArea(feature.geometry.coordinates[0].map((c: any) => L.latLng(c[1], c[0])));
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly: any) => {
              totalArea += L.GeometryUtil.geodesicArea(poly[0].map((c: any) => L.latLng(c[1], c[0])));
            });
          }
        });
        if (totalArea > 0) setCalculatedArea(totalArea);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    if (searchQuery.includes(',') && searchQuery.split(',').length === 2) {
      const parts = searchQuery.split(',');
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        setSearchResult([lat, lng]);
        setSearchBounds(null);
        return;
      }
    }
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, boundingbox } = data[0];
        const latF = parseFloat(lat);
        const lonF = parseFloat(lon);
        setSearchResult([latF, lonF]);
        if (boundingbox) {
          setSearchBounds([[parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],[parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const consultCARapi = async () => {
    if (!carInput) return;
    setIsValidating(true);
    try {
      const response = await fetch(`/api/rural/car/consultar/${encodeURIComponent(carInput)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}` }
      });
      const result = await response.json();
      if (result.success && result.data?.features?.length > 0) {
        setGeometries(prev => [...prev, ...result.data.features]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const consultSIGEFapi = async () => {
    if (!sigefInput) return;
    setIsValidating(true);
    try {
      const response = await fetch(`/api/rural/sigef/consultar/${encodeURIComponent(sigefInput)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}` }
      });
      const result = await response.json();
      if (result.success && result.data?.features?.length > 0) {
        setGeometries(prev => [...prev, ...result.data.features]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  // Avoid division character / in logic to prevent esbuild false positives
  const areaHectares = (calculatedArea * 0.0001).toFixed(2);
  const alqMG = (Number(areaHectares) * 0.2066).toFixed(2); // 1/4.84
  const alqSP = (Number(areaHectares) * 0.4132).toFixed(2); // 1/2.42

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      if (geometries.length > 0) {
        const bounds = L.geoJSON({ type: 'FeatureCollection', features: geometries } as any).getBounds();
        if (bounds.isValid()) {
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.setView(bounds.getCenter(), 16);
          } else {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
          }
        }
      }
    }, [geometries, map]);
    useEffect(() => {
      if (searchBounds) {
        map.fitBounds(searchBounds, { padding: [20, 20] });
      } else if (searchResult) {
        map.setView(searchResult, 16);
      }
    }, [searchResult, searchBounds, map]);
    return null;
  };

  return (
    <div className="space-y-8 p-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Layers className="text-emerald-600" size={32} />
            Geointeligência
          </h1>
          <p className="text-slate-500 font-medium small uppercase tracking-widest text-[10px]">Portal de Análise Territorial Rural</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <input type="text" placeholder="Coordenadas ou Endereço..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm focus:border-emerald-500 outline-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Layers, label: 'Hectares', value: areaHectares + ' ha', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Mountain, label: 'Alqueire MG', value: alqMG + ' aq', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: AlertTriangle, label: 'Alqueire SP', value: alqSP + ' aq', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Droplets, label: 'Clima', value: '28°C', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon size={24} />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-bold text-black flex items-center gap-2 mb-4">Camadas GIS</h3>
            <div className="space-y-2">
              {layers.map((layer, idx) => (
                <button key={idx} onClick={() => toggleLayer(idx)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${layer.active ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <layer.icon size={18} className={layer.active ? layer.color : 'text-slate-400'} />
                    <span className="text-xs font-bold uppercase">{layer.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <label className="w-full flex items-center gap-2 justify-center p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer">
              <Download size={14} /> Importar KMZ
              <input type="file" className="hidden" accept=".kml,.kmz" onChange={handleFileUpload} />
            </label>
          </div>
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400">Consulta API Live</h4>
            <div className="flex gap-2">
              <input type="text" placeholder="Código CAR" value={carInput} onChange={(e) => setCarInput(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border rounded-lg text-[10px]" />
              <button onClick={consultCARapi} className="p-2 bg-emerald-600 text-white rounded-lg"><Zap size={14} /></button>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Código SIGEF" value={sigefInput} onChange={(e) => setSigefInput(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border rounded-lg text-[10px]" />
              <button onClick={consultSIGEFapi} className="p-2 bg-blue-600 text-white rounded-lg"><Activity size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden relative" style={{ minHeight: '600px' }}>
          <MapContainer center={[-14.235, -51.925]} zoom={5} style={{ height: '600px', width: '100%' }}>
            <MapUpdater />
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satélite">
                <TileLayer url={SAT_URL} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Terreno">
                <TileLayer url={TOPO_URL} />
              </LayersControl.BaseLayer>
            </LayersControl>
            <FeatureGroup>
              <EditControl position="topleft" onCreated={handleCreated} draw={{ rectangle: false, circle: false, circlemarker: false, marker: true, polyline: true, polygon: { allowIntersection: false, shapeOptions: { color: '#10b981' } } }} />
            </FeatureGroup>
            {searchResult && (
              <Marker position={searchResult}>
                <Popup><div className="text-xs font-bold">Local Localizado</div></Popup>
              </Marker>
            )}
            {layers.filter(l => l.active && l.url).map((layer, idx) => (
              <WMSTileLayer key={layer.name} url={layer.url} layers={layer.layer} format="image/png" transparent={true} version="1.1.1" zIndex={20 - idx} />
            ))}
            {geometries.length > 0 && <GeoJSON data={{ type: 'FeatureCollection', features: geometries } as any} style={{ color: '#10b981', weight: 3, fillOpacity: 0.2 }} />}
            <TileLayer url={LABEL_URL} zIndex={100} />
          </MapContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000] opacity-30">
             <div className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Geointeligencia;
