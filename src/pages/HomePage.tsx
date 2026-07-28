import {
  ArrowRight,
  Check,
  History,
  Play,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react'
import type { Employee, LearningStatus } from '../types'
import { PageHeader } from '../components/PageHeader'
import { PersonRow } from '../components/PersonRow'

export type PersonSummary = {
  employee: Employee
  status: LearningStatus
  accuracy: number
  totalAnswers: number
}

type HomePageProps = {
  totalPeople: number
  knownPeople: number
  masteredPeople: number
  progressPercent: number
  difficultPeople: PersonSummary[]
  hasHistory: boolean
  onOpenSettings: () => void
  onQuickStart: () => void
  onRepeatDifficult: () => void
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  tone: 'blue' | 'green'
}) {
  return (
    <div className="text-center">
      <span
        className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${
          tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        }`}
      >
        {icon}
      </span>
      <strong className="mt-2 block text-xl font-extrabold text-[#102142]">{value}</strong>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </div>
  )
}

export function HomePage({
  totalPeople,
  knownPeople,
  masteredPeople,
  progressPercent,
  difficultPeople,
  hasHistory,
  onOpenSettings,
  onQuickStart,
  onRepeatDifficult,
}: HomePageProps) {
  return (
    <main className="page page-home">
      <div className="home-header">
        <PageHeader
          subtitle="Gesichter und Namen in kurzen, konzentrierten Runden lernen."
          title="Namen lernen"
        />
      </div>

      <section
        aria-label="Dein Lernstand"
        className="surface home-summary rounded-[22px] p-5"
      >
        <div className="grid grid-cols-3">
          <Metric
            icon={<UsersRound aria-hidden="true" size={23} />}
            label="Personen"
            tone="blue"
            value={totalPeople}
          />
          <Metric
            icon={<Check aria-hidden="true" size={24} strokeWidth={2.8} />}
            label="kennengelernt"
            tone="green"
            value={knownPeople}
          />
          <Metric
            icon={<Sparkles aria-hidden="true" size={23} />}
            label="gemeistert"
            tone="blue"
            value={masteredPeople}
          />
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Gesamtfortschritt</span>
            <span className="text-blue-700">{progressPercent} %</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      <button
        className="primary-button home-primary mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-6 text-base font-semibold"
        onClick={onOpenSettings}
        type="button"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-blue-600">
          <Play aria-hidden="true" fill="currentColor" size={18} />
        </span>
        Lernrunde starten
      </button>

      <section className="surface home-repeat mt-5 rounded-[22px] p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-[#102142]">Heute wiederholen</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Diese Namen brauchen noch etwas Übung.
            </p>
          </div>
          <button
            className="min-h-11 rounded-xl px-2 text-xs font-bold text-blue-600 disabled:text-slate-400"
            disabled={difficultPeople.length === 0}
            onClick={onRepeatDifficult}
            type="button"
          >
            Üben
          </button>
        </div>

        {difficultPeople.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {difficultPeople.slice(0, 3).map((person) => (
              <PersonRow key={person.employee.id} {...person} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-center">
            <Sparkles aria-hidden="true" className="mx-auto text-blue-500" size={24} />
            <p className="mt-2 text-sm font-bold text-[#102142]">Bereit für den Start</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Nach deiner ersten Runde erscheinen hier die Personen, die du wiederholen solltest.
            </p>
          </div>
        )}
      </section>

      <div className="home-shortcuts mt-4 grid grid-cols-2 gap-3">
        <button
          className="surface flex min-h-24 items-center gap-3 rounded-[20px] p-4 text-left disabled:opacity-55"
          disabled={!hasHistory}
          onClick={onQuickStart}
          type="button"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
            <History aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1 text-xs leading-5 font-bold text-[#102142]">
            Letzte Einstellung
          </span>
          <ArrowRight aria-hidden="true" className="shrink-0 text-slate-400" size={17} />
        </button>
        <button
          className="surface flex min-h-24 items-center gap-3 rounded-[20px] p-4 text-left disabled:opacity-55"
          disabled={difficultPeople.length === 0}
          onClick={onRepeatDifficult}
          type="button"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Target aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1 text-xs leading-5 font-bold text-[#102142]">
            Nur schwierige
          </span>
          <ArrowRight aria-hidden="true" className="shrink-0 text-slate-400" size={17} />
        </button>
      </div>
    </main>
  )
}
