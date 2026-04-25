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
} from 'lucide-react';
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
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    {
      name: 'SIGEF / INCRA (Certificado)',
      url: 'https://acervofundiario.incra.gov.br/i3geo/ogc.php',
      layer: 'sigef_particular',
      active: true,
      icon: Map,
      color: 'text-emerald-600',
    },
    {
      name: 'CAR (Cadastro Ambiental)',
      url: 'https://geoservicos.mma.gov.br/geoserver/wms',
      layer: 'mma:car_imoveis',
      active: false,
      icon: TreePine,
      color: 'text-green-600',
    },
    {
      name: 'Uso Solo (MapBiomas)',
      url: 'https://geoscenes.mapbiomas.org/geoserver/wms',
      layer: 'mapbiomas-brazil:mapbiomas_cobertura_vegetal',
      active: false,
      icon: Eye,
      color: 'text-blue-600',
    },
    {
      name: 'Desmatamento (PRODES)',
      url: 'http://terrabrasilis.dpi.inpe.br/geoserver/gwc/service/wms',
      layer: 'prodes_cerrado',
      active: false,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ]);

  const [geometries, setGeometries] = useState<any[]>([]);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<[number, number] | null>(null);

  const toggleLayer = (idx: number) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, active: !l.active } : l))
    );
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
        if (kmlFile) {
          kmlText = await kmlFile.async('string');
        }
      } else {
        kmlText = await file.text();
      }

      const parser = new DOMParser();
      const kml = parser.parseFromString(kmlText, 'text/xml');
      const converted = toGeoJSON.kml(kml);
      
      if (converted.features.length > 0) {
        setGeometries(prev => [...prev, ...converted.features]);
        
        // Calculate area for imported polygons
        let totalArea = 0;
        converted.features.forEach((feature: any) => {
          if (feature.geometry.type === 'Polygon') {
            const area = L.GeometryUtil.geodesicArea(
              feature.geometry.coordinates[0].map((c: any) => L.latLng(c[1], c[0]))
            );
            totalArea += area;
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly: any) => {
              const area = L.GeometryUtil.geodesicArea(
                poly[0].map((c: any) => L.latLng(c[1], c[0]))
              );
              totalArea += area;
            });
          }
        });
        
        if (totalArea > 0) setCalculatedArea(totalArea);
        
        console.log('Imported geometries:', converted.features);
        alert(`Sucesso! ${converted.features.length} elementos importados.`);
      } else {
        alert('Nenhum elemento geográfico encontrado no arquivo.');
      }
    } catch (err) {
      console.error('Error parsing KML/KMZ', err);
      alert('Erro ao processar arquivo. Verifique se é um KML ou KMZ válido.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setSearchResult([parseFloat(lat), parseFloat(lon)]);
        console.log('Search found:', display_name, [lat, lon]);
      } else {
        alert('Localização não encontrada. Tente termos menos específicos.');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const areaInHectares = (calculatedArea / 10000).toFixed(2);
  const areaInAlqueireMG = (Number(areaInHectares) / 4.84).toFixed(2);
  const areaInAlqueireSP = (Number(areaInHectares) / 2.42).toFixed(2);

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      if (geometries.length > 0) {
        const bounds = L.geoJSON({ type: 'FeatureCollection', features: geometries } as any).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }, [geometries, map]);

    useEffect(() => {
      if (searchResult) {
        map.setView(searchResult, 15);
      }
    }, [searchResult, map]);

    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Layers className="text-emerald-600" size={32} />
            Geointeligência
          </h1>
          <p className="text-black/60 font-medium">
            Camadas GIS, sobreposição ambiental e histórico de uso do solo.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative group w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar fazenda, cidade ou coordenadas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm focus:border-emerald-500 outline-none transition-all shadow-sm group-hover:shadow-md"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <button 
            disabled={isSearching}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
          >
            {isSearching ? '...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            icon: Layers,
            label: 'Hectares Calculados',
            value: areaInHectares + ' ha',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: Mountain,
            label: 'Alqueire Mineiro',
            value: areaInAlqueireMG + ' aq',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            icon: AlertTriangle,
            label: 'Alqueire Paulista',
            value: areaInAlqueireSP + ' aq',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: Droplets,
            label: 'Clima Hoje',
            value: '28°C / Sol',
            color: 'text-orange-600',
            bg: 'bg-orange-50',
          },
        ].map((stat, idx) => (
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
                  layer.active
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <layer.icon
                    size={18}
                    className={layer.active ? layer.color : 'text-slate-400'}
                  />
                  <span
                    className={`text-sm font-medium ${layer.active ? 'text-black' : 'text-slate-500'}`}
                  >
                    {layer.name}
                  </span>
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
            <label className="w-full flex items-center gap-2 justify-center p-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
              <Download size={16} /> {isUploading ? 'Processando...' : 'Importar KMZ / KML'}
              <input type="file" className="hidden" accept=".kml,.kmz" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button className="w-full flex items-center gap-2 justify-center p-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
              <Download size={16} /> Exportar Mapa (PDF)
            </button>
            <button className="w-full flex items-center gap-2 justify-center p-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
              <Eye size={16} /> Ver Histórico de Uso
            </button>
          </div>
        </div>

        {/* Map */}
        <div
          className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ minHeight: '600px' }}
        >
          <MapContainer
            center={[-14.235, -51.925]}
            zoom={5}
            style={{ height: '600px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapUpdater />
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
            
            <FeatureGroup>
              <EditControl
                position="topleft"
                onCreated={handleCreated}
                draw={{
                  rectangle: false,
                  circle: false,
                  circlemarker: false,
                  marker: true,
                  polyline: true,
                  polygon: {
                    allowIntersection: false,
                    drawError: { color: '#e1e100', message: 'Assinatura inválida!' },
                    shapeOptions: { color: '#10b981' }
                  }
                }}
              />
            </FeatureGroup>

            {searchResult && (
              <Marker position={searchResult}>
                <Popup>
                  <div className="font-bold text-emerald-900 italic">LOCAL LOCALIZADO</div>
                  <div className="text-xs text-slate-600">{searchQuery}</div>
                </Popup>
              </Marker>
            )}

            {layers.filter(l => l.active && l.url).map(layer => (
              <WMSTileLayer
                key={layer.name}
                url={layer.url}
                layers={layer.layer}
                format="image/png"
                transparent={true}
              />
            ))}

            {geometries.length > 0 && (
              <GeoJSON 
                data={{ type: 'FeatureCollection', features: geometries } as any}
                style={{ color: '#10b981', weight: 3, fillOpacity: 0.2 }}
              />
            )}

            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default Geointeligencia;
