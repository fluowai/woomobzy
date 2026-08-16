import { useState, useCallback } from 'react';

interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  erro?: boolean;
}

export function useCep() {
  const [loading, setLoading] = useState(false);

  const fetchCep = useCallback(async (cep: string): Promise<CepResult | null> => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return null;

    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return null;

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
      };
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchCep, loading };
}
