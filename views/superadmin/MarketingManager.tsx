import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Megaphone,
  Globe2,
  Copy,
  Plus,
  Layout,
  Search,
  MapPin,
  Eye,
  CheckCircle2,
  Tractor,
  Building2,
  ArrowRight,
  Trash2,
} from 'lucide-react';

interface SeoPage {
  id: string;
  targetCity: string;
  targetState: string;
  keyword: string;
  urlSlug: string;
  status: 'published' | 'draft';
  visits: number;
}

const SITE_TEMPLATES = [
  // Rurais
  {
    id: 'r1',
    type: 'rural',
    name: 'Fazenda Premium',
    description:
      'Design elegante focado em grandes propriedades rurais, com destaque para vídeos aéreos e mapas.',
    color: 'emerald',
  },
  {
    id: 'r2',
    type: 'rural',
    name: 'Agro Business',
    description:
      'Layout corporativo para imobiliárias focadas no agronegócio e investidores.',
    color: 'green',
  },
  {
    id: 'r3',
    type: 'rural',
    name: 'Haras & Sítios',
    description:
      'Visual acolhedor e rústico para propriedades de lazer e criação.',
    color: 'amber',
  },
  {
    id: 'r4',
    type: 'rural',
    name: 'Terra Bruta',
    description:
      'Foco em dados técnicos, topografia e potencial produtivo da terra.',
    color: 'lime',
  },
  {
    id: 'r5',
    type: 'rural',
    name: 'Expansão Agro',
    description:
      'Design moderno com integração forte de mapa e filtros avançados.',
    color: 'teal',
  },
  // Urbanos
  {
    id: 'u1',
    type: 'urban',
    name: 'Urbano Minimal',
    description:
      'Design limpo e sofisticado, ideal para imóveis de alto padrão e luxo.',
    color: 'slate',
  },
  {
    id: 'u2',
    type: 'urban',
    name: 'City Connect',
    description:
      'Visual dinâmico voltado para jovens e imóveis compactos bem localizados.',
    color: 'blue',
  },
  {
    id: 'u3',
    type: 'urban',
    name: 'Família & Lar',
    description:
      'Layout focado em bairros residenciais, escolas próximas e conveniência.',
    color: 'indigo',
  },
  {
    id: 'u4',
    type: 'urban',
    name: 'Corporate Tower',
    description: 'Estilo executivo para lajes corporativas, salas e galpões.',
    color: 'gray',
  },
  {
    id: 'u5',
    type: 'urban',
    name: 'Urban Grid',
    description:
      'Visual em masonry (Pinterest-style) para um catálogo denso e diversificado.',
    color: 'violet',
  },
];

const slugify = (val: string) =>
  val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const MarketingManager: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'seo' | 'templates'>('seo');
  const [seoPages, setSeoPages] = useState<SeoPage[]>([]);
  const [keyword, setKeyword] = useState('');
  const [targetCity, setTargetCity] = useState('');
  const [targetState, setTargetState] = useState('');
  const [savingSeo, setSavingSeo] = useState(false);
  const [previewPage, setPreviewPage] = useState<SeoPage | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<
    (typeof SITE_TEMPLATES)[number] | null
  >(null);

  useEffect(() => {
    const loadSeo = async () => {
      if (!profile?.organization_id) return;
      const { data } = await supabase
        .from('site_settings')
        .select('layout_config')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();
      const pages = (data?.layout_config as Record<string, any> | undefined)
        ?.seo_pages;
      if (Array.isArray(pages)) setSeoPages(pages);
    };
    loadSeo();
  }, [profile?.organization_id]);

  const persistSeoPages = async (nextPages: SeoPage[]) => {
    setSeoPages(nextPages);
    if (!profile?.organization_id) return;
    const { data: current } = await supabase
      .from('site_settings')
      .select('layout_config')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          organization_id: profile.organization_id,
          layout_config: {
            ...((current?.layout_config as Record<string, any>) || {}),
            seo_pages: nextPages,
          },
        },
        { onConflict: 'organization_id' }
      );
    if (error) {
      toast.error('Erro ao salvar páginas SEO no banco.');
    }
  };

  const handleGenerateSeo = async () => {
    if (!keyword.trim() || !targetCity.trim() || !targetState.trim()) {
      toast.error('Preencha palavra-chave, cidade e estado.');
      return;
    }
    setSavingSeo(true);
    try {
      const slug = `/${slugify(keyword)}-${slugify(targetCity)}-${slugify(targetState)}`;
      const newPage: SeoPage = {
        id: String(Date.now()),
        keyword: keyword.trim(),
        targetCity: targetCity.trim(),
        targetState: targetState.trim().toUpperCase(),
        urlSlug: slug,
        status: 'published',
        visits: 0,
      };
      await persistSeoPages([newPage, ...seoPages]);
      setKeyword('');
      setTargetCity('');
      setTargetState('');
      toast.success(`Página SEO ${slug} gerada e publicada!`);
    } finally {
      setSavingSeo(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Megaphone className="text-emerald-600" size={28} />
          Marketing & Expansão
        </h1>
        <p className="text-slate-500 mt-1">
          Gerencie páginas de captura geolocalizadas e os templates oferecidos
          aos clientes.
        </p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'seo' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Páginas SEO (Clonagem)
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'templates' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Galeria de Templates (Sites)
        </button>
      </div>

      {activeTab === 'seo' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Estratégia de Dominação Local
            </h2>
            <span className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
              {seoPages.length} página(s) SEO publicada(s)
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Form for new page */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-1 space-y-4 h-fit">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Copy size={18} className="text-emerald-600" /> Gerador em Lote
              </h3>
              <p className="text-sm text-slate-500">
                A página base será clonada substituindo as variáveis de
                localização e gerando meta tags únicas.
              </p>
              <div className="space-y-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Palavra-chave (ex: fazendas a venda)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  placeholder="Cidade Alvo (ex: Curitiba)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  placeholder="Estado (ex: PR)"
                  maxLength={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={savingSeo}
                  onClick={handleGenerateSeo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
                >
                  {savingSeo ? 'Gerando...' : 'Gerar e Publicar'}
                </button>
              </div>
            </div>

            {/* Pages list */}
            <div className="md:col-span-2 space-y-4">
              {seoPages.map((page) => (
                <div
                  key={page.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {page.keyword} em {page.targetCity}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        {page.urlSlug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase">
                        Visitas
                      </p>
                      <p className="font-bold text-slate-800">{page.visits}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setPreviewPage(page)}
                        title="Visualizar meta tags"
                        className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() =>
                          persistSeoPages(seoPages.filter((p) => p.id !== page.id))
                        }
                        title="Remover página SEO"
                        className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {seoPages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  Nenhuma página SEO cadastrada ainda. Use o gerador ao lado para
                  publicar sua primeira landing page geolocalizada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-10 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Tractor className="text-emerald-600" /> Templates Rurais
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SITE_TEMPLATES.filter((t) => t.type === 'rural').map(
                (template) => (
                  <div
                    key={template.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 transition duration-300"
                  >
                    <div className="aspect-[4/3] bg-slate-100 p-6 relative overflow-hidden flex flex-col justify-between">
                      <div
                        className={`absolute inset-0 bg-${template.color}-600/10 opacity-0 group-hover:opacity-100 transition duration-500`}
                      />
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative z-10 opacity-90 group-hover:opacity-100 transition">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
                        <div className="h-20 bg-slate-100 rounded-lg mb-2" />
                        <div className="flex gap-2">
                          <div className="h-10 bg-slate-100 rounded flex-1" />
                          <div className="h-10 bg-slate-100 rounded flex-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-800 text-lg mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-4">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          Disponível
                        </span>
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="text-sm font-semibold text-slate-700 flex items-center gap-1 group-hover:text-emerald-600 transition"
                        >
                          Ver Demo <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Building2 className="text-blue-600" /> Templates Urbanos
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SITE_TEMPLATES.filter((t) => t.type === 'urban').map(
                (template) => (
                  <div
                    key={template.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 transition duration-300"
                  >
                    <div className="aspect-[4/3] bg-slate-100 p-6 relative overflow-hidden flex flex-col justify-between">
                      <div
                        className={`absolute inset-0 bg-${template.color}-600/10 opacity-0 group-hover:opacity-100 transition duration-500`}
                      />
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative z-10 opacity-90 group-hover:opacity-100 transition">
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4 mx-auto" />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="h-20 bg-slate-100 rounded-lg" />
                          <div className="h-20 bg-slate-100 rounded-lg" />
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-800 text-lg mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-4">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Disponível
                        </span>
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="text-sm font-semibold text-slate-700 flex items-center gap-1 group-hover:text-blue-600 transition"
                        >
                          Ver Demo <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {previewPage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">
              Preview Meta Tags SEO
            </h3>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs text-emerald-700 font-mono">
                {previewPage.urlSlug}
              </p>
              <p className="text-sm font-bold text-blue-700">
                {previewPage.keyword} em {previewPage.targetCity} -{' '}
                {previewPage.targetState}
              </p>
              <p className="text-xs text-slate-600">
                Encontre as melhores oportunidades de {previewPage.keyword} em{' '}
                {previewPage.targetCity}/{previewPage.targetState} com suporte
                completo e documentação validada.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewPage(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">
              Template: {previewTemplate.name}
            </h3>
            <p className="text-xs uppercase font-bold text-emerald-600">
              Segmento: {previewTemplate.type === 'rural' ? 'Rural / Agro' : 'Urbano'}
            </p>
            <p className="text-sm text-slate-600">
              {previewTemplate.description}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingManager;
