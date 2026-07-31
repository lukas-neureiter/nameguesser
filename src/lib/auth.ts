import { FirebaseError } from 'firebase/app'

const USERNAME_PATTERN = /^[a-z0-9._-]+$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@nameguesser.invalid`
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username)

  if (!normalized) {
    return 'Bitte gib einen Benutzernamen ein.'
  }

  if (normalized.length > 64) {
    return 'Der Benutzername darf höchstens 64 Zeichen lang sein.'
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Erlaubt sind nur a–z, 0–9, Punkt, Bindestrich und Unterstrich.'
  }

  return null
}

export function normalizeTeamId(teamId: string): string {
  return teamId.trim().toLowerCase()
}

export function validateTeamId(teamId: string): string | null {
  const normalized = normalizeTeamId(teamId)

  if (!normalized) {
    return 'Bitte gib einen Team-Code ein.'
  }

  if (normalized.length > 100 || normalized.includes('/')) {
    return 'Der Team-Code ist ungültig.'
  }

  return null
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.'
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Dieser Benutzername ist bereits vergeben.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Benutzername oder Passwort ist nicht korrekt.'
    case 'auth/weak-password':
      return 'Das Passwort muss mindestens 6 Zeichen lang sein.'
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.'
    case 'auth/network-request-failed':
      return 'Keine Verbindung möglich. Prüfe deine Internetverbindung.'
    default:
      return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.'
  }
}
