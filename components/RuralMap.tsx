import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  LayersControl,
  WMSTileLayer,
  useMap,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RuralMapProps {
  onPolygonCreated?: (geoJson: any) => void;
  initialGeoJson?: any;
  height?: string;
  className?: string;
}

const ZoomToData: React.FC<{ data: any }> = ({ data }) => {
  const map = useMap();
  useEffect(() => {
    if (data) {
      const layer = L.geoJSON(data);
      map.fitBounds(layer.getBounds());
    }
  }, [data, map]);
  return null;
};

const RuralMap: React.FC<RuralMapProps> = ({
  onPolygonCreated,
  initialGeoJson,
  height = '400px',
  className,
}) => {
  const [geoJson, setGeoJson] = useState(initialGeoJson);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const _onCreate = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const data = layer.toGeoJSON();
      setGeoJson(data);
      if (onPolygonCreated) onPolygonCreated(data);
    }
  };

  const _onEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const data = layer.toGeoJSON();
      setGeoJson(data);
      if (onPolygonCreated) onPolygonCreated(data);
    });
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={[-15.793889, -47.882778]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite (Google)">
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
          </LayersControl.BaseLayer>

          {/* WMS Layers - Official Brazil Data */}
          <LayersControl.Overlay name="SIGEF (Parcelas Certificadas)">
            <WMSTileLayer
              url="https://sigef.incra.gov.br/geo/wms"
              layers="parcela_certificada_sigef"
              format="image/png"
              transparent={true}
              version="1.1.1"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="CAR (Imóveis Rurais)">
            <WMSTileLayer
              url="https://geoserver.mma.gov.br/geoserver/mma/wms"
              layers="mma:car_imoveis"
              format="image/png"
              transparent={true}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={_onCreate}
            onEdited={_onEdited}
            draw={{
              rectangle: false,
              circle: false,
              polyline: false,
              circlemarker: false,
              marker: false,
            }}
          />
        </FeatureGroup>

        {geoJson && <ZoomToData data={geoJson} />}
      </MapContainer>
    </div>
  );
};

export default RuralMap;
