import { CaptacaoLead } from '@/src/services/captacao';

export const generateCmaPdfMock = async (lead: CaptacaoLead): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Aqui integrariamos com o backend para gerar o PDF real
      // Por enquanto, apenas um mock de delay para simular a geração.
      console.log('PDF Gerado para:', lead.title);
      resolve();
    }, 2000);
  });
};
