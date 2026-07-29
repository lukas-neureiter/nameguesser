import { EMPLOYEES } from '../data/employees'
import type {
  AnswerResult,
  Direction,
  NameMode,
  PersistedState,
  PersonProgress,
  RoundConfig,
  RoundSize,
  SessionPersonResult,
  SessionSummary,
} from '../types'
import {
  createEmptyProgress,
  expandLearningWindow,
  getTotalAnswers,
} from './learning'

export const STORAGE_VERSION = 2 as const
export const STORAGE_KEY = 'nameguesser:learning-state'

export const DEFAULT_ROUND_CONFIG: RoundConfig = {
  nameMode: 'full',
  direction: 'photo-to-name',
  roundSize: 10,
  adaptive: true,
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(
  value: unknown,
  fallback: number,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, value))
}

function wholeNumber(
  value: unknown,
  fallback = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  return Math.floor(finiteNumber(value, fallback, 0, maximum))
}

function validIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function sanitizeNameMode(value: unknown): NameMode {
  if (value === 'first' || value === 'firstName') {
    return 'first'
  }

  if (value === 'last' || value === 'lastName') {
    return 'last'
  }

  return 'full'
}

function sanitizeDirection(value: unknown): Direction {
  if (value === 'name-to-photo' || value === 'nameToPhoto') {
    return 'name-to-photo'
  }

  return 'photo-to-name'
}

function sanitizeRoundSize(value: unknown): RoundSize {
  if (value === 5 || value === 10 || value === 20) {
    return value
  }

  if (value === 'unlimited' || value === 'unbegrenzt') {
    return 'unlimited'
  }

  return DEFAULT_ROUND_CONFIG.roundSize
}

function sanitizeConfig(value: unknown): RoundConfig {
  if (!isRecord(value)) {
    return { ...DEFAULT_ROUND_CONFIG }
  }

  return {
    nameMode: sanitizeNameMode(value.nameMode),
    direction: sanitizeDirection(value.direction),
    roundSize: sanitizeRoundSize(value.roundSize),
    adaptive:
      typeof value.adaptive === 'boolean'
        ? value.adaptive
        : DEFAULT_ROUND_CONFIG.adaptive,
  }
}

function sanitizeLastResult(value: unknown): AnswerResult | null {
  return value === 'correct' || value === 'wrong' ? value : null
}

function fallbackMastery(
  correctAnswers: number,
  wrongAnswers: number,
  correctStreak: number,
): number {
  const total = correctAnswers + wrongAnswers

  if (total === 0) {
    return 0
  }

  return Math.min(
    100,
    (correctAnswers / total) * 70 + Math.min(correctStreak, 5) * 6,
  )
}

function sanitizeProgress(
  employeeId: string,
  value: unknown,
): PersonProgress {
  if (!isRecord(value)) {
    return createEmptyProgress(employeeId)
  }

  const correctAnswers = wholeNumber(
    value.correctAnswers ?? value.correct,
  )
  const wrongAnswers = wholeNumber(value.wrongAnswers ?? value.wrong)
  const correctStreak = wholeNumber(
    value.correctStreak ?? value.streak,
    0,
    correctAnswers,
  )
  const derivedMastery = fallbackMastery(
    correctAnswers,
    wrongAnswers,
    correctStreak,
  )
  const lastResult =
    sanitizeLastResult(value.lastResult) ??
    (correctAnswers + wrongAnswers > 0
      ? correctStreak > 0
        ? 'correct'
        : 'wrong'
      : null)

  return {
    employeeId,
    correctAnswers,
    wrongAnswers,
    correctStreak,
    lastAskedAt: validIsoDate(value.lastAskedAt),
    totalResponseMs: wholeNumber(value.totalResponseMs),
    masteryScore:
      Math.round(
        finiteNumber(value.masteryScore, derivedMastery, 0, 100) * 10,
      ) / 10,
    lastResult,
  }
}

function sanitizeProgressById(
  value: unknown,
): Record<string, PersonProgress> {
  const source = isRecord(value) ? value : {}

  return Object.fromEntries(
    EMPLOYEES.map((employee) => [
      employee.id,
      sanitizeProgress(employee.id, source[employee.id]),
    ]),
  )
}

function sanitizeDisabledPersonIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const employeeIds = new Set(EMPLOYEES.map((employee) => employee.id))
  const disabledIds = [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === 'string' && employeeIds.has(id),
      ),
    ),
  ]

  return disabledIds.length < EMPLOYEES.length
    ? disabledIds
    : disabledIds.slice(0, -1)
}

function sanitizeLearningWindowIds(
  value: unknown,
  progressById: Record<string, PersonProgress>,
  disabledPersonIds: readonly string[],
): string[] {
  const employeeIds = new Set(EMPLOYEES.map((employee) => employee.id))
  const storedIds = Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === 'string' && employeeIds.has(id),
          ),
        ),
      ]
    : []
  const introducedIds = EMPLOYEES.filter(
    (employee) => getTotalAnswers(progressById[employee.id]) > 0,
  ).map((employee) => employee.id)
  const currentIds = [...new Set([...storedIds, ...introducedIds])]
  const disabledIds = new Set(disabledPersonIds)
  const activeEmployees = EMPLOYEES.filter(
    (employee) => !disabledIds.has(employee.id),
  )

  return expandLearningWindow(activeEmployees, currentIds, progressById)
}

function sanitizePersonResult(value: unknown): SessionPersonResult | null {
  if (!isRecord(value) || typeof value.employeeId !== 'string') {
    return null
  }

  if (!EMPLOYEES.some((employee) => employee.id === value.employeeId)) {
    return null
  }

  return {
    employeeId: value.employeeId,
    correctAnswers: wholeNumber(value.correctAnswers),
    wrongAnswers: wholeNumber(value.wrongAnswers),
    totalResponseMs: wholeNumber(value.totalResponseMs),
  }
}

function sanitizeSession(value: unknown, index: number): SessionSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const completedAt = validIsoDate(value.completedAt)

  if (!completedAt) {
    return null
  }

  const personResults = Array.isArray(value.personResults)
    ? value.personResults
        .map(sanitizePersonResult)
        .filter((result): result is SessionPersonResult => result !== null)
    : []
  const employeeIds = new Set(EMPLOYEES.map((employee) => employee.id))
  const newlyLearnedIds = Array.isArray(value.newlyLearnedIds)
    ? [
        ...new Set(
          value.newlyLearnedIds.filter(
            (id): id is string =>
              typeof id === 'string' && employeeIds.has(id),
          ),
        ),
      ]
    : []

  return {
    id:
      typeof value.id === 'string' && value.id.length > 0
        ? value.id
        : `restored-round-${index}`,
    startedAt: validIsoDate(value.startedAt) ?? completedAt,
    completedAt,
    config: sanitizeConfig(value.config),
    correctAnswers: wholeNumber(value.correctAnswers),
    wrongAnswers: wholeNumber(value.wrongAnswers),
    totalResponseMs: wholeNumber(value.totalResponseMs),
    personResults,
    newlyLearnedIds,
  }
}

function sanitizeRoundHistory(value: unknown): SessionSummary[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .slice(-100)
    .map(sanitizeSession)
    .filter((session): session is SessionSummary => session !== null)
}

function stateFromUnknown(value: unknown): PersistedState | null {
  if (!isRecord(value)) {
    return null
  }

  const version = value.version

  if (
    version !== undefined &&
    version !== 0 &&
    version !== STORAGE_VERSION
  ) {
    return null
  }

  const progressById = sanitizeProgressById(
    value.progressById ?? value.progress,
  )
  const disabledPersonIds = sanitizeDisabledPersonIds(value.disabledPersonIds)

  return {
    version: STORAGE_VERSION,
    progressById,
    disabledPersonIds,
    learningWindowIds: sanitizeLearningWindowIds(
      value.learningWindowIds,
      progressById,
      disabledPersonIds,
    ),
    roundHistory: sanitizeRoundHistory(
      value.roundHistory ?? value.sessions,
    ),
    lastConfig: sanitizeConfig(value.lastConfig ?? value.config),
  }
}

export function createDefaultState(): PersistedState {
  const progressById = Object.fromEntries(
    EMPLOYEES.map((employee) => [
      employee.id,
      createEmptyProgress(employee.id),
    ]),
  )

  return {
    version: STORAGE_VERSION,
    progressById,
    disabledPersonIds: [],
    learningWindowIds: expandLearningWindow(EMPLOYEES, [], progressById),
    roundHistory: [],
    lastConfig: { ...DEFAULT_ROUND_CONFIG },
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Loads and validates persisted data. Missing, corrupt, or unsupported future
 * data falls back safely to a fresh state. Version 0/unversioned shapes are
 * migrated to the current schema.
 */
export function loadState(
  storage: Storage | null = getBrowserStorage(),
): PersistedState {
  if (!storage) {
    return createDefaultState()
  }

  try {
    const serialized = storage.getItem(STORAGE_KEY)

    if (!serialized) {
      return createDefaultState()
    }

    return stateFromUnknown(JSON.parse(serialized)) ?? createDefaultState()
  } catch {
    return createDefaultState()
  }
}

/**
 * Persists only a validated, current-version state and reports whether the
 * write succeeded (for example, localStorage may be unavailable or full).
 */
export function saveState(
  state: PersistedState,
  storage: Storage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false
  }

  try {
    const normalized = stateFromUnknown(state)

    if (!normalized) {
      return false
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}
