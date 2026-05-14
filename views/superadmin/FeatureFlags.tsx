import React, { useState, useEffect } from 'react';
import {
  ToggleRight,
  ToggleLeft,
  Plus,
  X,
  Search,
  Save,
  Building2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'module_geointeligencia',
    label: 'Geointeligência',
    description: 'Mapas WMS/WFS e camadas GIS',
    defaultEnabled: false,
  },
  {
    key: 'module_due_diligence',
    label: 'Due Diligence',
    description: 'Checklists fundiários e ambientais',
    defaultEnabled: false,
  },
  {
    key: 'module_empreendimentos',
    label: 'Empreendimentos',
    description: 'Cadastro de lançamentos',
    defaultEnabled: true,
  },
  {
    key: 'module_locacao',
    label: 'Locação',
    description: 'Contratos de locação',
    defaultEnabled: true,
  },
  {
    key: 'module_exportador',
    label: 'Exportador Portais',
    description: 'Feed XML para portais imobiliários',
    defaultEnabled: false,
  },
  {
    key: 'module_compliance',
    label: 'Compliance',
    description: 'Checklist documental',
    defaultEnabled: true,
  },
  {
    key: 'module_ia_studio',
    label: 'IA Studio',
    description: 'Assistente de IA',
    defaultEnabled: false,
  },
  {
    key: 'module_landing_pages',
    label: 'Landing Pages',
    description: 'Editor de landing pages',
    defaultEnabled: true,
  },
  {
    key: 'module_dataroom',
    label: 'Data Room',
    description: 'Compartilhamento de documentos',
    defaultEnabled: false,
  },
  {
    key: 'module_portal_proprietario',
    label: 'Portal Proprietário',
    description: 'Portal para proprietários',
    defaultEnabled: false,
  },
  {
    key: 'module_whatsapp',
    label: 'WhatsApp Integrado',
    description: 'Mensagens e automações WhatsApp',
    defaultEnabled: true,
  },
  {
    key: 'max_properties',
    label: 'Limite de Imóveis',
    description: 'Limite de imóveis por plano',
    defaultEnabled: true,
  },
];

const FeatureFlags: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        console.log('📡 [FeatureFlags] Buscando imobiliárias...');
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, feature_flags')
          .order('name');
        
        if (error) {
          console.error('❌ [FeatureFlags] Erro ao buscar imobiliárias:', error.message);
          return;
        }

        console.log(`✅ [FeatureFlags] ${data?.length || 0} imobiliárias carregadas.`);
        setTenants(data || []);
      } catch (err: any) {
        console.error('❌ [FeatureFlags] Erro inesperado:', err.message);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      const tenant = tenants.find((t) => t.id === selectedTenant);
      const existingFlags = tenant?.feature_flags || {};
      const allFlags: Record<string, boolean> = {};
      DEFAULT_FLAGS.forEach((f) => {
        allFlags[f.key] =
          existingFlags[f.key] !== undefined
            ? existingFlags[f.key]
            : f.defaultEnabled;
      });
      setFlags(allFlags);
    }
  }, [selectedTenant, tenants]);

  const toggleFlag = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!selectedTenant) return;
    setSaving(true);
    await supabase
      .from('organizations')
      .update({ feature_flags: flags })
      .eq('id', selectedTenant);
    setSaving(false);
  };

  const filteredFlags = DEFAULT_FLAGS.filter(
    (f) =>
      f.label.toLowerCase().includes(filter.toLowerCase()) ||
      f.key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ToggleRight className="text-indigo-600" size={28} />
          Feature Flags
        </h1>
        <p className="text-gray-500 mt-1">
          Controle de funcionalidades por tenant e plano.
        </p>
      </div>

      {/* Tenant Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <Building2 size={20} className="text-gray-400" />
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">Selecione uma imobiliária</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTenant && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
      </div>

      {selectedTenant ? (
        <>
          {/* Search */}
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <Search size={18} className="text-gray-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar flags..."
              className="flex-1 outline-none text-sm"
            />
          </div>

          {/* Flags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFlags.map((flag) => {
              const isEnabled = flags[flag.key] ?? flag.defaultEnabled;
              return (
                <div
                  key={flag.key}
                  className={`bg-white rounded-xl border-2 p-5 transition-all ${isEnabled ? 'border-indigo-200 shadow-sm' : 'border-gray-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">{flag.label}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {flag.description}
                      </p>
                      <code className="text-[10px] text-gray-300 font-mono mt-1 block">
                        {flag.key}
                      </code>
                    </div>
                    <button
                      onClick={() => toggleFlag(flag.key)}
                      className="transition-all hover:scale-110"
                    >
                      {isEnabled ? (
                        <ToggleRight size={36} className="text-indigo-600" />
                      ) : (
                        <ToggleLeft size={36} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ToggleRight className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-500 mb-2">
            Selecione uma Imobiliária
          </h3>
          <p className="text-sm text-gray-400">
            Escolha um tenant para gerenciar suas feature flags.
          </p>
        </div>
      )}
    </div>
  );
};

export default FeatureFlags;
