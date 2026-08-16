import os
import requests
import json
import base64
import zipfile
import io
from typing import Optional, Dict, Any, List
import simplekml
import geopandas as gpd
from shapely.geometry import shape, Point, mapping
from shapely.ops import orient

class GeoProcessor:
    SIGEF_WFS_URL = "https://geoinfo.incra.gov.br/geoserver/wfs"
    CAR_WFS_URL = "https://geoserver.car.gov.br/geoserver/wfs"

    @staticmethod
    def fetch_wfs(url: str, type_name: str, cql_filter: str) -> Optional[Dict[str, Any]]:
        params = {
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetFeature",
            "typeName": type_name,
            "outputFormat": "application/json",
            "cql_filter": cql_filter
        }
        try:
            response = requests.get(url, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if data.get("features") and len(data["features"]) > 0:
                    return data
            return None
        except Exception as e:
            print(f"Error fetching WFS from {url}: {e}")
            return None

    @classmethod
    def resolve_by_coordinate(cls, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        # Try SIGEF first
        cql = f"INTERSECTS(geom, POINT({lon} {lat}))"
        data = cls.fetch_wfs(cls.SIGEF_WFS_URL, "incra:certificada_sigef_particular", cql)
        if data:
            return {"source": "SIGEF", "data": data["features"][0]}

        # Try CAR
        cql = f"INTERSECTS(shape, POINT({lon} {lat}))"
        data = cls.fetch_wfs(cls.CAR_WFS_URL, "car_imoveis", cql)
        if data:
            return {"source": "CAR", "data": data["features"][0]}
        
        return None

    @classmethod
    def resolve_by_code(cls, code: str) -> Optional[Dict[str, Any]]:
        # SIGEF
        cql = f"cod_imovel='{code}'"
        data = cls.fetch_wfs(cls.SIGEF_WFS_URL, "incra:certificada_sigef_particular", cql)
        if data:
            return {"source": "SIGEF", "data": data["features"][0]}

        # CAR
        cql = f"cod_imovel='{code}'"
        data = cls.fetch_wfs(cls.CAR_WFS_URL, "car_imoveis", cql)
        if data:
            return {"source": "CAR", "data": data["features"][0]}

        return None

    @classmethod
    def resolve_by_name(cls, name: str) -> Optional[Dict[str, Any]]:
        # Fuzzy search via CQL (ILIKE)
        cql = f"nome_imove ILIKE '%{name}%'"
        data = cls.fetch_wfs(cls.SIGEF_WFS_URL, "incra:certificada_sigef_particular", cql)
        if data:
            return {"source": "SIGEF", "data": data["features"][0]}

        cql = f"nm_imovel ILIKE '%{name}%'"
        data = cls.fetch_wfs(cls.CAR_WFS_URL, "car_imoveis", cql)
        if data:
            return {"source": "CAR", "data": data["features"][0]}

        return None

    @staticmethod
    def generate_kml_kmz(feature: Dict[str, Any], source: str) -> Dict[str, Any]:
        props = feature.get("properties", {})
        geometry = feature.get("geometry")
        
        if not geometry:
            raise ValueError("Feature has no geometry")

        # Normalize property names based on source
        name = props.get("nome_imove") or props.get("nm_imovel") or "Fazenda Sem Nome"
        municipio = props.get("municipio") or props.get("nm_municip") or "N/A"
        estado = props.get("uf") or props.get("sigla_uf") or "N/A"
        area_doc = props.get("area_refer") or props.get("num_area") or 0.0
        
        # Calculate real area using geodesy (WGS84 -> UTM or similar)
        # For simplicity here we use geopandas
        geom_obj = shape(geometry)
        gdf = gpd.GeoDataFrame([{'geometry': geom_obj}], crs="EPSG:4326")
        # Area in hectares
        area_calc = gdf.to_crs(gdf.estimate_utm_crs()).area.iloc[0] / 10000.0

        # KML Structure
        kml = simplekml.Kml()
        fol = kml.newfolder(name=name)
        
        # Add main polygon
        if geometry['type'] == 'Polygon':
            pol = fol.newpolygon(name=name)
            pol.outerboundaryis = geometry['coordinates'][0]
            if len(geometry['coordinates']) > 1:
                pol.innerboundaryis = geometry['coordinates'][1:]
        elif geometry['type'] == 'MultiPolygon':
            for i, poly_coords in enumerate(geometry['coordinates']):
                pol = fol.newpolygon(name=f"{name} - Gleba {i+1}")
                pol.outerboundaryis = poly_coords[0]
                if len(poly_coords) > 1:
                    pol.innerboundaryis = poly_coords[1:]
        else:
            # Fallback for point or other types
            centroid = geom_obj.centroid
            fol.newpoint(name=name, coords=[(centroid.x, centroid.y)])

        description = (
            f"<b>Propriedade:</b> {name}<br/>"
            f"<b>Município:</b> {municipio} - {estado}<br/>"
            f"<b>Área Documentada:</b> {area_doc:.2f} ha<br/>"
            f"<b>Área Calculada:</b> {area_calc:.2f} ha<br/>"
            f"<b>Fonte:</b> {source}<br/>"
            f"<b>Código:</b> {props.get('cod_imovel', 'N/A')}"
        )
        
        # Apply description to all placemarks in folder
        for p in fol.features:
            p.description = description
            p.style.polystyle.color = '4D00FF00' # Green semi-transparent
            p.style.linestyle.color = 'FF00FF00' # Green solid border
            p.style.linestyle.width = 2

        kml_str = kml.kml()
        
        # KMZ Generation
        kmz_io = io.BytesIO()
        with zipfile.ZipFile(kmz_io, 'w', zipfile.ZIP_DEFLATED) as kmz:
            kmz.writestr("doc.kml", kml_str)
        
        kmz_bytes = kmz_io.getvalue()
        
        return {
            "success": True,
            "kml_content": kml_str,
            "kmz_base64": base64.b64encode(kmz_bytes).decode('utf-8'),
            "area_hectares": area_calc,
            "source": source,
            "location": {
                "municipio": municipio,
                "estado": estado
            },
            "properties": props
        }

    @classmethod
    def process(cls, lat: Optional[float] = None, lon: Optional[float] = None, 
                code: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
        
        result = None
        if lat is not None and lon is not None:
            result = cls.resolve_by_coordinate(lat, lon)
        elif code:
            result = cls.resolve_by_code(code)
        elif name:
            result = cls.resolve_by_name(name)

        if not result:
            return {"success": False, "error": "Nenhum imóvel encontrado com os critérios fornecidos."}

        try:
            processed = cls.generate_kml_kmz(result["data"], result["source"])
            return processed
        except Exception as e:
            return {"success": False, "error": f"Erro ao processar geometria: {str(e)}"}
