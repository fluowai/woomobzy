
// Utility to handle API calls to the Railway backend
export const getApiUrl = (path: string = '') => {
  // Prefer the environment variable (standard VITE prefix)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  
  // Ensure we don't have double slashes
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Return the full URL if baseUrl exists, otherwise use relative path (for local/monorepo)
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}${sanitizedPath}` : sanitizedPath;
};
