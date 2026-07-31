import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'

type ActionConfirmDialogProps = {
  title: string
  description: string
  cancelLabel?: string
  confirmLabel: string
  tone?: 'primary' | 'warning' | 'danger'
  icon?: ReactNode
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function ActionConfirmDialog({
  title,
  description,
  cancelLabel = 'Abbrechen',
  confirmLabel,
  tone = 'primary',
  icon = <AlertTriangle size={22} />,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ActionConfirmDialogProps) {
  const titleId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel])

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="dialog-backdrop"
      role="dialog"
    >
      <div className="dialog-card">
        <span
          aria-hidden="true"
          className={`dialog-icon dialog-icon--${tone}`}
        >
          {icon}
        </span>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        {error ? (
          <p aria-live="polite" className="dialog-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button
            className="dialog-secondary"
            disabled={busy}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`dialog-primary dialog-primary--${tone}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={17}
              />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

type ConfirmDialogProps = {
  answeredCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  answeredCount,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ActionConfirmDialog
      cancelLabel="Weiterlernen"
      confirmLabel="Runde auswerten"
      description={`Deine bisherigen ${answeredCount} ${
        answeredCount === 1 ? 'Antwort wird' : 'Antworten werden'
      } gespeichert und direkt ausgewertet. Offene Fragen entfallen.`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Runde beenden?"
      tone="warning"
    />
  )
}
