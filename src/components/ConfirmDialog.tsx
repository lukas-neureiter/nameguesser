import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      aria-labelledby="exit-dialog-title"
      aria-modal="true"
      className="dialog-backdrop"
      role="dialog"
    >
      <div className="dialog-card">
        <span className="dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <h2 id="exit-dialog-title">Runde beenden?</h2>
        <p>
          Deine bisherigen {answeredCount}{' '}
          {answeredCount === 1 ? 'Antwort wird' : 'Antworten werden'} gespeichert
          und direkt ausgewertet. Offene Fragen entfallen.
        </p>
        <div className="dialog-actions">
          <button
            className="dialog-secondary"
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Weiterlernen
          </button>
          <button
            className="dialog-primary"
            onClick={onConfirm}
            type="button"
          >
            Runde auswerten
          </button>
        </div>
      </div>
    </div>
  )
}
