export type NameMode = 'first' | 'last' | 'full'

export type Direction = 'photo-to-name' | 'name-to-photo'

export type RoundSize = 5 | 10 | 20 | 'unlimited'

export interface RoundConfig {
  nameMode: NameMode
  direction: Direction
  roundSize: RoundSize
  adaptive: boolean
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  spriteIndex: number
}

export type AnswerResult = 'correct' | 'wrong'

export interface PersonProgress {
  employeeId: string
  correctAnswers: number
  wrongAnswers: number
  correctStreak: number
  lastAskedAt: string | null
  totalResponseMs: number
  masteryScore: number
  lastResult: AnswerResult | null
}

export type LearningStatus =
  | 'Neu'
  | 'Unsicher'
  | 'In Übung'
  | 'Gut gelernt'
  | 'Gemeistert'

export interface LearningStatusMeta {
  label: LearningStatus
  description: string
  rank: number
  foreground: string
  background: string
}

export interface SessionPersonResult {
  employeeId: string
  correctAnswers: number
  wrongAnswers: number
  totalResponseMs: number
}

export interface SessionSummary {
  id: string
  startedAt: string
  completedAt: string
  config: RoundConfig
  correctAnswers: number
  wrongAnswers: number
  totalResponseMs: number
  personResults: SessionPersonResult[]
  newlyLearnedIds: string[]
}

export interface PersistedState {
  version: 2
  progressById: Record<string, PersonProgress>
  disabledPersonIds: string[]
  roundHistory: SessionSummary[]
  lastConfig: RoundConfig
}
