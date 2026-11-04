import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  isRuralProperty,
  applyRuralFilter,
} from '../../utils/propertyNiche.js';
import PDFDocument from 'pdfkit';
import { isValidUUID } from '../../lib/shared-utils.js';
import { ruralPropertiesQuery } from './legal.routes.js';

const router = Router();

async function fetchPdfImageBuffer(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/png,image/jpeg,image/jpg,*/*' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('svg')) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn('[Rural PDF] Logo unavailable:', error.message);
    return null;
  }
}

router.get(
  '/dossier/:propertyId/pdf',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade invalido' });
      }

      const supabase = getSupabaseServer();
      const { data: property } = await ruralPropertiesQuery(supabase, req.orgId)
        .eq('id', req.params.propertyId)
        .single();

      if (!property || !isRuralProperty(property)) {
        return res
          .status(404)
          .json({ error: 'Propriedade rural nao encontrada' });
      }

      const { data: documents } = await supabase
        .from('documents')
        .select(
          'document_type, status, validation_status, validation_score, created_at'
        )
        .eq('organization_id', req.orgId)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      const features = property.features || {};
      const legal = features.legal || {};
      const technical = features.rural_technical || {};
      const dueDiligence = features.rural_due_diligence || {};
      const enrichment = features.rural_enrichment || {};
      const valuation = features.rural_valuation || {};
      const areaHa = Number(
        property.total_area_ha ||
          features.areaHectares ||
          technical.measured_area_ha ||
          0
      );
      const price = Number(property.price || 0);
      const pricePerHa = areaHa > 0 ? price / areaHa : 0;
      const { data: siteSettings } = await supabase
        .from('site_settings')
        .select('agency_name, logo_url, primary_color')
        .eq('organization_id', req.orgId)
        .maybeSingle();
      const logoBuffer = await fetchPdfImageBuffer(siteSettings?.logo_url);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dossie-rural-${property.id}.pdf"`
      );

      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      doc.pipe(res);
      const brandColor = siteSettings?.primary_color || '#065f46';
      const brandName = siteSettings?.agency_name || 'WooTech Imob Rural';
      const headerTop = doc.y;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 48, headerTop, {
            fit: [120, 54],
            align: 'left',
            valign: 'center',
          });
        } catch (error) {
          console.warn('[Rural PDF] Logo render failed:', error.message);
        }
      }
      doc
        .fillColor(brandColor)
        .fontSize(10)
        .text(brandName, 190, headerTop, { align: 'right' });
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .text(
          `Gerado em ${new Date().toLocaleString('pt-BR')}`,
          190,
          headerTop + 16,
          { align: 'right' }
        );
      doc
        .moveTo(48, headerTop + 66)
        .lineTo(547, headerTop + 66)
        .strokeColor('#d1d5db')
        .stroke();
      doc.y = headerTop + 84;
      doc.fillColor(brandColor).fontSize(24).text('Dossie Rural 360');
      doc.moveDown(0.3);
      doc
        .fillColor('#111827')
        .fontSize(18)
        .text(property.title || 'Propriedade rural');
      doc.moveDown();

      const addSection = (title, rows) => {
        doc.fillColor(brandColor).fontSize(14).text(title);
        doc.moveDown(0.3);
        for (const [label, value] of rows) {
          doc
            .fillColor('#374151')
            .fontSize(10)
            .text(`${label}: `, { continued: true });
          doc.fillColor('#111827').text(String(value ?? '-'));
        }
        doc.moveDown();
      };

      addSection('Resumo Comercial', [
        ['Tipo', property.property_type || 'Rural'],
        ['Status', property.status || '-'],
        [
          'Preco',
          price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        ],
        ['Area', `${areaHa.toLocaleString('pt-BR')} ha`],
        [
          'Preco por hectare',
          pricePerHa.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
        ],
        [
          'Localizacao',
          [property.city, property.state].filter(Boolean).join(' / ') || '-',
        ],
      ]);
      addSection('Cadastro Tecnico', [
        ['Bioma', technical.bioma || '-'],
        ['Solo', technical.tipo_solo || features.tipoSolo || '-'],
        ['Topografia', technical.topografia || features.topography || '-'],
        ['Aptidao', technical.aptidao || '-'],
        [
          'Area agricultavel',
          technical.area_agricultavel
            ? `${technical.area_agricultavel} ha`
            : '-',
        ],
        [
          'Area de reserva',
          technical.area_reserva ? `${technical.area_reserva} ha` : '-',
        ],
        ['Score tecnico/liquidez', technical.score_liquidez ?? '-'],
      ]);
      addSection('Documentacao Rural', [
        ['CAR', legal.carNumber || 'Nao cadastrado'],
        ['CCIR', legal.ccirNumber || 'Nao cadastrado'],
        ['SIGEF/GEO', legal.geoNumber || 'Nao cadastrado'],
        ['ITR/NIRF', legal.itrNumber || legal.nirf || 'Nao cadastrado'],
        ['Score de risco', dueDiligence.validation?.riskScore ?? '-'],
        ['Nivel de risco', dueDiligence.validation?.riskLevel || '-'],
      ]);
      const farmEnrich = enrichment.car ? enrichment : null;

      addSection('Dados do CAR', [
        [
          'Codigo CAR',
          farmEnrich
            ? farmEnrich.car.codigo
            : legal.carNumber || 'Nao cadastrado',
        ],
        ['Status', farmEnrich ? farmEnrich.car.status : legal.carStatus || '-'],
        [
          'Area CAR (ha)',
          farmEnrich
            ? `${farmEnrich.car.area_ha.toFixed(2)}`
            : `${areaHa.toFixed(2)}`,
        ],
        [
          'Municipio/UF',
          farmEnrich
            ? `${farmEnrich.car.municipio || ''}/${farmEnrich.car.uf || ''}`
            : [property.city, property.state].filter(Boolean).join(' / ') ||
              '-',
        ],
        [
          'Centroide',
          farmEnrich?.car?.centroide
            ? `${farmEnrich.car.centroide.lat.toFixed(6)}, ${farmEnrich.car.centroide.lng.toFixed(6)}`
            : enrichment.centroid
              ? `${Number(enrichment.centroid.lat).toFixed(6)}, ${Number(enrichment.centroid.lng).toFixed(6)}`
              : '-',
        ],
      ]);

      if (farmEnrich?.incra) {
        addSection('Dados INCRA/SNCR', [
          [
            'Classificacao fundiaria',
            farmEnrich.incra.classificacao_fundiaria || '-',
          ],
          [
            'Modulos fiscais',
            farmEnrich.incra.modulos_fiscais
              ? String(farmEnrich.incra.modulos_fiscais)
              : '-',
          ],
          [
            'Area registrada',
            farmEnrich.incra.area_registrada_ha
              ? `${farmEnrich.incra.area_registrada_ha.toFixed(2)} ha`
              : '-',
          ],
          ['Situacao', farmEnrich.incra.situacao || '-'],
          [
            'Titulares',
            Array.isArray(farmEnrich.incra.titulares)
              ? farmEnrich.incra.titulares.map((t) => t.nome).join(', ')
              : '-',
          ],
        ]);
      }

      if (farmEnrich?.sicar_temas) {
        const st = farmEnrich.sicar_temas;
        addSection('Uso do Solo (SICAR Tema)', [
          ['Reserva legal', `${st.reserva_legal_ha.toFixed(2)} ha`],
          ['APP', `${st.app_ha.toFixed(2)} ha`],
          ['Vegetacao nativa', `${st.vegetacao_nativa_ha.toFixed(2)} ha`],
          ['Uso consolidado', `${st.uso_consolidado_ha.toFixed(2)} ha`],
          [
            'Area a recompor',
            st.area_recompor_ha > 0
              ? `${st.area_recompor_ha.toFixed(2)} ha`
              : 'N/A',
          ],
        ]);
      }

      if (farmEnrich?.ambiental) {
        const amb = farmEnrich.ambiental;
        const rowsAmb = [];
        if (amb.prodes?.possui_desmatamento !== null) {
          rowsAmb.push([
            'Desmatamento PRODES',
            amb.prodes.possui_desmatamento
              ? `SIM (${amb.prodes.area_desmatada_ha.toFixed(2)}ha em ${amb.prodes.ano_referencia})`
              : 'NAO detectado',
          ]);
        }
        if (amb.deter?.total_alertas !== null) {
          rowsAmb.push([
            'Alertas DETER (30 dias)',
            String(amb.deter.total_alertas),
          ]);
        }
        if (amb.embargos?.total_embargos !== null) {
          rowsAmb.push([
            'Embargos IBAMA (raio)',
            `${amb.embargos.total_embargos} (${amb.embargos.area_total_embargada_ha.toFixed(2)}ha)`,
          ]);
        }
        if (amb.mapbiomas) {
          rowsAmb.push([
            'Alertas MapBiomas',
            amb.mapbiomas.token_configurado === false
              ? 'Token nao configurado'
              : String(amb.mapbiomas.total_alertas),
          ]);
        }
        if (rowsAmb.length > 0) {
          addSection('Analise Ambiental', rowsAmb);
        }
      }

      if (farmEnrich?.economico) {
        const eco = farmEnrich.economico;
        const rowsEco = [];
        if (eco.producao_agricola?.produtos_principais?.length) {
          const top = eco.producao_agricola.produtos_principais.slice(0, 3);
          rowsEco.push([
            'Principais culturas',
            top
              .map((p) => `${p.produto} (${(p.quantidade / 1000).toFixed(0)}t)`)
              .join(', '),
          ]);
        }
        if (eco.producao_pecuaria?.total_cabecas) {
          rowsEco.push([
            'Efetivo pecuario',
            `${eco.producao_pecuaria.total_cabecas.toLocaleString()} cabecas`,
          ]);
        }
        if (eco.indicadores?.pib_total) {
          rowsEco.push([
            'PIB municipal',
            eco.indicadores.pib_total.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }),
          ]);
        }
        if (rowsEco.length > 0) {
          addSection('Dados Economicos Municipais (IBGE)', rowsEco);
        }
      }

      if (farmEnrich?.valuation) {
        const v = farmEnrich.valuation;
        addSection('Score de Inteligencia Rural', [
          ['Score de confianca', `${v.score_confianca}/100`],
          ['Nivel de risco', v.nivel_risco || '-'],
          [
            'Score alerta ambiental',
            v.score_alerta_ambiental ? `${v.score_alerta_ambiental}/100` : '-',
          ],
          [
            'Fontes consultadas',
            farmEnrich.fontes_consultadas?.join(', ') || '-',
          ],
        ]);
      }

      if (
        farmEnrich?.valuation?.drivers?.length ||
        farmEnrich?.valuation?.risks?.length
      ) {
        const v = farmEnrich.valuation;
        doc.fillColor(brandColor).fontSize(14).text('Leitura da Analise');
        doc.moveDown(0.3);
        (v.drivers || []).forEach((item) => {
          doc.fillColor('#047857').fontSize(10).text(`+ ${item}`);
        });
        (v.risks || []).forEach((item) => {
          doc.fillColor('#b45309').fontSize(10).text(`! ${item}`);
        });
        doc.moveDown();
      }
      addSection('Quick Valuation Rural', [
        ['Status', valuation.status || 'Nao calculado'],
        ['Metodo', valuation.method || '-'],
        [
          'Data-base',
          valuation.valuation_date
            ? new Date(valuation.valuation_date).toLocaleString('pt-BR')
            : '-',
        ],
        [
          'Confianca',
          valuation.confidence_score !== undefined
            ? `${valuation.confidence_score}/100`
            : '-',
        ],
        [
          'Comparaveis internos',
          valuation.comparable_count !== undefined
            ? `${valuation.comparable_count} (${valuation.comparable_scope || '-'})`
            : '-',
        ],
        [
          'Valor minimo',
          valuation.total_value_min
            ? Number(valuation.total_value_min).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
        [
          'Valor medio',
          valuation.total_value_avg
            ? Number(valuation.total_value_avg).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
        [
          'Valor maximo',
          valuation.total_value_max
            ? Number(valuation.total_value_max).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
        [
          'Valor/ha medio',
          valuation.price_per_ha_avg
            ? Number(valuation.price_per_ha_avg).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
        [
          'Valor/alqueire SP',
          valuation.price_per_alqueire_sp
            ? Number(valuation.price_per_alqueire_sp).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
        [
          'Valor/alqueire MG',
          valuation.price_per_alqueire_mg
            ? Number(valuation.price_per_alqueire_mg).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        ],
      ]);

      if (valuation.drivers?.length || valuation.risks?.length) {
        doc.fillColor(brandColor).fontSize(14).text('Leitura do Valuation');
        doc.moveDown(0.3);
        (valuation.drivers || []).forEach((item) => {
          doc.fillColor('#047857').fontSize(10).text(`+ ${item}`);
        });
        (valuation.risks || []).forEach((item) => {
          doc.fillColor('#b45309').fontSize(10).text(`! ${item}`);
        });
        doc.moveDown();
      }

      doc.fillColor(brandColor).fontSize(14).text('Arquivos e Validacoes');
      doc.moveDown(0.3);
      if (documents?.length) {
        documents.forEach((item) => {
          doc
            .fillColor('#111827')
            .fontSize(10)
            .text(
              `${item.document_type || 'OUTRO'} - ${item.status || 'pending'} - ${item.validation_status || 'unchecked'}`
            );
        });
      } else {
        doc.fillColor('#6b7280').fontSize(10).text('Nenhum documento anexado.');
      }

      doc.moveDown();
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .text(
          'Documento gerado automaticamente pelo WooTech Imob Rural. Valuation referencial, nao substitui laudo oficial de avaliacao. Confirme as validacoes nos orgaos competentes.',
          { align: 'center' }
        );
      doc.end();
    } catch (error) {
      console.error('Rural dossier PDF error:', error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
      else res.end();
    }
  }
);

export default router;
