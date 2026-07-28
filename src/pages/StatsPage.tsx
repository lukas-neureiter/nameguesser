import {
  BarChart3,
  Check,
  CircleHelp,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PersonRow } from '../components/PersonRow'
import type { LearningStatus } from '../types'
import type { PersonSummary } from './HomePage'

export type StatsHistoryItem = {
  id: string
  finishedAt: string
  correct: number
  total: number
}

type StatsPageProps = {
  totalPeople: number
  knownPeople: number
  masteredPeople: number
  overallAccuracy: number
  totalAnswers: number
  totalCorrect: number
  difficultPeople: PersonSummary[]
  distribution: Record<LearningStatus, number>
  history: StatsHistoryItem[]
}

const statusColors: Record<LearningStatus, string> = {
  Neu: 'bg-slate-300',
  Unsicher: 'bg-orange-400',
  'In Übung': 'bg-amber-400',
  'Gut gelernt': 'bg-emerald-500',
  Gemeistert: 'bg-blue-600',
}

function StatTile({
  icon,
  value,
  label,
  tone = 'blue',
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  tone?: 'blue' | 'green'
}) {
  return (
    <div className="text-center">
      <span
        className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${
          tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        }`}
      >
        {icon}
      </span>
      <strong className="mt-2 block text-xl font-extrabold text-[#102142]">{value}</strong>
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
    </div>
  )
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date))
}

export function StatsPage({
  totalPeople,
  knownPeople,
  masteredPeople,
  overallAccuracy,
  totalAnswers,
  totalCorrect,
  difficultPeople,
  distribution,
  history,
}: StatsPageProps) {
  return (
    <main className="page">
      <PageHeader
        subtitle="Dein Fortschritt wird nach jeder Antwort automatisch aktualisiert."
        title="Statistik"
      />

      <section aria-label="Gesamtstatistik" className="surface rounded-[24px] p-5">
        <div className="grid grid-cols-4 gap-1">
          <StatTile
            icon={<UsersRound aria-hidden="true" size={20} />}
            label="Personen"
            value={totalPeople}
          />
          <StatTile
            icon={<Check aria-hidden="true" size={21} strokeWidth={2.8} />}
            label="bekannt"
            tone="green"
            value={knownPeople}
          />
          <StatTile
            icon={<Sparkles aria-hidden="true" size={20} />}
            label="gemeistert"
            value={masteredPeople}
          />
          <StatTile
            icon={<Target aria-hidden="true" size={20} />}
            label="Trefferquote"
            value={`${overallAccuracy} %`}
          />
        </div>
      </section>

      <section className="surface mt-4 rounded-[24px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#102142]">Lernstatus</h2>
            <p className="mt-0.5 text-xs text-slate-500">Alle Personen im Überblick</p>
          </div>
          <BarChart3 aria-hidden="true" className="text-blue-600" size={23} />
        </div>
        <div className="mt-5 space-y-3.5">
          {(Object.keys(distribution) as LearningStatus[]).map((status) => {
            const count = distribution[status]
            const percent = totalPeople > 0 ? Math.round((count / totalPeople) * 100) : 0
            return (
              <div key={status}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">{status}</span>
                  <span className="font-bold text-[#102142]">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full min-w-0 rounded-full ${statusColors[status]}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="surface mt-4 rounded-[24px] p-5">
        <div>
          <h2 className="text-lg font-extrabold text-[#102142]">Schwierigste Personen</h2>
          <p className="mt-0.5 text-xs text-slate-500">Nach deiner bisherigen Trefferquote</p>
        </div>
        {difficultPeople.length > 0 ? (
          <div className="mt-1 divide-y divide-slate-100">
            {difficultPeople.slice(0, 4).map((person) => (
              <PersonRow key={person.employee.id} {...person} showStatus={false} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">
            Nach deiner ersten Runde zeigt die App hier die häufigsten Verwechslungen.
          </div>
        )}
      </section>

      <section className="surface mt-4 rounded-[24px] p-5">
        <h2 className="text-lg font-extrabold text-[#102142]">Insgesamt</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
              <CircleHelp aria-hidden="true" size={20} />
            </span>
            <strong className="mt-2 block text-2xl font-extrabold text-[#102142]">
              {totalAnswers}
            </strong>
            <span className="text-xs text-slate-500">Fragen</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check aria-hidden="true" size={20} strokeWidth={2.7} />
            </span>
            <strong className="mt-2 block text-2xl font-extrabold text-[#102142]">
              {totalCorrect}
            </strong>
            <span className="text-xs text-slate-500">richtig</span>
          </div>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="surface mt-4 rounded-[24px] p-5">
          <h2 className="text-lg font-extrabold text-[#102142]">Letzte Runden</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {history.slice(0, 5).map((round) => {
              const accuracy = round.total > 0 ? Math.round((round.correct / round.total) * 100) : 0
              return (
                <div className="flex items-center gap-3 py-3" key={round.id}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Target aria-hidden="true" size={19} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#102142]">
                      {round.correct} von {round.total} richtig
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatShortDate(round.finishedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                    {accuracy} %
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </main>
  )
}
