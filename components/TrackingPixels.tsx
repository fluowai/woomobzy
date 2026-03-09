import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * TRACKING PIXELS COMPONENT
 * Carrega e inicializa pixels de tracking (Facebook, Google Analytics, Google Ads)
 * baseado nas configurações do banco de dados
 */

interface PixelConfig {
  facebook?: {
    enabled: boolean;
    pixelId: string;
    testMode?: boolean;
  };
  google_analytics?: {
    enabled: boolean;
    measurementId: string;
    testMode?: boolean;
  };
  google_ads?: {
    enabled: boolean;
    conversionId: string;
    conversionLabel?: string;
    testMode?: boolean;
  };
}

const TrackingPixels: React.FC = () => {
  const { settings } = useSettings();
  const [pixelsLoaded, setPixelsLoaded] = useState(false);

  useEffect(() => {
    if (!settings?.tracking_pixels) {
      console.log('⚠️ Tracking pixels não configurados');
      return;
    }

    const config: PixelConfig = settings.tracking_pixels;

    // Inicializar Facebook Pixel
    if (config.facebook?.enabled && config.facebook.pixelId) {
      initFacebookPixel(config.facebook.pixelId, config.facebook.testMode);
    }

    // Inicializar Google Analytics 4
    if (config.google_analytics?.enabled && config.google_analytics.measurementId) {
      initGoogleAnalytics(config.google_analytics.measurementId, config.google_analytics.testMode);
    }

    // Inicializar Google Ads
    if (config.google_ads?.enabled && config.google_ads.conversionId) {
      initGoogleAds(config.google_ads.conversionId, config.google_ads.testMode);
    }

    setPixelsLoaded(true);
  }, [settings]);

  return null; // Este componente não renderiza nada
};

/**
 * Inicializa Facebook Pixel
 */
function initFacebookPixel(pixelId: string, testMode?: boolean): void {
  console.log(`📊 Inicializando Facebook Pixel: ${pixelId}${testMode ? ' (Test Mode)' : ''}`);

  // Criar script do Facebook Pixel
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // Adicionar noscript fallback
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
  document.body.appendChild(noscript);

  // Expor fbq globalmente para uso em outros componentes
  (window as any).fbq = (window as any).fbq || function() {
    ((window as any).fbq.queue = (window as any).fbq.queue || []).push(arguments);
  };

  console.log('✅ Facebook Pixel inicializado');
}

/**
 * Inicializa Google Analytics 4
 */
function initGoogleAnalytics(measurementId: string, testMode?: boolean): void {
  console.log(`📊 Inicializando Google Analytics 4: ${measurementId}${testMode ? ' (Test Mode)' : ''}`);

  // Criar script do Google Analytics
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      'send_page_view': true,
      'debug_mode': ${testMode ? 'true' : 'false'}
    });
  `;
  document.head.appendChild(script2);

  // Expor gtag globalmente
  (window as any).gtag = (window as any).gtag || function() {
    ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
  };

  console.log('✅ Google Analytics 4 inicializado');
}

/**
 * Inicializa Google Ads
 */
function initGoogleAds(conversionId: string, testMode?: boolean): void {
  console.log(`📊 Inicializando Google Ads: ${conversionId}${testMode ? ' (Test Mode)' : ''}`);

  // Google Ads usa o mesmo gtag do Analytics
  if (!(window as any).gtag) {
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${conversionId}');
    `;
    document.head.appendChild(script2);

    (window as any).gtag = (window as any).gtag || function() {
      ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
    };
  } else {
    // Se gtag já existe (do Analytics), apenas adicionar config
    (window as any).gtag('config', conversionId);
  }

  console.log('✅ Google Ads inicializado');
}

export default TrackingPixels;
