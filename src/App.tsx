import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { BottomNav, type NavScreen } from './components/BottomNav'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EMPLOYEES } from './data/employees'
import {
  applyAnswer,
  buildOptions,
  createEmptyProgress,
  getAccuracy,
  getAggregateStatistics,
  getHardestEmployees,
  getLearningStatus,
  getNewlyLearnedIds,
  getTotalAnswers,
  weightedPickEmployee,
} from './lib/learning'
import { loadState, saveState } from './lib/storage'
import { HomePage, type PersonSummary } from './pages/HomePage'
import { PeoplePage } from './pages/PeoplePage'
import { QuizPage } from './pages/QuizPage'
import { ResultsPage, type RoundResultView } from './pages/ResultsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import type {
  Employee,
  PersistedState,
  PersonProgress,
  RoundConfig,
  SessionPersonResult,
  SessionSummary,
} from './types'

type Screen = NavScreen | 'quiz' | 'results'

type RetryItem = {
  employeeId: string
  dueQuestion: number
}

type ActiveRound = {
  config: RoundConfig
  target: Employee
  options: Employee[]
  questionNumber: number
  correct: number
  wrong: number
  selectedId: string | null
  questionStartedAt: number
  startedAt: string
  askedCounts: Record<string, number>
  retryQueue: RetryItem[]
  wrongPersonIds: string[]
  personResults: Record<string, SessionPersonResult>
  progressAtStart: Record<string, PersonProgress>
  poolIds: string[] | null
}

function cloneProgress(progress: Record<string, PersonProgress>) {
  return Object.fromEntries(
    Object.entries(progress).map(([id, value]) => [id, { ...value }]),
  )
}

function toPersonSummary(
  employee: Employee,
  progressById: Record<string, PersonProgress>,
): PersonSummary {
  const progress = progressById[employee.id] ?? createEmptyProgress(employee.id)

  return {
    employee,
    status: getLearningStatus(progress),
    accuracy: Math.round(getAccuracy(progress)),
    totalAnswers: getTotalAnswers(progress),
  }
}

function createRoundId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `round-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function App() {
  const [appState, setAppState] = useState<PersistedState>(loadState)
  const [config, setConfig] = useState<RoundConfig>(appState.lastConfig)
  const [screen, setScreen] = useState<Screen>('home')
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [lastResult, setLastResult] = useState<RoundResultView | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  useEffect(() => {
    saveState(appState)
  }, [appState])

  useEffect(() => {
    const portraitAtlas = new Image()
    portraitAtlas.src = '/employee-portraits.jpg'
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document
      .querySelector<HTMLElement>('.screen-transition > main')
      ?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [screen])

  const people = useMemo(
    () =>
      EMPLOYEES.map((employee) =>
        toPersonSummary(employee, appState.progressById),
      ),
    [appState.progressById],
  )

  const disabledPersonIds = useMemo(
    () => new Set(appState.disabledPersonIds),
    [appState.disabledPersonIds],
  )

  const activeEmployees = useMemo(
    () =>
      EMPLOYEES.filter((employee) => !disabledPersonIds.has(employee.id)),
    [disabledPersonIds],
  )

  const aggregate = useMemo(
    () => getAggregateStatistics(activeEmployees, appState.progressById),
    [activeEmployees, appState.progressById],
  )

  const difficultPeople = useMemo(
    () =>
      getHardestEmployees(activeEmployees, appState.progressById, 5).map(
        ({ employee }) => toPersonSummary(employee, appState.progressById),
      ),
    [activeEmployees, appState.progressById],
  )

  const averageProgress = Math.round(
    activeEmployees.reduce(
      (sum, employee) =>
        sum + (appState.progressById[employee.id]?.masteryScore ?? 0),
      0,
    ) / activeEmployees.length,
  )

  const changeConfig = (nextConfig: RoundConfig) => {
    setConfig(nextConfig)
    setAppState((previous) => ({ ...previous, lastConfig: nextConfig }))
  }

  const startRound = (
    roundConfig: RoundConfig = config,
    requestedPoolIds: string[] | null = null,
  ) => {
    const validPool = requestedPoolIds
      ? activeEmployees.filter((employee) =>
          requestedPoolIds.includes(employee.id),
        )
      : [...activeEmployees]
    const pool = validPool.length > 0 ? validPool : [...activeEmployees]
    const target = weightedPickEmployee(
      pool,
      appState.progressById,
      null,
      {},
      roundConfig.adaptive,
    )

    setConfig(roundConfig)
    setAppState((previous) => ({ ...previous, lastConfig: roundConfig }))
    setLastResult(null)
    setActiveRound({
      config: roundConfig,
      target,
      options: buildOptions(target, activeEmployees),
      questionNumber: 1,
      correct: 0,
      wrong: 0,
      selectedId: null,
      questionStartedAt: Date.now(),
      startedAt: new Date().toISOString(),
      askedCounts: { [target.id]: 1 },
      retryQueue: [],
      wrongPersonIds: [],
      personResults: {},
      progressAtStart: cloneProgress(appState.progressById),
      poolIds: requestedPoolIds,
    })
    setScreen('quiz')
  }

  const answerQuestion = (employeeId: string) => {
    if (!activeRound || activeRound.selectedId !== null) return

    const isCorrect = employeeId === activeRound.target.id
    const responseMs = Math.max(0, Date.now() - activeRound.questionStartedAt)
    const targetId = activeRound.target.id

    setAppState((previous) => {
      const previousProgress =
        previous.progressById[targetId] ?? createEmptyProgress(targetId)
      const nextProgress = applyAnswer(previousProgress, isCorrect, responseMs)

      return {
        ...previous,
        progressById: {
          ...previous.progressById,
          [targetId]: nextProgress,
        },
      }
    })

    setActiveRound((previous) => {
      if (!previous || previous.selectedId !== null) return previous

      const previousPersonResult = previous.personResults[targetId] ?? {
        employeeId: targetId,
        correctAnswers: 0,
        wrongAnswers: 0,
        totalResponseMs: 0,
      }

      return {
        ...previous,
        selectedId: employeeId,
        correct: previous.correct + (isCorrect ? 1 : 0),
        wrong: previous.wrong + (isCorrect ? 0 : 1),
        wrongPersonIds: isCorrect
          ? previous.wrongPersonIds
          : [...new Set([...previous.wrongPersonIds, targetId])],
        retryQueue: isCorrect
          ? previous.retryQueue
          : [
              ...previous.retryQueue.filter((item) => item.employeeId !== targetId),
              { employeeId: targetId, dueQuestion: previous.questionNumber + 2 },
            ],
        personResults: {
          ...previous.personResults,
          [targetId]: {
            employeeId: targetId,
            correctAnswers:
              previousPersonResult.correctAnswers + (isCorrect ? 1 : 0),
            wrongAnswers:
              previousPersonResult.wrongAnswers + (isCorrect ? 0 : 1),
            totalResponseMs: previousPersonResult.totalResponseMs + responseMs,
          },
        },
      }
    })
  }

  const finishRound = () => {
    if (!activeRound) return

    setExitDialogOpen(false)

    const answered = activeRound.correct + activeRound.wrong
    if (answered === 0) {
      setActiveRound(null)
      setScreen('settings')
      return
    }

    const improvedIds = getNewlyLearnedIds(
      activeRound.progressAtStart,
      appState.progressById,
    )
    const personResults = Object.values(activeRound.personResults)
    const totalResponseMs = personResults.reduce(
      (sum, result) => sum + result.totalResponseMs,
      0,
    )
    const completedAt = new Date().toISOString()
    const session: SessionSummary = {
      id: createRoundId(),
      startedAt: activeRound.startedAt,
      completedAt,
      config: activeRound.config,
      correctAnswers: activeRound.correct,
      wrongAnswers: activeRound.wrong,
      totalResponseMs,
      personResults,
      newlyLearnedIds: improvedIds,
    }

    setAppState((previous) => ({
      ...previous,
      roundHistory: [...previous.roundHistory, session].slice(-50),
      lastConfig: activeRound.config,
    }))

    const wrongPeople = activeRound.wrongPersonIds
      .map((id) => EMPLOYEES.find((employee) => employee.id === id))
      .filter((employee): employee is Employee => Boolean(employee))
      .map((employee) => toPersonSummary(employee, appState.progressById))
    const improvedPeople = improvedIds
      .map((id) => EMPLOYEES.find((employee) => employee.id === id))
      .filter((employee): employee is Employee => Boolean(employee))
      .map((employee) => toPersonSummary(employee, appState.progressById))

    setLastResult({
      total: answered,
      correct: activeRound.correct,
      wrong: activeRound.wrong,
      averageResponseMs: totalResponseMs / answered,
      wrongPeople,
      improvedPeople,
    })
    setActiveRound(null)
    setScreen('results')
  }

  const continueRound = () => {
    if (!activeRound || activeRound.selectedId === null) return

    if (
      activeRound.config.roundSize !== 'unlimited' &&
      activeRound.questionNumber >= activeRound.config.roundSize
    ) {
      finishRound()
      return
    }

    const nextQuestion = activeRound.questionNumber + 1
    const allPool = activeRound.poolIds
      ? activeEmployees.filter((employee) =>
          activeRound.poolIds?.includes(employee.id),
        )
      : [...activeEmployees]
    const pool = allPool.length > 0 ? allPool : [...activeEmployees]
    const dueRetry = activeRound.retryQueue.find(
      (item) =>
        item.dueQuestion <= nextQuestion &&
        item.employeeId !== activeRound.target.id &&
        pool.some((employee) => employee.id === item.employeeId),
    )
    const retryTarget = dueRetry
      ? pool.find((employee) => employee.id === dueRetry.employeeId)
      : undefined
    const target =
      retryTarget ??
      weightedPickEmployee(
        pool,
        appState.progressById,
        activeRound.target.id,
        activeRound.askedCounts,
        activeRound.config.adaptive,
      )

    setActiveRound({
      ...activeRound,
      target,
      options: buildOptions(target, activeEmployees),
      questionNumber: nextQuestion,
      selectedId: null,
      questionStartedAt: Date.now(),
      askedCounts: {
        ...activeRound.askedCounts,
        [target.id]: (activeRound.askedCounts[target.id] ?? 0) + 1,
      },
      retryQueue: dueRetry
        ? activeRound.retryQueue.filter((item) => item !== dueRetry)
        : activeRound.retryQueue,
    })
  }

  const exitRound = () => {
    if (!activeRound) return

    const answered = activeRound.correct + activeRound.wrong
    if (answered === 0) {
      setActiveRound(null)
      setScreen('settings')
      return
    }

    setExitDialogOpen(true)
  }

  const startDifficultRound = () => {
    const ids = difficultPeople.map((person) => person.employee.id)
    startRound({ ...config, roundSize: 5, adaptive: true }, ids)
  }

  const togglePersonActive = (employeeId: string) => {
    setAppState((previous) => {
      const isDisabled = previous.disabledPersonIds.includes(employeeId)
      const activeCount = EMPLOYEES.length - previous.disabledPersonIds.length

      if (!isDisabled && activeCount <= 1) {
        return previous
      }

      return {
        ...previous,
        disabledPersonIds: isDisabled
          ? previous.disabledPersonIds.filter((id) => id !== employeeId)
          : [...previous.disabledPersonIds, employeeId],
      }
    })
  }

  const navigate = (destination: NavScreen) => {
    setExitDialogOpen(false)
    setScreen(destination)
  }

  const renderScreen = () => {
    if (screen === 'quiz' && activeRound) {
      return (
        <QuizPage
          config={activeRound.config}
          correctCount={activeRound.correct}
          onAnswer={answerQuestion}
          onContinue={continueRound}
          onExit={exitRound}
          onFinishUnlimited={finishRound}
          options={activeRound.options}
          questionNumber={activeRound.questionNumber}
          selectedId={activeRound.selectedId}
          target={activeRound.target}
          wrongCount={activeRound.wrong}
        />
      )
    }

    if (screen === 'results' && lastResult) {
      return (
        <ResultsPage
          onBackHome={() => setScreen('home')}
          onNewRound={() => setScreen('settings')}
          result={lastResult}
        />
      )
    }

    if (screen === 'settings') {
      return (
        <SettingsPage
          config={config}
          onBack={() => setScreen('home')}
          onChange={changeConfig}
          onStart={() => startRound()}
        />
      )
    }

    if (screen === 'stats') {
      return (
        <StatsPage
          difficultPeople={difficultPeople}
          distribution={aggregate.statusCounts}
          history={[...appState.roundHistory]
            .reverse()
            .map((round) => {
              const activeResults = round.personResults.filter(
                (result) => !disabledPersonIds.has(result.employeeId),
              )
              const correct = activeResults.reduce(
                (sum, result) => sum + result.correctAnswers,
                0,
              )
              const wrong = activeResults.reduce(
                (sum, result) => sum + result.wrongAnswers,
                0,
              )

              return {
                id: round.id,
                finishedAt: round.completedAt,
                correct,
                total: correct + wrong,
              }
            })
            .filter((round) => round.total > 0)}
          knownPeople={aggregate.learnedPeople}
          masteredPeople={aggregate.masteredPeople}
          overallAccuracy={Math.round(aggregate.accuracy)}
          totalAnswers={aggregate.totalAnswers}
          totalCorrect={aggregate.correctAnswers}
          totalPeople={aggregate.totalPeople}
        />
      )
    }

    if (screen === 'people') {
      return (
        <PeoplePage
          disabledPersonIds={disabledPersonIds}
          onToggleActive={togglePersonActive}
          people={people}
        />
      )
    }

    return (
      <HomePage
        difficultPeople={difficultPeople}
        hasHistory={appState.roundHistory.length > 0}
        knownPeople={aggregate.learnedPeople}
        masteredPeople={aggregate.masteredPeople}
        onOpenSettings={() => setScreen('settings')}
        onQuickStart={() => startRound(appState.lastConfig)}
        onRepeatDifficult={startDifficultRound}
        progressPercent={averageProgress}
        totalPeople={aggregate.totalPeople}
      />
    )
  }

  const navActive: NavScreen =
    screen === 'results' || screen === 'quiz' ? 'settings' : screen

  return (
    <div
      className={`app-shell app-shell--${screen} ${
        screen === 'quiz' ? 'app-shell--focus' : ''
      }`}
    >
      <div className="screen-transition" key={screen}>
        {renderScreen()}
      </div>
      {screen !== 'quiz' ? <BottomNav active={navActive} onNavigate={navigate} /> : null}
      {exitDialogOpen && activeRound ? (
        <ConfirmDialog
          answeredCount={activeRound.correct + activeRound.wrong}
          onCancel={() => setExitDialogOpen(false)}
          onConfirm={finishRound}
        />
      ) : null}
    </div>
  )
}

export default App
