import JSZip from 'jszip';
import { kml } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';

/**
 * Service to handle KMZ/KML parsing and GeoJSON normalization
 */
export class KMZService {
  /**
   * Parse a KMZ file buffer and return a GeoJSON FeatureCollection
   */
  static async parseKMZ(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const kmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.kml'));
      
      if (!kmlFile) {
        throw new Error('Nenhum arquivo KML encontrado dentro do KMZ.');
      }

      const kmlText = await kmlFile.async('string');
      return this.parseKML(kmlText);
    } catch (error) {
      console.error('[KMZService] Error parsing KMZ:', error);
      throw error;
    }
  }

  /**
   * Parse raw KML string to GeoJSON
   */
  static parseKML(kmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const geojson = kml(xmlDoc);

    if (!geojson.features || geojson.features.length === 0) {
      throw new Error('O arquivo KML não contém geometrias válidas.');
    }

    // Filter and normalize only Polygons and MultiPolygons
    const polygons = geojson.features.filter(f => 
      ['Polygon', 'MultiPolygon'].includes(f.geometry?.type)
    );

    if (polygons.length === 0) {
      throw new Error('O arquivo deve conter ao menos um Polígono ou MultiPolígono.');
    }

    return {
      type: 'FeatureCollection',
      features: polygons
    };
  }

  /**
   * Helper to merge multiple features into a single MultiPolygon if needed for the core area
   */
  static toMultiPolygon(featureCollection) {
    const coordinates = [];
    featureCollection.features.forEach(f => {
      if (f.geometry.type === 'Polygon') {
        coordinates.push(f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiPolygon') {
        coordinates.push(...f.geometry.coordinates);
      }
    });

    return {
      type: 'MultiPolygon',
      coordinates
    };
  }
}
