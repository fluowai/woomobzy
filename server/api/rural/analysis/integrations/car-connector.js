import axios from 'axios';
import pRetry from 'p-retry';

export class CARConnector {
  static API_URL = 'https://geoserver.car.gov.br/geoserver/wfs';

  /**
   * Fetch intersecting CAR polygons from the official WFS server
   */
  static async fetchByBbox(bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    
    // WFS Request Parameters
    const params = {
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: 'car_imoveis',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      bbox: `${minLat},${minLng},${maxLat},${maxLng},EPSG:4326`
    };

    return pRetry(async () => {
      const response = await axios.get(this.API_URL, { params, timeout: 15000 });
      return response.data;
    }, { retries: 2 });
  }

  /**
   * Concept: Fetch using CQL filter (ST_Intersects) for more precision if the server allows
   */
  static async fetchByGeometry(wktGeometry) {
    const params = {
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: 'car_imoveis',
      outputFormat: 'application/json',
      cql_filter: `INTERSECTS(geometria, ${wktGeometry})`
    };
    // ... similar axios call
  }
}
