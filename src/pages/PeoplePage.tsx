import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  Check,
  ImagePlus,
  LoaderCircle,
  MoreVertical,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { ActionConfirmDialog } from '../components/ConfirmDialog'
import { ImageCropper } from '../components/ImageCropper'
import { PageHeader } from '../components/PageHeader'
import { PersonRow } from '../components/PersonRow'
import type { LearningStatus, SharedPerson } from '../types'
import type { PersonSummary } from './HomePage'

export type NewPersonInput = {
  firstName: string
  lastName: string
  imageData: string
}

type FilterValue = 'Alle' | LearningStatus

type PendingPersonAction = {
  kind: 'reset' | 'delete'
  personId: string
  fullName: string
}

type PeoplePageProps = {
  people: PersonSummary[]
  learningWindowIds: ReadonlySet<string>
  sharedPeople: SharedPerson[]
  sharedPeopleLoading: boolean
  currentUid: string
  teamId: string
  onAddPerson: (person: NewPersonInput) => Promise<void>
  onDeletePerson: (personId: string) => Promise<void>
  onRemoveSharedPerson: (person: SharedPerson) => Promise<void>
  onResetPersonProgress: (personId: string) => Promise<void>
  onSharePerson: (personId: string) => Promise<void>
  onAddSharedPerson: (person: SharedPerson) => Promise<void>
}

const filters: FilterValue[] = [
  'Alle',
  'Neu',
  'Unsicher',
  'In Übung',
  'Gut gelernt',
  'Gemeistert',
]

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Die Aktion ist fehlgeschlagen. Bitte versuche es erneut.'
}

export function PeoplePage({
  people,
  learningWindowIds,
  sharedPeople,
  sharedPeopleLoading,
  currentUid,
  teamId,
  onAddPerson,
  onDeletePerson,
  onRemoveSharedPerson,
  onResetPersonProgress,
  onSharePerson,
  onAddSharedPerson,
}: PeoplePageProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterValue>('Alle')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [imageData, setImageData] = useState('')
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [savingPerson, setSavingPerson] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [openPersonMenuId, setOpenPersonMenuId] = useState<string | null>(null)
  const [pendingPersonAction, setPendingPersonAction] =
    useState<PendingPersonAction | null>(null)
  const [personMenuPlacement, setPersonMenuPlacement] = useState<
    'above' | 'below'
  >('below')
  const normalizedQuery = query.trim().toLocaleLowerCase('de')
  const processingImage = cropFile !== null

  useEffect(() => {
    if (!openPersonMenuId) return undefined

    const closeMenu = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        !target.closest('.person-menu-wrap')
      ) {
        setOpenPersonMenuId(null)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [openPersonMenuId])

  const visiblePeople = useMemo(
    () =>
      people.filter((person) => {
        const name =
          `${person.employee.firstName} ${person.employee.lastName}`.toLocaleLowerCase(
            'de',
          )
        const matchesSearch = !normalizedQuery || name.includes(normalizedQuery)
        const matchesFilter = filter === 'Alle' || person.status === filter
        return matchesSearch && matchesFilter
      }),
    [filter, normalizedQuery, people],
  )

  const importedShareIds = useMemo(
    () =>
      new Set(
        people
          .map((person) => person.employee.sourceShareId)
          .filter((shareId): shareId is string => Boolean(shareId)),
      ),
    [people],
  )

  const ownSharedPersonIds = useMemo(
    () =>
      new Set(
        sharedPeople
          .filter((person) => person.sharedByUid === currentUid)
          .map((person) => person.originalPersonId),
      ),
    [currentUid, sharedPeople],
  )

  const changeImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || processingImage) return

    setFormError(null)
    if (!file.type.startsWith('image/')) {
      setFormError('Bitte wähle eine Bilddatei aus.')
      return
    }
    setCropFile(file)
  }

  const submitPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (savingPerson || processingImage) return

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    if (!trimmedFirstName || !trimmedLastName || !imageData) {
      setFormError('Bitte gib Vor- und Nachname ein und wähle ein Bild aus.')
      return
    }

    setSavingPerson(true)
    setFormError(null)

    try {
      await onAddPerson({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        imageData,
      })
      setFirstName('')
      setLastName('')
      setImageData('')
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setSavingPerson(false)
    }
  }

  const runAction = async (
    key: string,
    action: () => Promise<void>,
  ): Promise<boolean> => {
    if (actionKey) return false
    setActionKey(key)
    setActionError(null)

    try {
      await action()
      return true
    } catch (error) {
      setActionError(getErrorMessage(error))
      return false
    } finally {
      setActionKey(null)
    }
  }

  const deletePerson = (personId: string, fullName: string) => {
    setOpenPersonMenuId(null)
    setActionError(null)
    setPendingPersonAction({ kind: 'delete', personId, fullName })
  }

  const resetPerson = (personId: string, fullName: string) => {
    setOpenPersonMenuId(null)
    setActionError(null)
    setPendingPersonAction({ kind: 'reset', personId, fullName })
  }

  const confirmPersonAction = async () => {
    if (!pendingPersonAction) return

    const { kind, personId } = pendingPersonAction
    const succeeded = await runAction(`${kind}-${personId}`, () =>
      kind === 'delete'
        ? onDeletePerson(personId)
        : onResetPersonProgress(personId),
    )

    if (succeeded) {
      setPendingPersonAction(null)
    }
  }

  const trimmedQuery = query.trim()
  const resultLabel = normalizedQuery
    ? visiblePeople.length === 0
      ? `Keine Treffer für „${trimmedQuery}“`
      : `${visiblePeople.length} Treffer für „${trimmedQuery}“`
    : filter === 'Alle'
      ? 'Meine Personen'
      : filter

  return (
    <main className="page page-people">
      <PageHeader
        subtitle={`Deine persönliche Liste und Freigaben aus Team „${teamId}“.`}
        title="Personen"
      />

      <section className="person-add-card surface rounded-[24px] p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <ImagePlus aria-hidden="true" size={22} />
          </span>
          <h2 className="text-lg font-extrabold text-[#102142]">
            Person hinzufügen
          </h2>
        </div>

        <form className="person-add-form mt-4 grid gap-3" onSubmit={submitPerson}>
          <div className="person-name-grid grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Vorname
              <input
                autoComplete="off"
                className="person-name-input min-h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-[#102142]"
                maxLength={80}
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Nachname
              <input
                autoComplete="off"
                className="person-name-input min-h-12 min-w-0 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-[#102142]"
                maxLength={80}
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </label>
          </div>

          <div className="person-image-picker flex items-center gap-3">
            {imageData ? (
              <Avatar
                className="h-16 w-16 ring-2 ring-white"
                imageData={imageData}
                label="Vorschau des ausgewählten Bildes"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                {processingImage ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={23} />
                ) : (
                  <ImagePlus aria-hidden="true" size={23} />
                )}
              </span>
            )}
            <label className="person-image-button flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-semibold text-blue-700">
              {processingImage ? 'Bild wird verarbeitet …' : 'Bild auswählen'}
              <input
                accept="image/*"
                className="sr-only"
                disabled={processingImage || savingPerson}
                onChange={changeImage}
                type="file"
              />
            </label>
          </div>

          {formError ? (
            <p
              aria-live="polite"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <button
            className="primary-button flex min-h-13 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
            disabled={savingPerson || processingImage || !imageData}
            type="submit"
          >
            {savingPerson ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
            ) : (
              <UserPlus aria-hidden="true" size={18} />
            )}
            {savingPerson ? 'Wird gespeichert …' : 'Zu meiner Liste hinzufügen'}
          </button>
        </form>
      </section>

      <section className="surface mt-4 rounded-[24px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#102142]">
              Vom Team geteilt
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {sharedPeople.length} {sharedPeople.length === 1 ? 'Freigabe' : 'Freigaben'}
            </p>
          </div>
          <UsersRound aria-hidden="true" className="text-blue-600" size={22} />
        </div>

        {sharedPeopleLoading ? (
          <div className="grid min-h-24 place-items-center text-blue-600">
            <LoaderCircle
              aria-label="Teamfreigaben werden geladen"
              className="animate-spin"
              size={22}
            />
          </div>
        ) : sharedPeople.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-100">
            {sharedPeople.map((sharedPerson) => {
              const isOriginalOwner =
                sharedPerson.sharedByUid === currentUid &&
                people.some(
                  (person) => person.employee.id === sharedPerson.originalPersonId,
                )
              const alreadyAdded =
                importedShareIds.has(sharedPerson.id) || isOriginalOwner
              const pending = actionKey === `add-share-${sharedPerson.id}`
              const removePending =
                actionKey === `remove-share-${sharedPerson.id}`
              const canRemove = sharedPerson.sharedByUid === currentUid

              return (
                <div className="flex items-center gap-3 py-3" key={sharedPerson.id}>
                  <Avatar
                    className="h-14 w-14 ring-2 ring-white"
                    imageData={sharedPerson.imageData}
                    label={`Porträt von ${sharedPerson.firstName} ${sharedPerson.lastName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#102142]">
                      {sharedPerson.firstName} {sharedPerson.lastName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      Geteilt von {sharedPerson.sharedByName}
                    </p>
                  </div>
                  <button
                    aria-label={`${sharedPerson.firstName} ${sharedPerson.lastName} zu meiner Liste hinzufügen`}
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-blue-50 px-3 text-blue-700 disabled:bg-emerald-50 disabled:text-emerald-600"
                    disabled={alreadyAdded || Boolean(actionKey)}
                    onClick={() =>
                      void runAction(`add-share-${sharedPerson.id}`, () =>
                        onAddSharedPerson(sharedPerson),
                      )
                    }
                    title={
                      alreadyAdded
                        ? 'Bereits in deiner Liste'
                        : 'Zu meiner Liste hinzufügen'
                    }
                    type="button"
                  >
                    {pending ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="animate-spin"
                        size={18}
                      />
                    ) : alreadyAdded ? (
                      <Check aria-hidden="true" size={19} />
                    ) : (
                      <UserPlus aria-hidden="true" size={19} />
                    )}
                  </button>
                  {canRemove ? (
                    <button
                      aria-label={`${sharedPerson.firstName} ${sharedPerson.lastName} aus den Teamfreigaben entfernen`}
                      className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-red-50 text-red-600 disabled:opacity-55"
                      disabled={Boolean(actionKey)}
                      onClick={() =>
                        void runAction(
                          `remove-share-${sharedPerson.id}`,
                          () => onRemoveSharedPerson(sharedPerson),
                        )
                      }
                      title="Eigene Teamfreigabe entfernen"
                      type="button"
                    >
                      {removePending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin"
                          size={17}
                        />
                      ) : (
                        <Trash2 aria-hidden="true" size={17} />
                      )}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-center text-xs leading-5 text-slate-500">
            In deinem Team wurden noch keine Personen geteilt.
          </p>
        )}
      </section>

      <div className="surface relative mt-4 rounded-2xl">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
          size={21}
        />
        <label className="sr-only" htmlFor="person-search">
          Person suchen
        </label>
        <input
          autoComplete="off"
          className="min-h-14 w-full rounded-2xl bg-transparent pr-12 pl-12 text-sm text-[#102142] placeholder:text-slate-400"
          id="person-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name suchen"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Suche leeren"
            className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            onClick={() => setQuery('')}
            type="button"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div
        aria-label="Nach Lernstatus filtern"
        className="people-filters mt-4 flex flex-wrap gap-2"
      >
        {filters.map((item) => {
          const selected = filter === item
          return (
            <button
              aria-pressed={selected}
              className={`min-h-10 rounded-full border px-3.5 text-[13px] font-semibold transition ${
                selected
                  ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          )
        })}
      </div>

      {actionError && !pendingPersonAction ? (
        <p
          aria-live="polite"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <section className="surface mt-4 rounded-[24px] px-4">
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <p
            aria-live="polite"
            className="min-w-0 pr-3 text-sm font-extrabold text-[#102142]"
          >
            {resultLabel}
          </p>
          {!normalizedQuery ? (
            <span className="text-xs font-bold text-slate-500">
              {visiblePeople.length}
            </span>
          ) : null}
        </div>

        {visiblePeople.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {visiblePeople.map((person) => {
              const isInLearningWindow = learningWindowIds.has(person.employee.id)
              const fullName = `${person.employee.firstName} ${person.employee.lastName}`
              const sharePending = actionKey === `share-${person.employee.id}`
              const deletePending = actionKey === `delete-${person.employee.id}`
              const resetPending = actionKey === `reset-${person.employee.id}`
              const alreadyShared = ownSharedPersonIds.has(person.employee.id)
              const importedFromTeam = Boolean(person.employee.sourceShareId)
              const menuOpen = openPersonMenuId === person.employee.id
              const hasProgress = person.totalAnswers > 0

              return (
                <div className="person-list-item" key={person.employee.id}>
                  <div className="min-w-0 flex-1">
                    <PersonRow
                      {...person}
                      detail={
                        importedFromTeam
                          ? 'Vom Team übernommen'
                          : !isInLearningWindow
                            ? 'Wartet auf Freischaltung'
                            : undefined
                      }
                    />
                  </div>
                  <div className="person-menu-wrap">
                    <button
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      aria-label={`Aktionen für ${fullName}`}
                      className="person-menu-trigger"
                      disabled={Boolean(actionKey)}
                      onClick={(event) => {
                        const opening =
                          openPersonMenuId !== person.employee.id

                        if (opening) {
                          const triggerBounds =
                            event.currentTarget.getBoundingClientRect()
                          const bottomNavigationSpace =
                            window.innerWidth < 900 ? 96 : 16
                          const spaceBelow =
                            window.innerHeight -
                            bottomNavigationSpace -
                            triggerBounds.bottom
                          const spaceAbove = triggerBounds.top - 12

                          setPersonMenuPlacement(
                            spaceBelow < 156 && spaceAbove > spaceBelow
                              ? 'above'
                              : 'below',
                          )
                        }

                        setOpenPersonMenuId(opening ? person.employee.id : null)
                      }}
                      type="button"
                    >
                      {sharePending || deletePending || resetPending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin"
                          size={19}
                        />
                      ) : (
                        <MoreVertical aria-hidden="true" size={20} />
                      )}
                    </button>

                    {menuOpen ? (
                      <div
                        aria-label={`Aktionen für ${fullName}`}
                        className={`person-actions-menu ${
                          personMenuPlacement === 'above'
                            ? 'person-actions-menu--above'
                            : ''
                        }`}
                        role="menu"
                      >
                        <button
                          disabled={alreadyShared || importedFromTeam}
                          onClick={() => {
                            setOpenPersonMenuId(null)
                            void runAction(
                              `share-${person.employee.id}`,
                              () => onSharePerson(person.employee.id),
                            )
                          }}
                          role="menuitem"
                          type="button"
                        >
                          {alreadyShared ? (
                            <Check aria-hidden="true" size={17} />
                          ) : (
                            <Share2 aria-hidden="true" size={17} />
                          )}
                          {importedFromTeam
                            ? 'Bereits aus Team übernommen'
                            : alreadyShared
                              ? 'Bereits geteilt'
                              : 'Mit Team teilen'}
                        </button>
                        <button
                          disabled={!hasProgress}
                          onClick={() =>
                            resetPerson(person.employee.id, fullName)
                          }
                          role="menuitem"
                          type="button"
                        >
                          <RotateCcw aria-hidden="true" size={17} />
                          Fortschritt zurücksetzen
                        </button>
                        <button
                          className="person-menu-danger"
                          onClick={() => {
                            setOpenPersonMenuId(null)
                            deletePerson(person.employee.id, fullName)
                          }}
                          role="menuitem"
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={17} />
                          Person löschen
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <UsersRound aria-hidden="true" size={24} />
            </span>
            <p className="mt-3 text-sm font-extrabold text-[#102142]">
              {people.length === 0 ? 'Noch keine Personen' : 'Keine Treffer'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {people.length === 0
                ? 'Füge oben deine erste Person hinzu.'
                : 'Passe die Suche oder den Lernstatus-Filter an.'}
            </p>
          </div>
        )}
      </section>
      {cropFile ? (
        <ImageCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onComplete={(nextImageData) => {
            setImageData(nextImageData)
            setCropFile(null)
          }}
        />
      ) : null}
      {pendingPersonAction ? (
        <ActionConfirmDialog
          busy={Boolean(actionKey)}
          confirmLabel={
            pendingPersonAction.kind === 'delete'
              ? 'Person löschen'
              : 'Fortschritt zurücksetzen'
          }
          description={
            pendingPersonAction.kind === 'delete'
              ? `${pendingPersonAction.fullName} wird dauerhaft aus deiner persönlichen Liste entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`
              : `Antworten, Lernstufe und letztes Lerndatum von ${pendingPersonAction.fullName} werden zurückgesetzt. Name und Bild bleiben erhalten.`
          }
          error={actionError}
          icon={
            pendingPersonAction.kind === 'delete' ? (
              <Trash2 size={22} />
            ) : (
              <RotateCcw size={22} />
            )
          }
          onCancel={() => {
            if (actionKey) return
            setPendingPersonAction(null)
            setActionError(null)
          }}
          onConfirm={() => void confirmPersonAction()}
          title={
            pendingPersonAction.kind === 'delete'
              ? 'Person löschen?'
              : 'Fortschritt zurücksetzen?'
          }
          tone={
            pendingPersonAction.kind === 'delete' ? 'danger' : 'warning'
          }
        />
      ) : null}
    </main>
  )
}
