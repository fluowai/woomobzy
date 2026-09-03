import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Download, Copy, Check } from 'lucide-react';
import { fetchWooProducts } from '../../../services/wooControl';

type WooProduct = {
  id: string;
  name: string;
  slug: string;
  current_version?: string | null;
  stable_version?: string | null;
  status?: string | null;
  woo_releases?: Array<{ id?: string; version: string; is_stable?: boolean; status?: string }>;
};

const features = ['Redis', 'WhatsApp Worker', 'Traefik'] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const buildYaml = (
  product: WooProduct,
  version: string,
  domain: string,
  licenseKey: string,
  enabledFeatures: Set<string>
) => {
  const slug = slugify(product.slug || product.name);
  const env = [
    `      - APP_DOMAIN=${domain}`,
    `      - LICENSE_KEY=${licenseKey}`,
    `      - PRODUCT_VERSION=${version}`,
  ].join('\n');

  const services: string[] = [];
  services.push(`  ${slug}:`);
  services.push(`    image: woo/${slug}:${version}`);
  services.push(`    restart: unless-stopped`);
  services.push(`    environment:`);
  services.push(env);
  if (enabledFeatures.has('Traefik')) {
    services.push(`    labels:`);
    services.push(`      - "traefik.enable=true"`);
    services.push(`      - "traefik.http.routers.${slug}.rule=Host(\`${domain}\`)"`);
    services.push(`      - "traefik.http.services.${slug}.loadbalancer.server.port=3000"`);
  }

  if (enabledFeatures.has('Redis')) {
    services.push(`  redis:`);
    services.push(`    image: redis:7-alpine`);
    services.push(`    restart: unless-stopped`);
  }

  if (enabledFeatures.has('WhatsApp Worker')) {
    services.push(`  whatsapp-worker:`);
    services.push(`    image: woo/${slug}-worker:${version}`);
    services.push(`    restart: unless-stopped`);
    services.push(`    environment:`);
    services.push(`      - APP_DOMAIN=${domain}`);
    services.push(`      - LICENSE_KEY=${licenseKey}`);
    services.push(`      - REDIS_URL=redis://redis:6379`);
    if (enabledFeatures.has('Traefik')) {
      services.push(`    labels:`);
      services.push(`      - "traefik.enable=false"`);
    }
  }

  if (enabledFeatures.has('Traefik')) {
    services.push(`  traefik:`);
    services.push(`    image: traefik:v3`);
    services.push(`    restart: unless-stopped`);
    services.push(`    ports:`);
    services.push(`      - "80:80"`);
    services.push(`      - "443:443"`);
    services.push(`    volumes:`);
    services.push(`      - /var/run/docker.sock:/var/run/docker.sock`);
    services.push(`      - ./traefik.yml:/etc/traefik/traefik.yml:ro`);
    services.push(`      - ./acme.json:/acme.json`);
  }

  return `# docker-compose.yml — ${product.name} v${version}\nservices:\n${services.join('\n')}\n`;
};

export const StackGenerator = () => {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [domain, setDomain] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set(features));
  const [generatedStack, setGeneratedStack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetchWooProducts()
      .then((p) => {
        if (active) {
          setProducts(p);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar produtos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedVersion(selectedProduct.current_version || selectedProduct.stable_version || '');
    }
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  const releaseVersions = () => {
    if (!selectedProduct) return [];
    const versions = new Set<string>();
    if (selectedProduct.current_version) versions.add(selectedProduct.current_version);
    if (selectedProduct.stable_version) versions.add(selectedProduct.stable_version);
    (selectedProduct.woo_releases || []).forEach((r) => {
      if (r.version) versions.add(r.version);
    });
    return Array.from(versions);
  };

  const toggleFeature = (feature: string) => {
    setEnabledFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return next;
    });
    setGeneratedStack(null);
  };

  const handleGenerate = () => {
    if (!selectedProduct) return;
    const version = selectedVersion || selectedProduct.current_version || selectedProduct.stable_version || 'latest';
    const yaml = buildYaml(selectedProduct, version, domain, licenseKey, enabledFeatures);
    setGeneratedStack(yaml);
  };

  const handleCopy = async () => {
    if (!generatedStack) return;
    try {
      await navigator.clipboard.writeText(generatedStack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: nothing
    }
  };

  const handleDownload = () => {
    if (!generatedStack) return;
    const blob = new Blob([generatedStack], { type: 'text/yaml' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'docker-compose.yml';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gerador de Stack</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gere configurações docker-compose.yml dinâmicas com segurança.</p>
        </div>
        <Wand2 size={28} className="text-[#d4af37]" />
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl border"
        style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
      >
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Produto</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setGeneratedStack(null);
                }}
                className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none"
              >
                <option value="">Selecione um produto</option>
                {loading ? (
                  <option disabled>Carregando...</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Versão</label>
              <select
                value={selectedVersion}
                onChange={(e) => {
                  setSelectedVersion(e.target.value);
                  setGeneratedStack(null);
                }}
                disabled={!selectedProduct}
                className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none disabled:opacity-50"
              >
                <option value="">Selecione a versão</option>
                {releaseVersions().map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Domínio de Destino</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setGeneratedStack(null);
                }}
                placeholder="crm.exemplo.com"
                className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Chave de Licença</label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value);
                  setGeneratedStack(null);
                }}
                placeholder="LIC-XXXX-XXXX"
                className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#252A35]">
            <p className="text-sm font-medium text-[#9097A5]">Funcionalidades</p>
            <div className="flex flex-wrap gap-4">
              {features.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={enabledFeatures.has(feature)}
                    onChange={() => toggleFeature(feature)}
                    className="accent-[#d4af37]"
                  />
                  {feature}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedProduct}
            className="w-full py-3 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Wand2 size={18} /> Gerar Stack
          </button>
        </form>
      </motion.div>

      {generatedStack && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">docker-compose.yml</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-sm text-white hover:bg-[#252A35] transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-sm text-white hover:bg-[#252A35] transition-colors flex items-center gap-1.5"
              >
                <Download size={16} /> Baixar
              </button>
            </div>
          </div>
          <pre className="p-4 rounded-lg bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5] overflow-x-auto whitespace-pre">
            {generatedStack}
          </pre>
        </motion.div>
      )}
    </div>
  );
};
