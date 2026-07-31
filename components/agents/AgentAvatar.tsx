import React from 'react'

interface AgentAvatarProps {
  label: string
  gradient?: string
  size?: 'sm' | 'md' | 'lg'
}

const gradients: Record<string, string> = {
  Z: 'from-blue-600 to-indigo-600',
  O: 'from-emerald-500 to-teal-500',
  N: 'from-violet-600 to-purple-700',
  M: 'from-amber-500 to-orange-500',
  Í: 'from-pink-500 to-rose-500',
  E: 'from-slate-700 to-slate-950',
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-lg' }

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  label,
  gradient,
  size = 'md',
}) => {
  const g = gradient || gradients[label] || 'from-slate-600 to-slate-800'
  const s = sizes[size]
  return (
    <div
      className={`${s} shrink-0 rounded-lg bg-gradient-to-br ${g} p-[2px] shadow-sm`}
    >
      <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-white/10 font-bold text-white">
        {label.charAt(0)}
      </div>
    </div>
  )
}
