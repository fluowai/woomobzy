import { KMZService } from './kmz-service.js';
import { RuralRepository } from './repository.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import PDFDocument from 'pdfkit';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const analysisQueue = new Queue('rural-analysis', { connection });

export class AnalysisService {
  /**
   * Handle the KMZ upload and initiate analysis
   */
  static async startKMZAnalysis(organizationId, filename, buffer) {
    // 1. Parse KMZ to GeoJSON
    const featureCollection = await KMZService.parseKMZ(buffer);
    const multiPolygon = KMZService.toMultiPolygon(featureCollection);

    // 2. Save Original Perimeter to PostGIS
    const area = await RuralRepository.createArea({
      organizationId,
      name: filename,
      geojson: multiPolygon
    });

    // 3. Create Analysis Record (Pending)
    const analysis = await RuralRepository.createAnalysis(area.id);

    // 4. Queue Heavy Spatial Processing
    await analysisQueue.add('process-analysis', {
      analysisId: analysis.id,
      areaId: area.id,
      organizationId,
      geometry: multiPolygon
    });

    return {
      success: true,
      jobId: analysis.id,
      area_id: area.id,
      initial_area_ha: area.area_ha,
      status: 'processing'
    };
  }

  /**
   * Get Current Status of Analysis
   */
  static async getAnalysisStatus(analysisId) {
    return await RuralRepository.getAnalysisById(analysisId);
  }

  /**
   * Generate Professional PDF Report
   */
  static async generatePDFReport(analysisId) {
    const analysis = await this.getAnalysisStatus(analysisId);
    if (!analysis || analysis.status !== 'completed') {
      throw new Error('Relatório não disponível ou em processamento.');
    }

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      let chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // --- PDF CONTENT ---
      doc.fillColor('#10b981').fontSize(26).text('LAUDO DE INTELIGÊNCIA RURAL', { align: 'center' });
      doc.moveDown();
      doc.fillColor('#64748b').fontSize(10).text(`ID DA ANÁLISE: ${analysisId}`, { align: 'center' });
      doc.moveDown(2);

      // Status Summary
      doc.fillColor('#000000').fontSize(16).text('Resumo da Análise');
      doc.rect(50, doc.y, 500, 2).fill('#10b981');
      doc.moveDown();

      const report = analysis.report || {};
      doc.fontSize(12).text(`Área Total: ${report.area_total_ha?.toFixed(2)} ha`);
      doc.text(`Score de Viabilidade: ${analysis.score}/100`);
      doc.text(`Nível de Risco: ${analysis.risk_level?.toUpperCase()}`);
      doc.moveDown();

      // CAR Integration
      doc.fontSize(14).text('Conformidade Fundiária (CAR)');
      doc.fontSize(12).text(`Cadastro Encontrado: ${report.car?.encontrado ? 'SIM' : 'NÃO'}`);
      doc.text(`Área de Sobreposição: ${report.car?.area_sobreposta?.toFixed(2)} ha`);
      doc.moveDown();

      // Environmental Integration
      doc.fontSize(14).text('Análise Ambiental (INTELECTO AGRO)');
      doc.fontSize(12).text(`Status Sócio-Ambiental: ${report.ambiental?.status}`);
      doc.text(`Score de Alerta: ${report.ambiental?.score_risco}`);
      
      doc.moveDown();
      doc.fillColor('#ef4444').fontSize(10);
      if (report.ambiental?.findings?.length > 0) {
        report.ambiental.findings.forEach(f => doc.text(`• ${f}`));
      } else {
        doc.fillColor('#10b981').text('✓ Nenhum alerta ambiental detectado via agrobr.');
      }

      doc.moveDown(4);
      doc.fillColor('#64748b').fontSize(8).text('Documento gerado automaticamente pelo Sistema IMOBZY Rural.', { align: 'right' });
      doc.text(`Data: ${new Date().toLocaleString()}`, { align: 'right' });

      doc.end();
    });
  }
}
