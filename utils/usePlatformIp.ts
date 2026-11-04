import { useEffect, useState } from 'react';
import { fetchPlatformIp } from '../services/platform';

export function usePlatformIp(): string | null {
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPlatformIp().then((value) => {
      if (active) setIp(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return ip;
}