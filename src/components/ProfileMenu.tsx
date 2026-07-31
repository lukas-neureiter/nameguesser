import {
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

type ProfileView =
  | 'main'
  | 'username'
  | 'password'
  | 'team'
  | 'reset'
  | 'delete'

type ProfileMenuProps = {
  username: string
  teamId: string
  onChangeUsername: (username: string, currentPassword: string) => Promise<void>
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>
  onChangeTeam: (teamId: string) => Promise<void>
  onResetProgress: () => Promise<void>
  onDeleteProfile: (currentPassword: string) => Promise<void>
  onLogout: () => Promise<void>
}

type MenuRowProps = {
  danger?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function MenuRow({ danger = false, icon, label, onClick }: MenuRowProps) {
  return (
    <button
      className={`profile-menu-row ${danger ? 'profile-menu-row--danger' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
      <ChevronRight aria-hidden="true" className="ml-auto" size={17} />
    </button>
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Die Änderung ist fehlgeschlagen. Bitte versuche es erneut.'
}

export function ProfileMenu({
  username,
  teamId,
  onChangeUsername,
  onChangePassword,
  onChangeTeam,
  onResetProgress,
  onDeleteProfile,
  onLogout,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ProfileView>('main')
  const [nextUsername, setNextUsername] = useState(username)
  const [nextTeamId, setNextTeamId] = useState(teamId)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const initials = username.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!open) return undefined

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    setNextUsername(username)
  }, [username])

  useEffect(() => {
    setNextTeamId(teamId)
  }, [teamId])

  const openView = (nextView: ProfileView) => {
    setView(nextView)
    setError(null)
    setSuccess(null)
    setCurrentPassword('')
    setNewPassword('')
  }

  const close = () => {
    setOpen(false)
    setView('main')
    setError(null)
    setSuccess(null)
    setCurrentPassword('')
    setNewPassword('')
  }

  const runAction = async (
    action: () => Promise<void>,
    successMessage?: string,
  ) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await action()
      if (successMessage) {
        setSuccess(successMessage)
        setView('main')
      }
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    } finally {
      setBusy(false)
    }
  }

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(
      () => onChangeUsername(nextUsername, currentPassword),
      'Benutzername geändert.',
    )
  }

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(
      () => onChangePassword(currentPassword, newPassword),
      'Passwort geändert.',
    )
  }

  const submitTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAction(
      () => onChangeTeam(nextTeamId),
      'Team geändert.',
    )
  }

  const renderFormHeader = (title: string, subtitle: string) => (
    <div className="profile-form-header">
      <button
        aria-label="Zurück zum Profil"
        className="profile-icon-button"
        onClick={() => openView('main')}
        type="button"
      >
        <ArrowLeft size={19} />
      </button>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )

  const renderContent = () => {
    if (view === 'username') {
      return (
        <>
          {renderFormHeader(
            'Benutzername ändern',
            'Dein Anmeldename wird ebenfalls aktualisiert.',
          )}
          <form className="profile-form" onSubmit={submitUsername}>
            <label>
              Neuer Benutzername
              <input
                autoCapitalize="none"
                autoComplete="username"
                onChange={(event) => setNextUsername(event.target.value)}
                required
                spellCheck={false}
                value={nextUsername}
              />
            </label>
            <label>
              Aktuelles Passwort
              <input
                autoComplete="current-password"
                minLength={6}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <button className="profile-primary-action" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}
              Speichern
            </button>
          </form>
        </>
      )
    }

    if (view === 'password') {
      return (
        <>
          {renderFormHeader(
            'Passwort ändern',
            'Bestätige zuerst dein aktuelles Passwort.',
          )}
          <form className="profile-form" onSubmit={submitPassword}>
            <label>
              Aktuelles Passwort
              <input
                autoComplete="current-password"
                minLength={6}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <label>
              Neues Passwort
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>
            <button className="profile-primary-action" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}
              Passwort speichern
            </button>
          </form>
        </>
      )
    }

    if (view === 'team') {
      return (
        <>
          {renderFormHeader(
            'Team ändern',
            'Deine persönliche Personenliste bleibt erhalten.',
          )}
          <form className="profile-form" onSubmit={submitTeam}>
            <label>
              Neuer Team-Code
              <input
                autoCapitalize="none"
                autoComplete="off"
                onChange={(event) => setNextTeamId(event.target.value)}
                required
                spellCheck={false}
                value={nextTeamId}
              />
            </label>
            <p className="profile-form-note">
              Eigene Freigaben werden aus dem bisherigen Team entfernt.
            </p>
            <button className="profile-primary-action" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}
              Team wechseln
            </button>
          </form>
        </>
      )
    }

    if (view === 'reset') {
      return (
        <>
          {renderFormHeader(
            'Fortschritt zurücksetzen',
            'Alle Personen beginnen wieder bei null.',
          )}
          <div className="profile-confirm-panel">
            <RotateCcw aria-hidden="true" className="text-orange-500" size={26} />
            <p>
              Namen und Bilder bleiben erhalten. Nur Antworten, Lernstufen und
              das letzte Lerndatum werden zurückgesetzt.
            </p>
            <button
              className="profile-warning-action"
              disabled={busy}
              onClick={() =>
                void runAction(
                  onResetProgress,
                  'Lernfortschritt zurückgesetzt.',
                )
              }
              type="button"
            >
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}
              Jetzt zurücksetzen
            </button>
          </div>
        </>
      )
    }

    if (view === 'delete') {
      return (
        <>
          {renderFormHeader(
            'Profil löschen',
            'Diese Aktion kann nicht rückgängig gemacht werden.',
          )}
          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault()
              void runAction(() => onDeleteProfile(currentPassword))
            }}
          >
            <p className="profile-form-note profile-form-note--danger">
              Dein Konto, alle persönlichen Personen und deine eigenen
              Teamfreigaben werden dauerhaft gelöscht.
            </p>
            <label>
              Aktuelles Passwort
              <input
                autoComplete="current-password"
                minLength={6}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <button className="profile-danger-action" disabled={busy} type="submit">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}
              Profil endgültig löschen
            </button>
          </form>
        </>
      )
    }

    return (
      <>
        <div className="profile-summary">
          <span className="profile-initials">{initials}</span>
          <div className="min-w-0">
            <h2 className="truncate">{username}</h2>
            <p className="truncate">Team {teamId}</p>
          </div>
          <button
            aria-label="Profilmenü schließen"
            className="profile-icon-button ml-auto"
            onClick={close}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <p aria-live="polite" className="profile-success">
            {success}
          </p>
        ) : null}

        <p className="profile-section-label">Konto</p>
        <div className="profile-menu-list">
          <MenuRow
            icon={<UserRound size={18} />}
            label="Benutzername ändern"
            onClick={() => openView('username')}
          />
          <MenuRow
            icon={<LockKeyhole size={18} />}
            label="Passwort ändern"
            onClick={() => openView('password')}
          />
          <MenuRow
            icon={<UsersRound size={18} />}
            label="Team ändern"
            onClick={() => openView('team')}
          />
          <MenuRow
            icon={<RotateCcw size={18} />}
            label="Gesamten Fortschritt zurücksetzen"
            onClick={() => openView('reset')}
          />
        </div>

        <p className="profile-section-label">Sicherheit</p>
        <div className="profile-menu-list">
          <MenuRow
            danger
            icon={<Trash2 size={18} />}
            label="Profil löschen"
            onClick={() => openView('delete')}
          />
          <MenuRow
            icon={<LogOut size={18} />}
            label="Abmelden"
            onClick={() => void runAction(onLogout)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Profil von ${username} öffnen`}
        className="profile-trigger"
        onClick={() => {
          setOpen((previous) => !previous)
          setView('main')
          setError(null)
        }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">{initials}</span>
      </button>

      {open ? (
        <>
          <div aria-hidden="true" className="profile-backdrop" />
          <div
            aria-label="Profil"
            aria-modal="true"
            className="profile-popover"
            ref={menuRef}
            role="dialog"
          >
            {renderContent()}
            {error ? (
              <p aria-live="polite" className="profile-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  )
}
