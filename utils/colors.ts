import { logger } from '@/utils/logger';
// Dynamic import with type assertion for ColorThief
let ColorThief: any;

// Initialize ColorThief on first use
const initColorThief = async () => {
  if (!ColorThief) {
    try {
      const module = await import('colorthief');
      ColorThief = module.default || module;
    } catch (error) {
      logger.warn('ColorThief library not available:', error);
      return null;
    }
  }
  return ColorThief;
};

export const extractColorsFromImage = async (
  imageElement: HTMLImageElement
): Promise<{ primary: string; secondary: string }> => {
  const ColorThiefModule = await initColorThief();

  return new Promise((resolve, reject) => {
    try {
      if (!ColorThiefModule) {
        // Fallback if ColorThief is not available
        resolve({ primary: '#FFD700', secondary: '#009B3A' });
        return;
      }

      const colorThief = new ColorThiefModule();

      // Certifique-se de que a imagem carregou
      if (imageElement.complete) {
        processColors();
      } else {
        imageElement.addEventListener('load', processColors);
      }

      function processColors() {
        try {
          const palette = colorThief.getPalette(imageElement, 2);

          // Converte RGB array para Hex String
          const rgbToHex = (r: number, g: number, b: number) =>
            '#' +
            [r, g, b]
              .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
              })
              .join('');

          if (palette && palette.length >= 2) {
            const primary = rgbToHex(
              palette[0][0],
              palette[0][1],
              palette[0][2]
            );
            const secondary = rgbToHex(
              palette[1][0],
              palette[1][1],
              palette[1][2]
            );
            resolve({ primary, secondary });
          } else {
            // Fallback - Cores da bandeira brasileira (logo FAZENDAS BRASIL)
            resolve({ primary: '#FFD700', secondary: '#009B3A' });
          }
        } catch (error) {
          logger.error('Erro ao extrair cores:', error);
          // Fallback colors instead of rejecting
          resolve({ primary: '#FFD700', secondary: '#009B3A' });
        }
      }
    } catch (error) {
      logger.error('Erro ao inicializar ColorThief:', error);
      // Fallback colors
      resolve({ primary: '#FFD700', secondary: '#009B3A' });
    }
  });
};
