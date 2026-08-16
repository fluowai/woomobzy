import React, { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Filter,
  LayoutTemplate,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import {
  LANDING_PAGE_TEMPLATES,
  LandingPageTemplate,
} from '../services/landingPageTemplates';

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
  onCreateBlank: () => void;
  onCreateWithAI: () => void;
}

const allLabel = 'Todos';

const getUniqueValues = (
  templates: LandingPageTemplate[],
  getter: (template: LandingPageTemplate) => string | undefined
) => [
  allLabel,
  ...Array.from(new Set(templates.map(getter).filter(Boolean) as string[])),
];

const getResourceValues = (templates: LandingPageTemplate[]) => [
  allLabel,
  ...Array.from(
    new Set(templates.flatMap((template) => template.resources || []))
  ),
];

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelectTemplate,
  onCreateBlank,
  onCreateWithAI,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] =
    useState<LandingPageTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(allLabel);
  const [objectiveFilter, setObjectiveFilter] = useState(allLabel);
  const [styleFilter, setStyleFilter] = useState(allLabel);
  const [resourceFilter, setResourceFilter] = useState(allLabel);

  const categories = useMemo(
    () =>
      getUniqueValues(
        LANDING_PAGE_TEMPLATES,
        (template) => template.group || template.category
      ),
    []
  );
  const objectives = useMemo(
    () =>
      getUniqueValues(LANDING_PAGE_TEMPLATES, (template) => template.objective),
    []
  );
  const styles = useMemo(
    () => getUniqueValues(LANDING_PAGE_TEMPLATES, (template) => template.style),
    []
  );
  const resources = useMemo(
    () => getResourceValues(LANDING_PAGE_TEMPLATES),
    []
  );

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return LANDING_PAGE_TEMPLATES.filter((template) => {
      const haystack = [
        template.name,
        template.description,
        template.category,
        template.group,
        template.objective,
        template.style,
        ...(template.tags || []),
        ...(template.resources || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesCategory =
        categoryFilter === allLabel ||
        template.group === categoryFilter ||
        template.category === categoryFilter;
      const matchesObjective =
        objectiveFilter === allLabel || template.objective === objectiveFilter;
      const matchesStyle =
        styleFilter === allLabel || template.style === styleFilter;
      const matchesResource =
        resourceFilter === allLabel ||
        template.resources?.includes(resourceFilter);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesObjective &&
        matchesStyle &&
        matchesResource
      );
    });
  }, [
    categoryFilter,
    objectiveFilter,
    resourceFilter,
    searchTerm,
    styleFilter,
  ]);

  const selectedTemplate = LANDING_PAGE_TEMPLATES.find(
    (template) => template.id === selectedId
  );

  const handleConfirm = () => {
    if (selectedId) {
      onSelectTemplate(selectedId);
    }
  };

  const FilterButton: React.FC<{
    value: string;
    active: boolean;
    onClick: () => void;
  }> = ({ value, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'
      }`}
    >
      {value}
    </button>
  );

  return (
    <div className="bg-slate-50 p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-indigo-600">
            <LayoutTemplate size={16} />
            Temas estilo Elementor
          </div>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Escolha um tema visual igual aos modelos premium
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Selecione o visual, crie a landing e edite textos, imagens, cores,
            formularios e secoes no editor. Cada tema ja vem com conversao,
            agenda, WhatsApp, CRM, SEO e LGPD preparados.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreateBlank}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Pagina em branco
          </button>
          <button
            onClick={onCreateWithAI}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
          >
            <Sparkles size={16} />
            Criar com IA
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por casa, fazenda, aluguel, lista VIP, tour virtual..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <Filter size={16} />
            {filteredTemplates.length} modelos encontrados
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Categoria
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <FilterButton
                  key={category}
                  value={category}
                  active={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Objetivo
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {objectives.map((objective) => (
                  <FilterButton
                    key={objective}
                    value={objective}
                    active={objectiveFilter === objective}
                    onClick={() => setObjectiveFilter(objective)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Estilo
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {styles.map((style) => (
                  <FilterButton
                    key={style}
                    value={style}
                    active={styleFilter === style}
                    onClick={() => setStyleFilter(style)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Recurso
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {resources.map((resource) => (
                  <FilterButton
                    key={resource}
                    value={resource}
                    active={resourceFilter === resource}
                    onClick={() => setResourceFilter(resource)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-24 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredTemplates.map((template) => {
          const isSelected = selectedId === template.id;
          const sectionCount =
            template.sectionCount ||
            template.sections?.length ||
            Math.max(template.blocks.length, 8);

          return (
            <article
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                isSelected
                  ? 'border-indigo-500 ring-4 ring-indigo-100'
                  : 'border-slate-200 hover:border-indigo-200'
              }`}
            >
              <div className="relative h-64 overflow-hidden bg-slate-200">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                    {template.group || template.category}
                  </span>
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {sectionCount} secoes
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                    {template.objective || 'Landing imobiliaria'}
                  </p>
                  <h3 className="mt-1 text-xl font-bold leading-tight text-white">
                    {template.name}
                  </h3>
                </div>
              </div>

              <div className="p-5">
                <p className="min-h-[48px] text-sm leading-6 text-slate-600">
                  {template.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(template.resources || ['Formulario', 'WhatsApp', 'CRM'])
                    .slice(0, 5)
                    .map((resource) => (
                      <span
                        key={resource}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600"
                      >
                        {resource}
                      </span>
                    ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-bold text-slate-900">
                      Pipeline
                    </span>
                    <span>{template.pipeline || 'CRM integrado'}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block font-bold text-slate-900">
                      Estilo
                    </span>
                    <span>{template.style || 'Profissional'}</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewTemplate(template);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={16} />
                    Visualizar
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(template.id);
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isSelected && <Check size={16} />}
                    {isSelected ? 'Selecionado' : 'Usar template'}
                  </button>
                </div>
              </div>

              {isSelected && (
                <div className="absolute right-4 top-4 rounded-full bg-indigo-600 p-2 text-white shadow-lg">
                  <Check size={18} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {selectedId && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                Template selecionado
              </p>
              <p className="font-bold text-slate-950">
                {selectedTemplate?.name || 'Modelo imobiliario'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                Continuar com template
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-slate-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                    <Monitor size={15} />
                    Desktop
                    <Smartphone size={15} />
                    Mobile
                  </div>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-500 shadow-sm hover:text-slate-900"
                  >
                    Fechar
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <img
                    src={previewTemplate.thumbnail}
                    alt={previewTemplate.name}
                    className="h-[520px] w-full bg-slate-950 object-contain object-top"
                  />
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                        {previewTemplate.group || previewTemplate.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {previewTemplate.sectionCount ||
                          previewTemplate.sections?.length ||
                          previewTemplate.blocks.length}{' '}
                        secoes
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-950">
                      {previewTemplate.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {previewTemplate.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Pagina completa
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">
                  {previewTemplate.objective || 'Landing page imobiliaria'}
                </h3>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Categoria
                    </span>
                    <p className="mt-1 font-bold text-slate-900">
                      {previewTemplate.category}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Pipeline
                    </span>
                    <p className="mt-1 font-bold text-slate-900">
                      {previewTemplate.pipeline || 'CRM'}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="mb-3 text-sm font-bold text-slate-950">
                    Recursos inclusos
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(previewTemplate.resources || []).map((resource) => (
                      <span
                        key={resource}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-bold text-slate-950">
                    Estrutura da pagina
                  </h4>
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                    {(
                      previewTemplate.sections ||
                      previewTemplate.blocks.map((block) => block.type)
                    ).map((section, index) => (
                      <div
                        key={`${section}-${index}`}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 shadow-sm">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">
                          {section}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => onSelectTemplate(previewTemplate.id)}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    Usar template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
