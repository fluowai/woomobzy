import ColorThief from 'colorthief';

export const extractColorsFromImage = (imageElement: HTMLImageElement): Promise<{ primary: string; secondary: string }> => {
  return new Promise((resolve, reject) => {
    const colorThief = new ColorThief();
    
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
          "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');

        if (palette && palette.length >= 2) {
          const primary = rgbToHex(palette[0][0], palette[0][1], palette[0][2]);
          const secondary = rgbToHex(palette[1][0], palette[1][1], palette[1][2]);
          resolve({ primary, secondary });
        } else {
          // Fallback - Cores da bandeira brasileira (logo FAZENDAS BRASIL)
          resolve({ primary: '#FFD700', secondary: '#009B3A' }); // Amarelo/Ouro e Verde Brasil
        }
      } catch (error) {
        console.error("Erro ao extrair cores:", error);
        reject(error);
      }
    }
  });
};
