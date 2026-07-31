import {
  Check,
  LoaderCircle,
  Move,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  disposePreparedPersonImage,
  exportPersonCrop,
  preparePersonImage,
  renderPersonCrop,
  type CropSettings,
  type PreparedPersonImage,
} from '../lib/image'

type ImageCropperProps = {
  file: File
  onCancel: () => void
  onComplete: (imageData: string) => void
}

type DragState = {
  clientX: number
  clientY: number
  offsetX: number
  offsetY: number
}

const DEFAULT_CROP: CropSettings = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function ImageCropper({
  file,
  onCancel,
  onComplete,
}: ImageCropperProps) {
  const [source, setSource] = useState<PreparedPersonImage | null>(null)
  const [crop, setCrop] = useState<CropSettings>(DEFAULT_CROP)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    let active = true
    let prepared: PreparedPersonImage | null = null

    void preparePersonImage(file)
      .then((nextSource) => {
        prepared = nextSource
        if (active) {
          setSource(nextSource)
          setLoading(false)
        } else {
          disposePreparedPersonImage(nextSource)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Das Bild konnte nicht geöffnet werden.',
          )
          setLoading(false)
        }
      })

    return () => {
      active = false
      if (prepared) {
        disposePreparedPersonImage(prepared)
      }
    }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && source) {
      renderPersonCrop(canvas, source, crop)
    }
  }, [crop, source])

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: crop.offsetX,
      offsetY: crop.offsetY,
    }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return

    const size = Math.max(1, event.currentTarget.getBoundingClientRect().width)
    setCrop((previous) => ({
      ...previous,
      offsetX: clamp(
        drag.offsetX - ((event.clientX - drag.clientX) / size) * 2,
        -1,
        1,
      ),
      offsetY: clamp(
        drag.offsetY - ((event.clientY - drag.clientY) / size) * 2,
        -1,
        1,
      ),
    }))
  }

  const endDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const confirm = () => {
    if (!source || saving) return
    setSaving(true)
    setError(null)

    try {
      onComplete(exportPersonCrop(source, crop))
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Das Bild konnte nicht verarbeitet werden.',
      )
      setSaving(false)
    }
  }

  return (
    <div className="crop-dialog-backdrop">
      <section
        aria-labelledby="crop-dialog-title"
        aria-modal="true"
        className="crop-dialog"
        role="dialog"
      >
        <header className="crop-dialog-header">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-blue-600 uppercase">
              Bild vorbereiten
            </p>
            <h2 id="crop-dialog-title">Ausschnitt wählen</h2>
          </div>
          <button
            aria-label="Bildzuschnitt schließen"
            className="profile-icon-button"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        <p className="crop-dialog-help">
          Verschiebe das Bild und passe den Zoom an. Der sichtbare quadratische
          Bereich wird übernommen.
        </p>

        <div className="crop-stage">
          {loading ? (
            <LoaderCircle
              aria-label="Bild wird geladen"
              className="animate-spin text-blue-600"
              size={28}
            />
          ) : source ? (
            <>
              <canvas
                aria-label="Vorschau des Bildausschnitts"
                height={640}
                onPointerCancel={endDrag}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                ref={canvasRef}
                role="img"
                width={640}
              />
              <span aria-hidden="true" className="crop-grid" />
              <span aria-hidden="true" className="crop-move-hint">
                <Move size={17} />
                Verschieben
              </span>
            </>
          ) : null}
        </div>

        <div className="crop-controls">
          <ZoomOut aria-hidden="true" size={18} />
          <label className="sr-only" htmlFor="crop-zoom">
            Bildzoom
          </label>
          <input
            disabled={!source || saving}
            id="crop-zoom"
            max="3"
            min="1"
            onChange={(event) =>
              setCrop((previous) => ({
                ...previous,
                zoom: Number(event.target.value),
              }))
            }
            step="0.01"
            type="range"
            value={crop.zoom}
          />
          <ZoomIn aria-hidden="true" size={18} />
          <button
            className="crop-reset"
            disabled={!source || saving}
            onClick={() => setCrop(DEFAULT_CROP)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Zentrieren
          </button>
        </div>

        {error ? (
          <p aria-live="polite" className="profile-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="crop-actions">
          <button disabled={saving} onClick={onCancel} type="button">
            Abbrechen
          </button>
          <button
            className="primary-button"
            disabled={!source || saving}
            onClick={confirm}
            type="button"
          >
            {saving ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            Bild übernehmen
          </button>
        </div>
      </section>
    </div>
  )
}
