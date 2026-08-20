import { useLocation } from 'react-router-dom';

/**
 * Detects the active panel prefix from the current URL.
 * AI routes are nested under `/rural/*` and `/urban/*`, so links
 * must be built relative to the panel the user is currently in.
 */
export function usePanelBase(): string {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname.startsWith('/urban')) return '/urban';
  if (pathname.startsWith('/rural')) return '/rural';
  return '/rural';
}

/**
 * Builds a panel-prefixed AI path based on the current location.
 * Example: useAIPath('operations/new') -> '/rural/ai/operations/new'
 */
export function useAIPath(): (to: string) => string {
  const base = usePanelBase();
  const aiRoot = `${base}/ai`;
  return (to: string) => {
    const normalized = to.startsWith('/') ? to.slice(1) : to;
    return `${aiRoot}/${normalized}`;
  };
}