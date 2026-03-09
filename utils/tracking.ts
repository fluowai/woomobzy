/**
 * TRACKING UTILITIES
 * Biblioteca centralizada para captura de dados de tracking
 * Suporta: UTM parameters, Facebook Pixel, Google Analytics, referrer tracking
 */

export interface TrackingData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer_url?: string;
  landing_page_url?: string;
  client_id?: string;
  fbp?: string;
  fbc?: string;
  session_data?: Record<string, any>;
}

/**
 * Captura UTM parameters da URL e armazena em sessionStorage
 */
export function captureUTMParameters(): void {
  const params = new URLSearchParams(window.location.search);
  const utmData: Record<string, string> = {};
  
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  utmKeys.forEach(key => {
    const value = params.get(key);
    if (value) {
      utmData[key] = value;
    }
  });
  
  // Salvar em sessionStorage se houver parâmetros
  if (Object.keys(utmData).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmData));
    console.log('📊 UTM Parameters captured:', utmData);
  }
}

/**
 * Recupera UTM parameters do sessionStorage
 */
export function getUTMParameters(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem('utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading UTM parameters:', error);
    return {};
  }
}

/**
 * Extrai cookie do Facebook Pixel (_fbp)
 */
export function getFacebookPixelCookie(): string | undefined {
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extrai cookie do Facebook Click ID (_fbc)
 */
export function getFacebookClickId(): string | undefined {
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extrai Client ID do Google Analytics
 */
export function getGoogleAnalyticsClientId(): string | undefined {
  try {
    // Tenta pegar do cookie _ga
    const match = document.cookie.match(/_ga=([^;]+)/);
    if (match) {
      // O formato é GA1.2.XXXXXXXXXX.YYYYYYYYYY
      // Queremos apenas a parte XXXXXXXXXX.YYYYYYYYYY
      const parts = match[1].split('.');
      if (parts.length >= 4) {
        return `${parts[2]}.${parts[3]}`;
      }
    }
    
    // Fallback: tentar pegar do gtag se disponível
    if (typeof window !== 'undefined' && (window as any).gtag) {
      return new Promise<string>((resolve) => {
        (window as any).gtag('get', 'G-XXXXXXXXXX', 'client_id', (clientId: string) => {
          resolve(clientId);
        });
      }) as any;
    }
  } catch (error) {
    console.error('Error getting GA Client ID:', error);
  }
  return undefined;
}

/**
 * Captura dados da sessão (device, browser, etc)
 */
export function getSessionData(): Record<string, any> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Função principal: retorna todos os dados de tracking
 */
export function getTrackingData(): TrackingData {
  const utmParams = getUTMParameters();
  
  return {
    // UTM Parameters
    utm_source: utmParams.utm_source,
    utm_medium: utmParams.utm_medium,
    utm_campaign: utmParams.utm_campaign,
    utm_term: utmParams.utm_term,
    utm_content: utmParams.utm_content,
    
    // Page Tracking
    referrer_url: document.referrer || undefined,
    landing_page_url: window.location.href,
    
    // Google Analytics
    client_id: getGoogleAnalyticsClientId(),
    
    // Facebook Pixel
    fbp: getFacebookPixelCookie(),
    fbc: getFacebookClickId(),
    
    // Session Data
    session_data: getSessionData(),
  };
}

/**
 * Dispara evento customizado no Facebook Pixel
 */
export function trackFacebookEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, params);
    console.log(`📊 Facebook Pixel Event: ${eventName}`, params);
  }
}

/**
 * Dispara evento customizado no Google Analytics
 */
export function trackGoogleEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
    console.log(`📊 Google Analytics Event: ${eventName}`, params);
  }
}

/**
 * Dispara conversão no Google Ads
 */
export function trackGoogleAdsConversion(conversionLabel: string, value?: number): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      send_to: conversionLabel,
      value: value,
      currency: 'BRL',
    });
    console.log(`📊 Google Ads Conversion: ${conversionLabel}`, { value });
  }
}

/**
 * Inicializa captura de UTM parameters quando a página carrega
 */
if (typeof window !== 'undefined') {
  // Capturar UTM parameters imediatamente
  captureUTMParameters();
  
  // Também capturar em mudanças de URL (para SPAs)
  window.addEventListener('popstate', captureUTMParameters);
}
