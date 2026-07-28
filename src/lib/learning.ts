import type {
  Employee,
  LearningStatus,
  LearningStatusMeta,
  NameMode,
  PersonProgress,
} from '../types'

const STATUS_META: Record<LearningStatus, LearningStatusMeta> = {
  Neu: {
    label: 'Neu',
    description: 'Noch nicht abgefragt',
    rank: 0,
    foreground: '#475569',
    background: '#f1f5f9',
  },
  Unsicher: {
    label: 'Unsicher',
    description: 'Braucht noch häufige Wiederholungen',
    rank: 1,
    foreground: '#c2410c',
    background: '#fff7ed',
  },
  'In Übung': {
    label: 'In Übung',
    description: 'Wird zunehmend sicher erkannt',
    rank: 2,
    foreground: '#1d4ed8',
    background: '#eff6ff',
  },
  'Gut gelernt': {
    label: 'Gut gelernt',
    description: 'Wird meist sicher erkannt',
    rank: 3,
    foreground: '#047857',
    background: '#ecfdf5',
  },
  Gemeistert: {
    label: 'Gemeistert',
    description: 'Wird dauerhaft sicher erkannt',
    rank: 4,
    foreground: '#6d28d9',
    background: '#f5f3ff',
  },
}

const ADAPTIVE_STATUS_WEIGHT: Record<LearningStatus, number> = {
  Neu: 3,
  Unsicher: 5,
  'In Übung': 3,
  'Gut gelernt': 1.2,
  Gemeistert: 0.5,
}

export interface PersonStatistics {
  employee: Employee
  progress: PersonProgress
  status: LearningStatus
  totalAnswers: number
  accuracy: number
  averageResponseMs: number
}

export interface AggregateStatistics {
  totalPeople: number
  introducedPeople: number
  learnedPeople: number
  masteredPeople: number
  totalAnswers: number
  correctAnswers: number
  wrongAnswers: number
  accuracy: number
  averageResponseMs: number
  statusCounts: Record<LearningStatus, number>
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function toValidDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function getAccuracyRatio(progress: PersonProgress): number {
  const total = getTotalAnswers(progress)
  return total === 0 ? 0 : progress.correctAnswers / total
}

function uniqueEmployees(employees: readonly Employee[]): Employee[] {
  const seen = new Set<string>()

  return employees.filter((employee) => {
    if (seen.has(employee.id)) {
      return false
    }

    seen.add(employee.id)
    return true
  })
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomValue = clamp(random(), 0, 0.9999999999999999)
    const swapIndex = Math.floor(randomValue * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

export function createEmptyProgress(employeeId: string): PersonProgress {
  return {
    employeeId,
    correctAnswers: 0,
    wrongAnswers: 0,
    correctStreak: 0,
    lastAskedAt: null,
    totalResponseMs: 0,
    masteryScore: 0,
    lastResult: null,
  }
}

export function getTotalAnswers(progress: PersonProgress): number {
  return progress.correctAnswers + progress.wrongAnswers
}

/**
 * Returns an integer-friendly percentage between 0 and 100.
 */
export function getAccuracy(progress: PersonProgress): number {
  return getAccuracyRatio(progress) * 100
}

export function getAverageResponseMs(progress: PersonProgress): number {
  const total = getTotalAnswers(progress)
  return total === 0 ? 0 : progress.totalResponseMs / total
}

export function getLearningStatus(progress: PersonProgress): LearningStatus {
  const total = getTotalAnswers(progress)

  if (total === 0) {
    return 'Neu'
  }

  if (progress.masteryScore < 30) {
    return 'Unsicher'
  }

  if (progress.masteryScore < 60) {
    return 'In Übung'
  }

  if (progress.masteryScore < 85 || total < 8) {
    return 'Gut gelernt'
  }

  return 'Gemeistert'
}

export function getStatusMeta(status: LearningStatus): LearningStatusMeta {
  return STATUS_META[status]
}

export function getEmployeeName(
  employee: Employee,
  mode: NameMode = 'full',
): string {
  if (mode === 'first') {
    return employee.firstName
  }

  if (mode === 'last') {
    return employee.lastName
  }

  return `${employee.firstName} ${employee.lastName}`
}

/**
 * Calculates the selection weight used by weightedPickEmployee. This is
 * exported to make the adaptive behaviour transparent and easy to test.
 */
export function getSelectionWeight(
  employee: Employee,
  progressById: Readonly<Record<string, PersonProgress | undefined>>,
  askedCounts: Readonly<Record<string, number | undefined>> = {},
  adaptive = true,
  nowMs = Date.now(),
): number {
  const progress = progressById[employee.id]
  const timesAskedThisRound = Math.max(0, askedCounts[employee.id] ?? 0)
  const repeatPenalty = 1 / Math.pow(1 + timesAskedThisRound * 0.7, 1.35)

  if (!adaptive) {
    return Math.max(0.01, repeatPenalty)
  }

  if (!progress || getTotalAnswers(progress) === 0) {
    return ADAPTIVE_STATUS_WEIGHT.Neu * repeatPenalty
  }

  const status = getLearningStatus(progress)
  const errorRate = 1 - getAccuracyRatio(progress)
  const difficultyBoost = 1 + errorRate * 1.5
  const lastWrongBoost = progress.lastResult === 'wrong' ? 2.5 : 1
  let recencyFactor = 1.15

  if (progress.lastAskedAt) {
    const askedAtMs = new Date(progress.lastAskedAt).getTime()

    if (Number.isFinite(askedAtMs)) {
      const ageMs = Math.max(0, nowMs - askedAtMs)

      if (ageMs < 15_000) {
        recencyFactor = 0.45
      } else if (ageMs < 120_000) {
        recencyFactor = 0.75
      } else if (ageMs > 7 * 24 * 60 * 60 * 1_000) {
        recencyFactor = 1.35
      } else if (ageMs > 24 * 60 * 60 * 1_000) {
        recencyFactor = 1.2
      } else {
        recencyFactor = 1
      }
    }
  }

  return Math.max(
    0.01,
    ADAPTIVE_STATUS_WEIGHT[status] *
      difficultyBoost *
      lastWrongBoost *
      recencyFactor *
      repeatPenalty,
  )
}

/**
 * Selects a target without immediately repeating excludeId when another
 * employee is available. askedCounts softly balances a round while progress
 * makes difficult and recently failed people more likely.
 */
export function weightedPickEmployee(
  pool: readonly Employee[],
  progressById: Readonly<Record<string, PersonProgress | undefined>>,
  excludeId?: string | null,
  askedCounts: Readonly<Record<string, number | undefined>> = {},
  adaptive = true,
  random: () => number = Math.random,
): Employee {
  const uniquePool = uniqueEmployees(pool)

  if (uniquePool.length === 0) {
    throw new Error('Cannot select an employee from an empty pool.')
  }

  const candidates =
    uniquePool.length > 1 && excludeId
      ? uniquePool.filter((employee) => employee.id !== excludeId)
      : uniquePool
  const usableCandidates = candidates.length > 0 ? candidates : uniquePool
  const weights = usableCandidates.map((employee) =>
    getSelectionWeight(employee, progressById, askedCounts, adaptive),
  )
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor =
    clamp(random(), 0, 0.9999999999999999) *
    (Number.isFinite(totalWeight) && totalWeight > 0
      ? totalWeight
      : usableCandidates.length)

  for (let index = 0; index < usableCandidates.length; index += 1) {
    const weight =
      Number.isFinite(totalWeight) && totalWeight > 0 ? weights[index] : 1
    cursor -= weight

    if (cursor < 0) {
      return usableCandidates[index]
    }
  }

  return usableCandidates[usableCandidates.length - 1]
}

/**
 * Builds unique, shuffled multiple-choice options and always includes target.
 */
export function buildOptions(
  target: Employee,
  allEmployees: readonly Employee[],
  count = 4,
  random: () => number = Math.random,
): Employee[] {
  const safeCount = Math.max(1, Math.floor(Number.isFinite(count) ? count : 4))
  const distractors = uniqueEmployees(allEmployees).filter(
    (employee) => employee.id !== target.id,
  )
  const selectedDistractors = shuffled(distractors, random).slice(
    0,
    safeCount - 1,
  )

  return shuffled([target, ...selectedDistractors], random)
}

/**
 * Applies an answer immutably. Correct answers approach 100 gradually; a
 * mistake causes a meaningful drop and resets the consecutive-answer streak.
 */
export function applyAnswer(
  progress: PersonProgress,
  isCorrect: boolean,
  responseMs: number,
  askedAt: string | Date = new Date(),
): PersonProgress {
  const safeResponseMs =
    Number.isFinite(responseMs) && responseMs > 0
      ? Math.round(responseMs)
      : 0
  const currentMastery = clamp(progress.masteryScore, 0, 100)
  const masteryDelta = isCorrect
    ? 10 + Math.min(progress.correctStreak, 5)
    : -20

  return {
    ...progress,
    correctAnswers: progress.correctAnswers + (isCorrect ? 1 : 0),
    wrongAnswers: progress.wrongAnswers + (isCorrect ? 0 : 1),
    correctStreak: isCorrect ? progress.correctStreak + 1 : 0,
    lastAskedAt: toValidDate(askedAt).toISOString(),
    totalResponseMs: progress.totalResponseMs + safeResponseMs,
    masteryScore: Math.round(clamp(currentMastery + masteryDelta, 0, 100) * 10) / 10,
    lastResult: isCorrect ? 'correct' : 'wrong',
  }
}

export function getPersonStatistics(
  employee: Employee,
  progress?: PersonProgress,
): PersonStatistics {
  const safeProgress = progress ?? createEmptyProgress(employee.id)

  return {
    employee,
    progress: safeProgress,
    status: getLearningStatus(safeProgress),
    totalAnswers: getTotalAnswers(safeProgress),
    accuracy: getAccuracy(safeProgress),
    averageResponseMs: getAverageResponseMs(safeProgress),
  }
}

export function getHardestEmployees(
  employees: readonly Employee[],
  progressById: Readonly<Record<string, PersonProgress | undefined>>,
  limit = 3,
): PersonStatistics[] {
  const safeLimit = Math.max(0, Math.floor(Number.isFinite(limit) ? limit : 3))

  return employees
    .map((employee) =>
      getPersonStatistics(employee, progressById[employee.id]),
    )
    .filter((statistics) => statistics.totalAnswers > 0)
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy ||
        right.progress.wrongAnswers - left.progress.wrongAnswers ||
        right.totalAnswers - left.totalAnswers,
    )
    .slice(0, safeLimit)
}

export function getAggregateStatistics(
  employees: readonly Employee[],
  progressById: Readonly<Record<string, PersonProgress | undefined>>,
): AggregateStatistics {
  const statistics = employees.map((employee) =>
    getPersonStatistics(employee, progressById[employee.id]),
  )
  const correctAnswers = statistics.reduce(
    (sum, person) => sum + person.progress.correctAnswers,
    0,
  )
  const wrongAnswers = statistics.reduce(
    (sum, person) => sum + person.progress.wrongAnswers,
    0,
  )
  const totalAnswers = correctAnswers + wrongAnswers
  const totalResponseMs = statistics.reduce(
    (sum, person) => sum + person.progress.totalResponseMs,
    0,
  )
  const statusCounts: Record<LearningStatus, number> = {
    Neu: 0,
    Unsicher: 0,
    'In Übung': 0,
    'Gut gelernt': 0,
    Gemeistert: 0,
  }

  for (const person of statistics) {
    statusCounts[person.status] += 1
  }

  return {
    totalPeople: employees.length,
    introducedPeople: statistics.filter((person) => person.totalAnswers > 0)
      .length,
    learnedPeople: statistics.filter(
      (person) => getStatusMeta(person.status).rank >= 3,
    ).length,
    masteredPeople: statusCounts.Gemeistert,
    totalAnswers,
    correctAnswers,
    wrongAnswers,
    accuracy: totalAnswers === 0 ? 0 : (correctAnswers / totalAnswers) * 100,
    averageResponseMs: totalAnswers === 0 ? 0 : totalResponseMs / totalAnswers,
    statusCounts,
  }
}

export function getNewlyLearnedIds(
  before: Readonly<Record<string, PersonProgress | undefined>>,
  after: Readonly<Record<string, PersonProgress | undefined>>,
): string[] {
  return Object.keys(after).filter((employeeId) => {
    const afterProgress = after[employeeId]

    if (!afterProgress) {
      return false
    }

    const beforeProgress = before[employeeId] ?? createEmptyProgress(employeeId)
    const beforeRank = getStatusMeta(getLearningStatus(beforeProgress)).rank
    const afterRank = getStatusMeta(getLearningStatus(afterProgress)).rank

    return beforeRank < 3 && afterRank >= 3
  })
}
