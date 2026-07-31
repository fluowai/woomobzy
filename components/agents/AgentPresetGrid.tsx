import React from 'react'
import { Sparkles } from 'lucide-react'
import { AgentAvatar } from './AgentAvatar'

export interface PresetAgent {
  name: string
  role: string
  description: string
  tags: string[]
  avatar: string
}

interface AgentPresetGridProps {
  presets: PresetAgent[]
  onSelect: (preset: PresetAgent) => void
}

export const AgentPresetGrid: React.FC<AgentPresetGridProps> = ({
  presets,
  onSelect,
}) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2">
      <Sparkles size={16} className="text-emerald-600" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Templates prontos
      </span>
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        {presets.length}
      </span>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {presets.map((preset) => (
        <article
          key={preset.name}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-emerald-200 hover:shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AgentAvatar label={preset.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <h3 className="mb-0 truncate text-sm font-bold text-slate-950">
                {preset.name}
              </h3>
              <p className="mb-0 text-[11px] font-bold text-slate-500">
                {preset.role}
              </p>
            </div>
          </div>
          <p className="mb-0 mt-3 text-xs leading-relaxed text-slate-600">
            {preset.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preset.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => onSelect(preset)}
            className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Usar modelo
          </button>
        </article>
      ))}
    </div>
  </section>
)
