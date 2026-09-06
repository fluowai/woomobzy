import { CaptacaoLead } from '@/src/services/captacao';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const formatMoney = (value?: number | null) =>
  value
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : 'A avaliar';

const writeLine = (
  page: any,
  text: string,
  y: number,
  font: any,
  size = 11,
  color = rgb(0.12, 0.16, 0.23)
) => {
  page.drawText(text.slice(0, 105), { x: 54, y, size, font, color });
};

export const generateCmaPdf = async (lead: CaptacaoLead): Promise<void> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 782, width: 595.28, height: 60, color: rgb(0.02, 0.33, 0.22) });
  page.drawText('Relatório CMA - Captação IMOBZY', {
    x: 54,
    y: 804,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1)
  });

  writeLine(page, `Imóvel: ${lead.title}`, 736, bold, 14);
  writeLine(page, `Tipo: ${lead.property_type || '-'}`, 704, font);
  writeLine(page, `Endereço: ${lead.address || 'Sem endereço informado'}`, 682, font);
  writeLine(page, `Proprietário: ${lead.owner_name || '-'}`, 660, font);
  writeLine(page, `Contato: ${lead.owner_phone || '-'}`, 638, font);
  writeLine(page, `Valor estimado: ${formatMoney(lead.estimated_value)}`, 616, bold);
  writeLine(page, `Status de captação: ${lead.status || '-'}`, 594, font);
  writeLine(page, `Gerado em: ${new Date().toLocaleString('pt-BR')}`, 572, font);

  page.drawText('Observações', { x: 54, y: 524, size: 13, font: bold, color: rgb(0.02, 0.33, 0.22) });
  const notes = String(lead.notes || 'Nenhuma observação cadastrada.');
  const chunks = notes.match(/.{1,92}(\s|$)/g) || [notes];
  chunks.slice(0, 10).forEach((chunk, index) => writeLine(page, chunk.trim(), 498 - index * 18, font));

  page.drawText('Dados usados', { x: 54, y: 270, size: 13, font: bold, color: rgb(0.02, 0.33, 0.22) });
  writeLine(page, 'Este PDF usa somente os dados persistidos no funil de captação.', 246, font);
  writeLine(page, 'Campos sem informação são exibidos como vazios ou “A avaliar”.', 226, font);

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = lead.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase();
  anchor.href = url;
  anchor.download = `cma-${safeTitle || lead.id}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};
