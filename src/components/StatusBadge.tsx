import { Circle } from 'lucide-react'
import type { LearningStatus } from '../types'

type StatusBadgeProps = {
  status: LearningStatus
  compact?: boolean
}

const statusStyles: Record<LearningStatus, string> = {
  Neu: 'bg-slate-100 text-slate-600',
  Unsicher: 'bg-orange-50 text-orange-700',
  'In Übung': 'bg-amber-50 text-amber-700',
  'Gut gelernt': 'bg-emerald-50 text-emerald-700',
  Gemeistert: 'bg-blue-50 text-blue-700',
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${statusStyles[status]} ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Circle aria-hidden="true" className="fill-current" size={7} strokeWidth={0} />
      {status}
    </span>
  )
}
