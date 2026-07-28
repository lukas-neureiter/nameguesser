import type { CSSProperties } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Play,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import { PersonRow } from '../components/PersonRow'
import type { PersonSummary } from './HomePage'

export type RoundResultView = {
  total: number
  correct: number
  wrong: number
  averageResponseMs: number
  wrongPeople: PersonSummary[]
  improvedPeople: PersonSummary[]
}

type ResultsPageProps = {
  result: RoundResultView
  onBackHome: () => void
  onNewRound: () => void
}

function formatSeconds(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '–'
  return `${(milliseconds / 1000).toFixed(1).replace('.', ',')} s`
}

export function ResultsPage({
  result,
  onBackHome,
  onNewRound,
}: ResultsPageProps) {
  const accuracy = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0
  const ringStyle = {
    '--score-angle': `${accuracy * 3.6}deg`,
  } as CSSProperties

  return (
    <main className="page page-results">
      <header className="mb-6 grid grid-cols-[44px_1fr_44px] items-start">
        <button
          aria-label="Zur Startseite"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-[#102142] shadow-sm"
          onClick={onBackHome}
          type="button"
        >
          <ArrowLeft size={23} />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-blue-600 uppercase">
            Runde abgeschlossen
          </p>
          <h1 className="mt-1 text-[31px] font-extrabold tracking-[-0.035em] text-[#102142]">
            Auswertung
          </h1>
        </div>
      </header>

      <section className="surface results-score rounded-[22px] p-5">
        <div className="flex items-center justify-center gap-7">
          <div className="score-ring" style={ringStyle}>
            <span className="text-center">
              <strong className="text-[35px] font-extrabold tracking-[-0.04em] text-[#102142]">
                {result.correct}
              </strong>
              <span className="text-base font-bold text-slate-500">/{result.total}</span>
            </span>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={28} />
            <strong className="mt-2 block text-[38px] leading-none font-extrabold tracking-[-0.04em] text-[#102142]">
              {accuracy} %
            </strong>
            <span className="mt-1 block text-sm font-semibold text-slate-500">richtig</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 border-t border-slate-100 pt-5">
          <div className="text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check aria-hidden="true" size={19} strokeWidth={2.7} />
            </span>
            <strong className="mt-1.5 block text-lg font-extrabold text-[#102142]">
              {result.correct}
            </strong>
            <span className="text-[11px] text-slate-500">Richtig</span>
          </div>
          <div className="border-x border-slate-100 text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-500">
              <X aria-hidden="true" size={19} strokeWidth={2.7} />
            </span>
            <strong className="mt-1.5 block text-lg font-extrabold text-[#102142]">
              {result.wrong}
            </strong>
            <span className="text-[11px] text-slate-500">Falsch</span>
          </div>
          <div className="text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600">
              <Timer aria-hidden="true" size={18} />
            </span>
            <strong className="mt-1.5 block text-lg font-extrabold text-[#102142]">
              {formatSeconds(result.averageResponseMs)}
            </strong>
            <span className="text-[11px] text-slate-500">Ø Zeit</span>
          </div>
        </div>
      </section>

      <section className="surface results-practice mt-4 rounded-[22px] p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#102142]">Noch üben</h2>
            <p className="mt-0.5 text-xs text-slate-500">Aus dieser Lernrunde</p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {result.wrongPeople.length} Personen
          </span>
        </div>
        {result.wrongPeople.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {result.wrongPeople.slice(0, 3).map((person) => (
              <PersonRow key={person.employee.id} {...person} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center">
            <Sparkles aria-hidden="true" className="mx-auto text-emerald-600" size={24} />
            <p className="mt-2 text-sm font-extrabold text-[#102142]">Fehlerfreie Runde</p>
            <p className="mt-1 text-xs text-slate-600">Du hast jede Person richtig erkannt.</p>
          </div>
        )}
      </section>

      {result.improvedPeople.length > 0 ? (
        <section className="results-improved mt-4 flex items-center gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-emerald-600">
            <Sparkles aria-hidden="true" size={21} />
          </span>
          <p className="text-sm font-bold text-[#102142]">
            Du hast dich bei {result.improvedPeople.length}{' '}
            {result.improvedPeople.length === 1 ? 'Person' : 'Personen'} verbessert.
          </p>
        </section>
      ) : null}

      <div className="results-actions mt-4 grid gap-3">
        <button
          className="primary-button flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] px-5 text-base font-extrabold"
          onClick={onNewRound}
          type="button"
        >
          <Play aria-hidden="true" fill="currentColor" size={19} />
          Neue Runde konfigurieren
        </button>
      </div>
    </main>
  )
}
