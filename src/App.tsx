import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
  type User,
} from 'firebase/auth'
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { LoaderCircle, X } from 'lucide-react'
import { BottomNav, type NavScreen } from './components/BottomNav'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ProfileMenu } from './components/ProfileMenu'
import {
  getAuthErrorMessage,
  normalizeTeamId,
  normalizeUsername,
  usernameToEmail,
  validateTeamId,
  validateUsername,
} from './lib/auth'
import { auth, db } from './lib/firebase'
import {
  applyAnswer,
  buildOptions,
  createEmptyProgress,
  expandLearningWindow,
  getAccuracy,
  getAggregateStatistics,
  getHardestEmployees,
  getLearningStatus,
  getNewlyLearnedIds,
  getTotalAnswers,
  LEARNING_WINDOW_MASTERY_RATIO,
  weightedPickEmployee,
} from './lib/learning'
import { AuthPage } from './pages/AuthPage'
import { HomePage, type PersonSummary } from './pages/HomePage'
import { PeoplePage, type NewPersonInput } from './pages/PeoplePage'
import { QuizPage } from './pages/QuizPage'
import { ResultsPage, type RoundResultView } from './pages/ResultsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import type {
  PersonalPerson,
  PersonProgress,
  RoundConfig,
  SessionPersonResult,
  SessionSummary,
  SharedPerson,
  UserProfile,
} from './types'

type Screen = NavScreen | 'quiz' | 'results'

type RetryItem = {
  employeeId: string
  dueQuestion: number
}

type ActiveRound = {
  config: RoundConfig
  target: PersonalPerson
  options: PersonalPerson[]
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

const DEFAULT_CONFIG: RoundConfig = {
  nameMode: 'full',
  direction: 'photo-to-name',
  roundSize: 5,
  adaptive: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toDateString(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null
}

function parseProfile(value: unknown): UserProfile | null {
  if (
    !isRecord(value) ||
    typeof value.username !== 'string' ||
    typeof value.teamId !== 'string'
  ) {
    return null
  }

  return {
    username: value.username,
    teamId: value.teamId,
    createdAt: toDateString(value.createdAt),
  }
}

function parsePersonalPerson(
  id: string,
  value: unknown,
): PersonalPerson | null {
  if (
    !isRecord(value) ||
    typeof value.firstName !== 'string' ||
    typeof value.lastName !== 'string' ||
    typeof value.imageData !== 'string' ||
    typeof value.correctCount !== 'number' ||
    typeof value.wrongCount !== 'number' ||
    typeof value.learningLevel !== 'number' ||
    (value.sourceShareId !== null &&
      typeof value.sourceShareId !== 'string')
  ) {
    return null
  }

  return {
    id,
    firstName: value.firstName,
    lastName: value.lastName,
    imageData: value.imageData,
    correctCount: value.correctCount,
    wrongCount: value.wrongCount,
    learningLevel: value.learningLevel,
    lastReviewed: toDateString(value.lastReviewed),
    sourceShareId: value.sourceShareId,
    createdAt: toDateString(value.createdAt),
  }
}

function parseSharedPerson(id: string, value: unknown): SharedPerson | null {
  if (
    !isRecord(value) ||
    typeof value.firstName !== 'string' ||
    typeof value.lastName !== 'string' ||
    typeof value.imageData !== 'string' ||
    typeof value.sharedByUid !== 'string' ||
    typeof value.sharedByName !== 'string' ||
    typeof value.originalPersonId !== 'string'
  ) {
    return null
  }

  return {
    id,
    firstName: value.firstName,
    lastName: value.lastName,
    imageData: value.imageData,
    sharedByUid: value.sharedByUid,
    sharedByName: value.sharedByName,
    originalPersonId: value.originalPersonId,
    createdAt: toDateString(value.createdAt),
  }
}

function toProgress(person: PersonalPerson): PersonProgress {
  return {
    employeeId: person.id,
    correctAnswers: person.correctCount,
    wrongAnswers: person.wrongCount,
    correctStreak: 0,
    lastAskedAt: person.lastReviewed,
    totalResponseMs: 0,
    masteryScore: person.learningLevel,
    lastResult: null,
  }
}

function cloneProgress(
  progress: Record<string, PersonProgress>,
): Record<string, PersonProgress> {
  return Object.fromEntries(
    Object.entries(progress).map(([id, value]) => [id, { ...value }]),
  )
}

function toPersonSummary(
  person: PersonalPerson,
  progressById: Record<string, PersonProgress>,
): PersonSummary {
  const progress = progressById[person.id] ?? createEmptyProgress(person.id)

  return {
    employee: person,
    status: getLearningStatus(progress),
    accuracy: Math.round(getAccuracy(progress)),
    totalAnswers: getTotalAnswers(progress),
  }
}

function createRoundId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `round-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function commitInBatches<Item>(
  items: readonly Item[],
  addToBatch: (
    batch: ReturnType<typeof writeBatch>,
    item: Item,
  ) => void,
): Promise<void> {
  const batchSize = 450

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = writeBatch(db)
    for (const item of items.slice(index, index + batchSize)) {
      addToBatch(batch, item)
    }
    await batch.commit()
  }
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="app-loading">
      <div className="text-center">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto animate-spin text-blue-600"
          size={28}
        />
        <p className="mt-3 text-sm font-semibold">{label}</p>
      </div>
    </main>
  )
}

function AuthenticatedApp({ user }: { user: User }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [peopleRecords, setPeopleRecords] = useState<PersonalPerson[]>([])
  const [sharedPeople, setSharedPeople] = useState<SharedPerson[]>([])
  const [sharedPeopleLoading, setSharedPeopleLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [config, setConfig] = useState<RoundConfig>(DEFAULT_CONFIG)
  const [roundHistory, setRoundHistory] = useState<SessionSummary[]>([])
  const [screen, setScreen] = useState<Screen>('home')
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [lastResult, setLastResult] = useState<RoundResultView | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          setProfile(snapshot.exists() ? parseProfile(snapshot.data()) : null)
          setProfileLoading(false)
        },
        () => {
          setDataError('Dein Benutzerprofil konnte nicht geladen werden.')
          setProfileLoading(false)
        },
      ),
    [user.uid],
  )

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users', user.uid, 'people'),
        (snapshot) => {
          const nextPeople = snapshot.docs
            .map((personDocument) =>
              parsePersonalPerson(personDocument.id, personDocument.data()),
            )
            .filter((person): person is PersonalPerson => person !== null)
            .sort(
              (left, right) =>
                left.firstName.localeCompare(right.firstName, 'de') ||
                left.lastName.localeCompare(right.lastName, 'de'),
            )

          setPeopleRecords(nextPeople)
          setPeopleLoading(false)
        },
        () => {
          setDataError('Deine Personen konnten nicht geladen werden.')
          setPeopleLoading(false)
        },
      ),
    [user.uid],
  )

  useEffect(() => {
    if (!profile?.teamId || screen !== 'people') {
      setSharedPeople([])
      setSharedPeopleLoading(false)
      return undefined
    }

    setSharedPeopleLoading(true)
    return onSnapshot(
      collection(db, 'teams', profile.teamId, 'sharedPeople'),
      (snapshot) => {
        const nextSharedPeople = snapshot.docs
          .map((sharedDocument) =>
            parseSharedPerson(sharedDocument.id, sharedDocument.data()),
          )
          .filter((person): person is SharedPerson => person !== null)
          .sort(
            (left, right) =>
              left.firstName.localeCompare(right.firstName, 'de') ||
              left.lastName.localeCompare(right.lastName, 'de'),
          )
        setSharedPeople(nextSharedPeople)
        setSharedPeopleLoading(false)
      },
      () => {
        setDataError('Die Team-Freigaben konnten nicht geladen werden.')
        setSharedPeopleLoading(false)
      },
    )
  }, [profile?.teamId, screen])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document
      .querySelector<HTMLElement>('.screen-transition > main')
      ?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [screen])

  const progressById = useMemo(
    () =>
      Object.fromEntries(
        peopleRecords.map((person) => [person.id, toProgress(person)]),
      ),
    [peopleRecords],
  )

  const people = useMemo(
    () =>
      peopleRecords.map((person) => toPersonSummary(person, progressById)),
    [peopleRecords, progressById],
  )

  const learningWindowIdsArray = useMemo(
    () => expandLearningWindow(peopleRecords, [], progressById),
    [peopleRecords, progressById],
  )
  const learningWindowIds = useMemo(
    () => new Set(learningWindowIdsArray),
    [learningWindowIdsArray],
  )
  const learningWindowPeople = useMemo(
    () => peopleRecords.filter((person) => learningWindowIds.has(person.id)),
    [learningWindowIds, peopleRecords],
  )

  const learningWindowMasteredCount = learningWindowPeople.filter(
    (person) =>
      getLearningStatus(
        progressById[person.id] ?? createEmptyProgress(person.id),
      ) === 'Gemeistert',
  ).length
  const waitingPeopleCount = peopleRecords.length - learningWindowPeople.length
  const nextWindowUnlockTarget =
    waitingPeopleCount > 0
      ? Math.ceil(
          learningWindowPeople.length * LEARNING_WINDOW_MASTERY_RATIO,
        )
      : 0

  const aggregate = useMemo(
    () => getAggregateStatistics(peopleRecords, progressById),
    [peopleRecords, progressById],
  )

  const difficultPeople = useMemo(
    () =>
      getHardestEmployees(learningWindowPeople, progressById, 5).map(
        ({ employee }) => {
          const person = peopleRecords.find(
            (candidate) => candidate.id === employee.id,
          )
          return person ? toPersonSummary(person, progressById) : null
        },
      ).filter((person): person is PersonSummary => person !== null),
    [learningWindowPeople, peopleRecords, progressById],
  )

  const averageProgress =
    peopleRecords.length > 0
      ? Math.round(
          peopleRecords.reduce(
            (sum, person) => sum + person.learningLevel,
            0,
          ) / peopleRecords.length,
        )
      : 0

  const changeConfig = (nextConfig: RoundConfig) => {
    setConfig(nextConfig)
  }

  const startRound = (
    roundConfig: RoundConfig = config,
    requestedPoolIds: string[] | null = null,
  ) => {
    const validPool = requestedPoolIds
      ? learningWindowPeople.filter((person) =>
          requestedPoolIds.includes(person.id),
        )
      : [...learningWindowPeople]
    const pool = validPool.length > 0 ? validPool : [...learningWindowPeople]

    if (pool.length === 0) {
      setDataError('Füge zuerst mindestens eine Person zu deiner Liste hinzu.')
      setScreen('people')
      return
    }

    const target = weightedPickEmployee(
      pool,
      progressById,
      null,
      {},
      roundConfig.adaptive,
    ) as PersonalPerson

    setConfig(roundConfig)
    setLastResult(null)
    setActiveRound({
      config: roundConfig,
      target,
      options: buildOptions(target, learningWindowPeople) as PersonalPerson[],
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
      progressAtStart: cloneProgress(progressById),
      poolIds: requestedPoolIds,
    })
    setScreen('quiz')
  }

  const answerQuestion = (employeeId: string) => {
    if (!activeRound || activeRound.selectedId !== null) return

    const isCorrect = employeeId === activeRound.target.id
    const responseMs = Math.max(0, Date.now() - activeRound.questionStartedAt)
    const targetId = activeRound.target.id
    const previousProgress =
      progressById[targetId] ?? createEmptyProgress(targetId)
    const nextProgress = applyAnswer(previousProgress, isCorrect, responseMs)
    const reviewedAt = new Date().toISOString()

    setPeopleRecords((previous) =>
      previous.map((person) =>
        person.id === targetId
          ? {
              ...person,
              correctCount: nextProgress.correctAnswers,
              wrongCount: nextProgress.wrongAnswers,
              learningLevel: nextProgress.masteryScore,
              lastReviewed: reviewedAt,
            }
          : person,
      ),
    )

    void updateDoc(doc(db, 'users', user.uid, 'people', targetId), {
      correctCount: increment(isCorrect ? 1 : 0),
      wrongCount: increment(isCorrect ? 0 : 1),
      learningLevel: nextProgress.masteryScore,
      lastReviewed: serverTimestamp(),
    }).catch(() => {
      setDataError('Der Lernfortschritt konnte nicht gespeichert werden.')
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
              ...previous.retryQueue.filter(
                (item) => item.employeeId !== targetId,
              ),
              {
                employeeId: targetId,
                dueQuestion: previous.questionNumber + 2,
              },
            ],
        personResults: {
          ...previous.personResults,
          [targetId]: {
            employeeId: targetId,
            correctAnswers:
              previousPersonResult.correctAnswers + (isCorrect ? 1 : 0),
            wrongAnswers:
              previousPersonResult.wrongAnswers + (isCorrect ? 0 : 1),
            totalResponseMs:
              previousPersonResult.totalResponseMs + responseMs,
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
      progressById,
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

    setRoundHistory((previous) => [...previous, session].slice(-50))

    const wrongPeople = activeRound.wrongPersonIds
      .map((id) => peopleRecords.find((person) => person.id === id))
      .filter((person): person is PersonalPerson => Boolean(person))
      .map((person) => toPersonSummary(person, progressById))
    const improvedPeople = improvedIds
      .map((id) => peopleRecords.find((person) => person.id === id))
      .filter((person): person is PersonalPerson => Boolean(person))
      .map((person) => toPersonSummary(person, progressById))

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
      ? learningWindowPeople.filter((person) =>
          activeRound.poolIds?.includes(person.id),
        )
      : [...learningWindowPeople]
    const pool = allPool.length > 0 ? allPool : [...learningWindowPeople]

    if (pool.length === 0) {
      finishRound()
      return
    }

    const dueRetry = activeRound.retryQueue.find(
      (item) =>
        item.dueQuestion <= nextQuestion &&
        item.employeeId !== activeRound.target.id &&
        pool.some((person) => person.id === item.employeeId),
    )
    const retryTarget = dueRetry
      ? pool.find((person) => person.id === dueRetry.employeeId)
      : undefined
    const target = (retryTarget ??
      weightedPickEmployee(
        pool,
        progressById,
        activeRound.target.id,
        activeRound.askedCounts,
        activeRound.config.adaptive,
      )) as PersonalPerson

    setActiveRound({
      ...activeRound,
      target,
      options: buildOptions(target, learningWindowPeople) as PersonalPerson[],
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

  const addPerson = async (person: NewPersonInput) => {
    await addDoc(collection(db, 'users', user.uid, 'people'), {
      firstName: person.firstName,
      lastName: person.lastName,
      imageData: person.imageData,
      correctCount: 0,
      wrongCount: 0,
      learningLevel: 0,
      lastReviewed: null,
      sourceShareId: null,
      createdAt: serverTimestamp(),
    })
  }

  const deletePerson = async (personId: string) => {
    await deleteDoc(doc(db, 'users', user.uid, 'people', personId))
  }

  const resetPersonProgress = async (personId: string) => {
    await updateDoc(doc(db, 'users', user.uid, 'people', personId), {
      correctCount: 0,
      wrongCount: 0,
      learningLevel: 0,
      lastReviewed: null,
    })
  }

  const sharePerson = async (personId: string) => {
    if (!profile) {
      throw new Error('Dein Team-Profil ist noch nicht verfügbar.')
    }

    const person = peopleRecords.find((candidate) => candidate.id === personId)
    if (!person) {
      throw new Error('Die Person wurde nicht gefunden.')
    }

    if (person.sourceShareId) {
      throw new Error(
        'Übernommene Team-Personen können nicht erneut geteilt werden.',
      )
    }

    const shareId = `${user.uid}_${person.id}`
    const shareReference = doc(
      db,
      'teams',
      profile.teamId,
      'sharedPeople',
      shareId,
    )

    await setDoc(
      shareReference,
      {
        firstName: person.firstName,
        lastName: person.lastName,
        imageData: person.imageData,
        sharedByUid: user.uid,
        sharedByName: profile.username,
        originalPersonId: person.id,
        createdAt: serverTimestamp(),
      },
      { merge: false },
    )
  }

  const removeSharedPerson = async (sharedPerson: SharedPerson) => {
    if (!profile || sharedPerson.sharedByUid !== user.uid) {
      throw new Error('Nur deine eigenen Freigaben kannst du entfernen.')
    }

    await deleteDoc(
      doc(
        db,
        'teams',
        profile.teamId,
        'sharedPeople',
        sharedPerson.id,
      ),
    )
  }

  const addSharedPerson = async (sharedPerson: SharedPerson) => {
    const personalCopyId = `shared_${sharedPerson.id}`
    await setDoc(
      doc(db, 'users', user.uid, 'people', personalCopyId),
      {
        firstName: sharedPerson.firstName,
        lastName: sharedPerson.lastName,
        imageData: sharedPerson.imageData,
        correctCount: 0,
        wrongCount: 0,
        learningLevel: 0,
        lastReviewed: null,
        sourceShareId: sharedPerson.id,
        createdAt: serverTimestamp(),
      },
      { merge: false },
    )
  }

  const loadTeamSharesForMutation = async (): Promise<SharedPerson[]> => {
    if (!profile) {
      return []
    }

    if (screen === 'people' && !sharedPeopleLoading) {
      return sharedPeople
    }

    const snapshot = await getDocs(
      collection(db, 'teams', profile.teamId, 'sharedPeople'),
    )
    return snapshot.docs
      .map((sharedDocument) =>
        parseSharedPerson(sharedDocument.id, sharedDocument.data()),
      )
      .filter((person): person is SharedPerson => person !== null)
  }

  const reauthenticate = async (currentPassword: string) => {
    if (!profile) {
      throw new Error('Dein Profil ist noch nicht verfügbar.')
    }

    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(
          usernameToEmail(profile.username),
          currentPassword,
        ),
      )
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }

  const changeUsername = async (
    nextUsername: string,
    currentPassword: string,
  ) => {
    if (!profile) {
      throw new Error('Dein Profil ist noch nicht verfügbar.')
    }

    const validationError = validateUsername(nextUsername)
    if (validationError) {
      throw new Error(validationError)
    }

    const normalizedUsername = normalizeUsername(nextUsername)
    if (normalizedUsername === profile.username) {
      return
    }

    await reauthenticate(currentPassword)

    try {
      await updateEmail(user, usernameToEmail(normalizedUsername))
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }

    try {
      const batch = writeBatch(db)
      const teamShares = await loadTeamSharesForMutation()
      batch.update(doc(db, 'users', user.uid), {
        username: normalizedUsername,
      })
      for (const sharedPerson of teamShares) {
        if (sharedPerson.sharedByUid === user.uid) {
          batch.update(
            doc(
              db,
              'teams',
              profile.teamId,
              'sharedPeople',
              sharedPerson.id,
            ),
            { sharedByName: normalizedUsername },
          )
        }
      }
      await batch.commit()
    } catch {
      await updateEmail(user, usernameToEmail(profile.username)).catch(
        () => undefined,
      )
      throw new Error('Der Benutzername konnte nicht gespeichert werden.')
    }
  }

  const changePassword = async (
    currentPassword: string,
    nextPassword: string,
  ) => {
    if (nextPassword.length < 6) {
      throw new Error('Das neue Passwort muss mindestens 6 Zeichen lang sein.')
    }

    await reauthenticate(currentPassword)

    try {
      await updatePassword(user, nextPassword)
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }

  const changeTeam = async (nextTeamId: string) => {
    if (!profile) {
      throw new Error('Dein Profil ist noch nicht verfügbar.')
    }

    const validationError = validateTeamId(nextTeamId)
    if (validationError) {
      throw new Error(validationError)
    }

    const normalizedTeamId = normalizeTeamId(nextTeamId)
    if (normalizedTeamId === profile.teamId) {
      return
    }

    const teamShares = await loadTeamSharesForMutation()
    const batch = writeBatch(db)
    for (const sharedPerson of teamShares) {
      if (sharedPerson.sharedByUid === user.uid) {
        batch.delete(
          doc(
            db,
            'teams',
            profile.teamId,
            'sharedPeople',
            sharedPerson.id,
          ),
        )
      }
    }
    batch.update(doc(db, 'users', user.uid), {
      teamId: normalizedTeamId,
    })
    await batch.commit()
  }

  const resetAllProgress = async () => {
    await commitInBatches(peopleRecords, (batch, person) => {
      batch.update(doc(db, 'users', user.uid, 'people', person.id), {
        correctCount: 0,
        wrongCount: 0,
        learningLevel: 0,
        lastReviewed: null,
      })
    })
    setRoundHistory([])
  }

  const deleteProfile = async (currentPassword: string) => {
    if (!profile) {
      throw new Error('Dein Profil ist noch nicht verfügbar.')
    }

    await reauthenticate(currentPassword)
    const teamShares = await loadTeamSharesForMutation()

    await commitInBatches(peopleRecords, (batch, person) => {
      batch.delete(doc(db, 'users', user.uid, 'people', person.id))
    })

    const ownSharedPeople = teamShares.filter(
      (sharedPerson) => sharedPerson.sharedByUid === user.uid,
    )
    await commitInBatches(ownSharedPeople, (batch, sharedPerson) => {
      batch.delete(
        doc(
          db,
          'teams',
          profile.teamId,
          'sharedPeople',
          sharedPerson.id,
        ),
      )
    })

    await deleteDoc(doc(db, 'users', user.uid))

    try {
      await deleteUser(user)
    } catch {
      throw new Error(
        'Die Kontodaten wurden entfernt, aber der Login konnte nicht gelöscht werden. Bitte melde dich erneut an.',
      )
    }
  }

  const navigate = (destination: NavScreen) => {
    setExitDialogOpen(false)
    setScreen(destination)
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch {
      setDataError('Die Abmeldung ist fehlgeschlagen. Bitte versuche es erneut.')
    }
  }

  if (profileLoading || peopleLoading) {
    return <LoadingScreen label="Deine Daten werden geladen …" />
  }

  if (!profile) {
    return (
      <main className="app-loading">
        <div className="max-w-sm text-center">
          <p className="font-semibold text-[#102142]">
            Dein Benutzerprofil wurde nicht gefunden.
          </p>
          <button
            className="primary-button mt-4 min-h-12 rounded-2xl px-5 text-sm font-semibold"
            onClick={() => void logout()}
            type="button"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </main>
    )
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
          history={[...roundHistory]
            .reverse()
            .map((round) => ({
              id: round.id,
              finishedAt: round.completedAt,
              correct: round.correctAnswers,
              total: round.correctAnswers + round.wrongAnswers,
            }))}
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
          currentUid={user.uid}
          learningWindowIds={learningWindowIds}
          onAddPerson={addPerson}
          onAddSharedPerson={addSharedPerson}
          onDeletePerson={deletePerson}
          onRemoveSharedPerson={removeSharedPerson}
          onResetPersonProgress={resetPersonProgress}
          onSharePerson={sharePerson}
          people={people}
          sharedPeople={sharedPeople}
          sharedPeopleLoading={sharedPeopleLoading}
          teamId={profile.teamId}
        />
      )
    }

    return (
      <HomePage
        difficultPeople={difficultPeople}
        hasHistory={roundHistory.length > 0}
        knownPeople={aggregate.learnedPeople}
        learningWindowCount={learningWindowPeople.length}
        learningWindowMasteredCount={learningWindowMasteredCount}
        masteredPeople={aggregate.masteredPeople}
        nextWindowUnlockTarget={nextWindowUnlockTarget}
        onOpenSettings={() => setScreen('settings')}
        onQuickStart={() => startRound(config)}
        onRepeatDifficult={startDifficultRound}
        progressPercent={averageProgress}
        totalPeople={aggregate.totalPeople}
        waitingPeopleCount={waitingPeopleCount}
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
      {screen !== 'quiz' ? (
        <>
          <ProfileMenu
            onChangePassword={changePassword}
            onChangeTeam={changeTeam}
            onChangeUsername={changeUsername}
            onDeleteProfile={deleteProfile}
            onLogout={logout}
            onResetProgress={resetAllProgress}
            teamId={profile.teamId}
            username={profile.username}
          />
          <BottomNav active={navActive} onNavigate={navigate} />
        </>
      ) : null}
      {dataError ? (
        <div aria-live="polite" className="app-error" role="alert">
          <span>{dataError}</span>
          <button
            aria-label="Fehlermeldung schließen"
            onClick={() => setDataError(null)}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
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

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(
    () =>
      onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser)
      }),
    [],
  )

  if (user === undefined) {
    return <LoadingScreen label="Anmeldung wird geprüft …" />
  }

  if (!user) {
    return <AuthPage />
  }

  return <AuthenticatedApp key={user.uid} user={user} />
}

export default App
