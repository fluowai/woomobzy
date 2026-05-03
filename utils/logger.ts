export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

// Defines if debug mode is active (set via backend or secure mechanism, NOT localstorage directly for real security, but for now we check a secure flag if possible)
const isDebugMode = () => {
  // Check if we are in development environment
  if (import.meta.env.DEV) return true;

  // In production, check for a highly specific, expiring session token or server-side injected flag
  // Never trust a simple localStorage flag for general users.
  // For support admins, they would receive a short-lived token.
  try {
    const debugToken = sessionStorage.getItem('secure_support_debug_token');
    if (debugToken) {
      // Basic validation (in a real scenario, validate JWT expiration here)
      const parts = debugToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 > Date.now() && payload.role === 'superadmin') {
          return true;
        }
      }
    }
  } catch (e) {
    return false;
  }
  return false;
};

// Mask sensitive data
const maskData = (data: any): any => {
  if (typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    return data.map(maskData);
  }

  const masked = { ...data };
  const sensitiveKeys = [
    'password', 'token', 'access_token', 'refresh_token', 
    'secret', 'key', 'api_key', 'apikey', 'auth', 
    'credential', 'private', 'jwt'
  ];
  
  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      masked[key] = '[REDACTED]';
    } else if (lowerKey === 'email' && typeof masked[key] === 'string') {
      const parts = masked[key].split('@');
      if (parts.length === 2) {
        masked[key] = `${parts[0].substring(0, 2)}***@${parts[1]}`;
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskData(masked[key]);
    }
  }
  return masked;
};

class Logger {
  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    if (!isDebugMode() && level === 'debug') return;

    const maskedParams = optionalParams.map(maskData);

    switch (level) {
      case 'debug':
        if (isDebugMode()) console.debug(`[DEBUG] ${message}`, ...maskedParams);
        break;
      case 'info':
        if (isDebugMode()) console.info(`[INFO] ${message}`, ...maskedParams);
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, ...maskedParams);
        break;
      case 'error':
        console.error(`[ERROR] ${message}`, ...maskedParams);
        break;
      case 'audit':
        // Send to backend securely, do not log to console in production
        if (isDebugMode()) console.log(`[AUDIT] ${message}`, ...maskedParams);
        // TODO: fetch('/api/audit', { method: 'POST', body: JSON.stringify({ message, data: maskedParams }) });
        break;
    }
  }

  debug(message: string, ...optionalParams: any[]) { this.log('debug', message, ...optionalParams); }
  info(message: string, ...optionalParams: any[]) { this.log('info', message, ...optionalParams); }
  warn(message: string, ...optionalParams: any[]) { this.log('warn', message, ...optionalParams); }
  error(message: string, ...optionalParams: any[]) { this.log('error', message, ...optionalParams); }
  audit(message: string, ...optionalParams: any[]) { this.log('audit', message, ...optionalParams); }
}

export const logger = new Logger();
