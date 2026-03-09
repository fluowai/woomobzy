import { ClimateData } from '../types';

interface Coordinates {
  lat: number;
  lng: number;
}

export const climateService = {
  /**
   * Geocodifica cidade brasileira para coordenadas
   */
  async geocode(city: string, state: string): Promise<Coordinates> {
    try {
      const query = `${city}, ${state}, Brasil`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Localização não encontrada');
      }
      
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      throw new Error('Não foi possível localizar a cidade');
    }
  },

  /**
   * Busca dados climáticos históricos (últimos 12 meses)
   */
  async getClimateData(city: string, state: string): Promise<ClimateData> {
    try {
      // 1. Geocodificar
      const coords = await this.geocode(city, state);
      
      // 2. Buscar dados climáticos (últimos 365 dias)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${coords.lat}&longitude=${coords.lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean` +
        `&timezone=America/Sao_Paulo&past_days=365`
      );
      
      const data = await response.json();
      
      if (!data.daily) {
        throw new Error('Dados climáticos não disponíveis');
      }
      
      // 3. Calcular médias
      const temps = data.daily.temperature_2m_max;
      const tempsMins = data.daily.temperature_2m_min;
      const rainfall = data.daily.precipitation_sum;
      const humidity = data.daily.relative_humidity_2m_mean;
      
      const avgTemp = this.average(temps);
      const minTemp = Math.min(...tempsMins);
      const maxTemp = Math.max(...temps);
      const totalRainfall = rainfall.reduce((a: number, b: number) => a + b, 0);
      const avgRainfall = totalRainfall / 12; // média mensal
      const avgHumidity = this.average(humidity);
      
      // 4. Determinar estação predominante
      const season = this.determineSeason(avgTemp, totalRainfall);
      
      return {
        avgTemp: Math.round(avgTemp * 10) / 10,
        minTemp: Math.round(minTemp * 10) / 10,
        maxTemp: Math.round(maxTemp * 10) / 10,
        avgRainfall: Math.round(avgRainfall),
        totalRainfall: Math.round(totalRainfall),
        humidity: Math.round(avgHumidity),
        season,
        location: `${city}, ${state}`
      };
    } catch (error) {
      console.error('Erro ao buscar dados climáticos:', error);
      throw error;
    }
  },

  /**
   * Calcula média de um array de números
   */
  average(arr: number[]): number {
    const validNumbers = arr.filter(n => n !== null && n !== undefined);
    return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
  },

  /**
   * Determina estação/clima predominante
   */
  determineSeason(avgTemp: number, totalRainfall: number): string {
    if (totalRainfall > 1800) {
      return 'Tropical Úmido';
    } else if (totalRainfall > 1200) {
      return 'Subtropical';
    } else if (totalRainfall < 800) {
      return 'Semi-árido';
    } else if (avgTemp > 24) {
      return 'Tropical';
    } else {
      return 'Temperado';
    }
  }
};
