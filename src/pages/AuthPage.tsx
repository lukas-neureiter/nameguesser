import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { LoaderCircle, LockKeyhole, UserRound, UsersRound } from 'lucide-react'
import {
  getAuthErrorMessage,
  normalizeTeamId,
  normalizeUsername,
  usernameToEmail,
  validateTeamId,
  validateUsername,
} from '../lib/auth'
import { auth, db } from '../lib/firebase'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const usernameError = validateUsername(username)
    const teamError = mode === 'register' ? validateTeamId(teamId) : null
    if (usernameError || teamError) {
      setError(usernameError ?? teamError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const normalizedUsername = normalizeUsername(username)
      const internalEmail = usernameToEmail(normalizedUsername)

      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, internalEmail, password)
        return
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        internalEmail,
        password,
      )

      try {
        await setDoc(doc(db, 'users', credential.user.uid), {
          username: normalizedUsername,
          teamId: normalizeTeamId(teamId),
          createdAt: serverTimestamp(),
        })
      } catch (profileError) {
        await deleteUser(credential.user)
        throw profileError
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card surface">
        <div className="auth-brand">
          <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-blue-600 text-white shadow-sm">
            <UserRound aria-hidden="true" size={28} />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.16em] text-blue-600 uppercase">
            Nameguesser
          </p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.02em] text-[#17233b]">
            Namen lernen
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Melde dich an, um mit deiner persönlichen Liste weiterzulernen.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            aria-pressed={mode === 'login'}
            className={`min-h-11 rounded-xl text-sm font-semibold ${
              mode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => changeMode('login')}
            type="button"
          >
            Anmelden
          </button>
          <button
            aria-pressed={mode === 'register'}
            className={`min-h-11 rounded-xl text-sm font-semibold ${
              mode === 'register'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600'
            }`}
            onClick={() => changeMode('register')}
            type="button"
          >
            Registrieren
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-semibold text-[#102142]">
            Benutzername
            <span className="auth-field surface flex min-h-13 items-center gap-3 rounded-2xl px-4">
              <UserRound aria-hidden="true" className="text-slate-400" size={19} />
              <input
                autoCapitalize="none"
                autoComplete="username"
                className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none"
                onChange={(event) => setUsername(event.target.value)}
                required
                spellCheck={false}
                value={username}
              />
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[#102142]">
            Passwort
            <span className="auth-field surface flex min-h-13 items-center gap-3 rounded-2xl px-4">
              <LockKeyhole aria-hidden="true" className="text-slate-400" size={19} />
              <input
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </span>
          </label>

          {mode === 'register' ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[#102142]">
              Team-Code
              <span className="auth-field surface flex min-h-13 items-center gap-3 rounded-2xl px-4">
                <UsersRound aria-hidden="true" className="text-slate-400" size={19} />
                <input
                  autoCapitalize="none"
                  autoComplete="off"
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none"
                  onChange={(event) => setTeamId(event.target.value)}
                  required
                  spellCheck={false}
                  value={teamId}
                />
              </span>
            </label>
          ) : null}

          {error ? (
            <p
              aria-live="polite"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="primary-button mt-1 flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-65"
            disabled={submitting}
            type="submit"
          >
            {submitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={19} />
            ) : null}
            {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>
      </section>
    </main>
  )
}
