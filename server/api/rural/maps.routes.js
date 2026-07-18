import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { AgroIntelligenceService } from '../../services/AgroIntelligence.js';
import {
  extractLatLngFromGoogleMapsUrl,
  reverseGeocode,
  calculateConfidence,
} from '../../utils/geoUtils.js';
import { SicarService } from '../../services/sicarService.js';

const router = Router();

router.post('/geoprocess', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lat, lon, code, name } = req.body;

    if (!lat && !lon && !code && !name) {
      return res.status(400).json({
        success: false,
        error:
          'Forneca ao menos um criterio de busca (coordenadas, codigo ou nome).',
      });
    }

    const result = await AgroIntelligenceService.geoprocessProperty({
      lat,
      lon,
      code,
      name,
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Geoprocess route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  '/find-car-by-location',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    const {
      googleMapsUrl,
      lat: inputLat,
      lng: inputLng,
      radiusFallbackMeters,
      forceUf,
    } = req.body;
    const startTime = Date.now();
    let lat = inputLat;
    let lng = inputLng;

    try {
      if (googleMapsUrl && (!lat || !lng)) {
        const coords = await extractLatLngFromGoogleMapsUrl(googleMapsUrl);
        if (!coords) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'Nao foi possivel extrair coordenadas do link informado.',
            });
        }
        lat = coords.lat;
        lng = coords.lng;
      }

      if (!lat || !lng) {
        return res
          .status(400)
          .json({
            success: false,
            error: 'Latitude e Longitude sao obrigatorios.',
          });
      }

      let locationInfo = { uf: forceUf, municipality: null, method: 'manual' };
      if (!forceUf) {
        const geoInfo = await reverseGeocode(lat, lng);
        if (geoInfo) {
          locationInfo = { ...geoInfo, method: 'reverse_geocoding' };
        }
      }

      const ufsToTry = locationInfo.uf
        ? [locationInfo.uf]
        : ['MT', 'GO', 'MS', 'PA', 'TO', 'BA', 'MG'];
      let matches = [];
      let matchMode = 'none';
      let queriedUf = null;

      for (const uf of ufsToTry) {
        matches = await SicarService.findByPoint(uf, lat, lng);
        if (matches.length > 0) {
          matchMode = 'contains_point';
          queriedUf = uf;
          break;
        }

        const raios = radiusFallbackMeters || [500, 1000, 5000];
        for (const radius of raios) {
          matches = await SicarService.findByRadius(uf, lat, lng, radius);
          if (matches.length > 0) {
            matchMode = 'nearby_radius';
            queriedUf = uf;
            matches = matches.map((m) => ({ ...m, distanceMeters: radius }));
            break;
          }
        }
        if (matches.length > 0) break;
      }

      const confidence = calculateConfidence(
        matches,
        matchMode,
        locationInfo.uf === queriedUf
      );

      const formattedMatches = matches.map((f) => ({
        codImovel: f.properties.cod_imovel,
        areaHa: f.properties.num_area || null,
        status: f.properties.ind_status || null,
        municipio: f.properties.nom_munici || null,
        uf: f.properties.cod_estado || null,
        sourceLayer: SicarService.getLayerName(queriedUf),
        matchMode: matchMode,
        confidence: confidence,
        distanceMeters: f.distanceMeters || 0,
        geometry: f.geometry,
        rawProperties: f.properties,
      }));

      const supabase = getSupabaseServer();
      supabase
        .from('rural_location_search_logs')
        .insert({
          user_id: req.user.id,
          organization_id: req.orgId,
          google_maps_url: googleMapsUrl,
          lat,
          lng,
          uf: locationInfo.uf,
          municipality: locationInfo.municipality,
          source_layer: SicarService.getLayerName(queriedUf),
          match_mode: matchMode,
          confidence: confidence,
          total_matches: formattedMatches.length,
          response_summary: { duration: Date.now() - startTime },
        })
        .then(
          ({ error }) =>
            error && console.error('[Log] Erro ao salvar busca:', error.message)
        );

      res.json({
        success: true,
        input: { googleMapsUrl, lat, lng },
        location: locationInfo,
        matchMode,
        confidence,
        totalMatches: formattedMatches.length,
        matches: formattedMatches,
      });
    } catch (error) {
      console.error('[CARSearch] Erro critico:', error);
      res
        .status(500)
        .json({
          success: false,
          error: 'Erro interno ao processar busca de localizacao.',
          message: error.message,
        });
    }
  }
);

export default router;
