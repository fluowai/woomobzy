-- Adiciona coluna de análise climática na tabela properties

-- Adicionar coluna analysis (JSONB) para armazenar análise completa
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS analysis JSONB;

-- Adicionar comentário explicativo
COMMENT ON COLUMN properties.analysis IS 'Análise climática e de aptidão gerada por IA, incluindo dados de clima, recomendações de culturas e pecuária';

-- Exemplo de estrutura do JSON:
/*
{
  "climate": {
    "avgTemp": 24.5,
    "minTemp": 18.2,
    "maxTemp": 32.1,
    "avgRainfall": 125,
    "totalRainfall": 1500,
    "humidity": 70,
    "season": "Tropical",
    "location": "Sorriso, MT"
  },
  "aptitude": {
    "cattle": {
      "score": 9,
      "type": ["Gado de Corte", "Búfalos"],
      "notes": "Excelente aptidão para pecuária extensiva"
    },
    "agriculture": {
      "score": 8,
      "crops": ["Soja", "Milho", "Algodão"],
      "notes": "Ótimas condições para culturas de grãos"
    }
  },
  "risks": ["Seca ocasional", "Variação de temperatura"],
  "opportunities": ["Irrigação", "Diversificação de culturas"],
  "overallScore": 8,
  "aiInsights": "Esta propriedade apresenta excelente potencial...",
  "analyzedAt": "2024-01-06T12:00:00Z"
}
*/
