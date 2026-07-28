import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  X,
  XCircle,
} from 'lucide-react'
import type { Employee, RoundConfig } from '../types'
import { Avatar } from '../components/Avatar'

type QuizPageProps = {
  config: RoundConfig
  target: Employee
  options: Employee[]
  questionNumber: number
  correctCount: number
  wrongCount: number
  selectedId: string | null
  onAnswer: (employeeId: string) => void
  onContinue: () => void
  onExit: () => void
  onFinishUnlimited: () => void
}

function displayName(employee: Employee, config: RoundConfig) {
  if (config.nameMode === 'first') return employee.firstName
  if (config.nameMode === 'last') return employee.lastName
  return `${employee.firstName} ${employee.lastName}`
}

function modeLabel(config: RoundConfig) {
  if (config.nameMode === 'first') return 'Vorname'
  if (config.nameMode === 'last') return 'Nachname'
  return 'Vor- und Nachname'
}

export function QuizPage({
  config,
  target,
  options,
  questionNumber,
  correctCount,
  wrongCount,
  selectedId,
  onAnswer,
  onContinue,
  onExit,
  onFinishUnlimited,
}: QuizPageProps) {
  const answered = selectedId !== null
  const isCorrect = selectedId === target.id
  const total = config.roundSize === 'unlimited' ? null : config.roundSize
  const progress = total
    ? Math.min(100, ((questionNumber - (answered ? 0 : 1)) / total) * 100)
    : 0

  const answerClass = (employee: Employee) => {
    if (!answered) return ''
    if (employee.id === target.id) return 'answer-correct'
    if (employee.id === selectedId) return 'answer-wrong'
    return 'opacity-55'
  }

  return (
    <main className="page-quiz">
      <header className="quiz-header">
        <div className="grid grid-cols-[44px_1fr_72px] items-center gap-3">
          <button
            aria-label="Lernrunde verlassen"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-[#102142] shadow-sm"
            onClick={onExit}
            type="button"
          >
            <ArrowLeft size={23} />
          </button>
          <p className="text-center text-lg font-extrabold text-[#102142]">
            {total ? `${questionNumber}/${total}` : `Frage ${questionNumber}`}
          </p>
          {total ? (
            <div className="flex items-center justify-end gap-2 text-[11px] font-bold">
              <span
                className="score-counter text-emerald-600"
                key={`correct-${correctCount}`}
              >
                {correctCount}✓
              </span>
              <span
                className="score-counter text-red-500"
                key={`wrong-${wrongCount}`}
              >
                {wrongCount}×
              </span>
            </div>
          ) : (
            <button
              className="min-h-11 rounded-xl px-1 text-xs font-bold text-blue-600"
              onClick={onFinishUnlimited}
              type="button"
            >
              Beenden
            </button>
          )}
        </div>
        {total ? (
          <div aria-label={`${Math.round(progress)} Prozent der Runde abgeschlossen`} className="progress-track mt-4">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <InfinityIcon aria-hidden="true" size={16} />
            Unbegrenztes Lernen
          </div>
        )}
      </header>

      <div className="quiz-mode mt-5 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
          <ImageIcon aria-hidden="true" size={15} />
          Modus: {modeLabel(config)}
        </span>
      </div>

      {config.direction === 'photo-to-name' ? (
        <section
          className="quiz-question quiz-photo-question question-transition mt-5"
          key={`${questionNumber}-${target.id}`}
        >
          <Avatar
            className="surface quiz-portrait mx-auto aspect-square w-full max-w-[285px]"
            label="Foto der gesuchten Person"
            rounded="card"
            spriteIndex={target.spriteIndex}
          />
          <h1 className="quiz-question-title mt-6 text-center text-[28px] leading-tight font-semibold tracking-[-0.015em] text-[#17233b]">
            Wer ist das?
          </h1>
          <div
            aria-label="Antwortmöglichkeiten"
            className="quiz-text-options mt-5 grid gap-2.5"
          >
            {options.map((employee, index) => (
              <button
                aria-label={`Antwort ${index + 1}: ${displayName(employee, config)}`}
                className={`surface answer-option relative min-h-14 rounded-2xl border px-12 text-center text-[15px] font-semibold text-[#17233b] ${answerClass(employee)}`}
                disabled={answered}
                key={employee.id}
                onClick={() => onAnswer(employee.id)}
                type="button"
              >
                {displayName(employee, config)}
                {answered && employee.id === target.id ? (
                  <Check
                    aria-hidden="true"
                    className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-emerald-600 p-1 text-white"
                    size={23}
                    strokeWidth={3}
                  />
                ) : null}
                {answered && employee.id === selectedId && employee.id !== target.id ? (
                  <X
                    aria-hidden="true"
                    className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-red-500 p-1 text-white"
                    size={23}
                    strokeWidth={3}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section
          className="quiz-question quiz-name-question question-transition mt-7"
          key={`${questionNumber}-${target.id}`}
        >
          <h1 className="quiz-question-title mx-auto max-w-md text-center text-[27px] leading-tight font-semibold tracking-[-0.015em] text-[#17233b]">
            Welche Person heißt{' '}
            <span className="text-blue-700">{displayName(target, config)}</span>?
          </h1>
          <div
            aria-label="Foto-Antwortmöglichkeiten"
            className="quiz-photo-options mt-6 grid grid-cols-2 gap-3"
          >
            {options.map((employee, index) => (
              <button
                aria-label={`Foto-Antwort ${index + 1}`}
                className={`surface answer-option relative overflow-hidden rounded-[22px] border-2 bg-white p-1.5 ${answerClass(employee)}`}
                disabled={answered}
                key={employee.id}
                onClick={() => onAnswer(employee.id)}
                type="button"
              >
                <Avatar
                  className="aspect-square w-full"
                  rounded="card"
                  spriteIndex={employee.spriteIndex}
                />
                {answered && employee.id === target.id ? (
                  <span className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white shadow">
                    <Check aria-hidden="true" size={20} strokeWidth={3} />
                  </span>
                ) : null}
                {answered && employee.id === selectedId && employee.id !== target.id ? (
                  <span className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white shadow">
                    <X aria-hidden="true" size={20} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}

      {answered ? (
        <section
          aria-live="polite"
          className={`feedback-panel mt-5 rounded-[20px] border p-4 ${
            isCorrect
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'
          }`}
          role="status"
        >
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle2
                aria-hidden="true"
                className="feedback-icon mt-0.5 shrink-0 text-emerald-600"
                size={23}
              />
            ) : (
              <XCircle
                aria-hidden="true"
                className="feedback-icon mt-0.5 shrink-0 text-red-500"
                size={23}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#17233b]">
                {isCorrect ? 'Richtig erkannt!' : 'Noch nicht ganz.'}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {isCorrect ? 'Das sitzt.' : 'Die richtige Lösung ist '}
                {!isCorrect ? (
                  <strong className="text-[#102142]">
                    {target.firstName} {target.lastName}
                  </strong>
                ) : null}
              </p>
            </div>
          </div>
          <button
            className="primary-button mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold"
            onClick={onContinue}
            type="button"
          >
            Weiter
            <ChevronRight aria-hidden="true" size={19} />
          </button>
        </section>
      ) : (
        <p className="mt-5 text-center text-xs font-medium text-slate-500">
          Tippe auf die passende Antwort.
        </p>
      )}
    </main>
  )
}
