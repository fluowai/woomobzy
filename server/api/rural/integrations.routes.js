import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { IntegracaoConectaGov } from '../../services/integracaoConectaGov.js';
import { IntegracaoIbamaEmbargos } from '../../services/integracaoIbamaEmbargos.js';
import { IntegracaoTerraBrasilis } from '../../services/integracaoTerraBrasilis.js';
import { IntegracaoMapBiomas } from '../../services/integracaoMapBiomas.js';
import { IntegracaoIbgeSidra } from '../../services/integracaoIbgeSidra.js';

const router = Router();

router.get('/consultarProdes/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoTerraBrasilis.consultarProdes(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consultarEmbargos/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoIbamaEmbargos.consultarEmbargosPorCoordenada(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consultarMapBiomas/:lat/:lng', verifyAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(400).json({ error: 'Coordenadas invalidas' });
    }
    const data = await IntegracaoMapBiomas.consultarUsoSolo(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/producaoAgricola/:codigoIbge', verifyAuth, async (req, res) => {
  try {
    const codigoIbge = req.params.codigoIbge;
    if (!codigoIbge || codigoIbge.length < 7) {
      return res.status(400).json({ error: 'Codigo IBGE invalido' });
    }
    const data = await IntegracaoIbgeSidra.enrichPropertyWithIbge(codigoIbge);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consultarSNCR/:codigo', verifyAuth, async (req, res) => {
  try {
    const data = await IntegracaoConectaGov.consultarSNCR(req.params.codigo);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
