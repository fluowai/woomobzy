import { AnalysisService } from './service.js';

export class AnalysisController {
  /**
   * POST /api/rural/analysis/kmz
   */
  static async uploadKMZ(req, res) {
    try {
      const file = req.file;
      const { organizationId } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId é obrigatório.' });
      }

      const result = await AnalysisService.startKMZAnalysis(
        organizationId,
        file.originalname,
        file.buffer
      );

      res.status(202).json(result);
    } catch (error) {
      console.error('[AnalysisController] Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/rural/analysis/status/:jobId
   */
  static async checkStatus(req, res) {
    // Implement Status Check logic fetching from rural_analysis table
    res.json({ status: 'feature_pending' });
  }
}
