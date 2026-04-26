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
   * GET /api/rural/analysis/status/:analysisId
   */
  static async checkStatus(req, res) {
    try {
      const { analysisId } = req.params;
      const analysis = await AnalysisService.getAnalysisStatus(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Análise não encontrada.' });
      }

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/rural/analysis/report/:analysisId/pdf
   */
  static async downloadPDF(req, res) {
    try {
      const { analysisId } = req.params;
      const pdfBuffer = await AnalysisService.generatePDFReport(analysisId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_rural_${analysisId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
