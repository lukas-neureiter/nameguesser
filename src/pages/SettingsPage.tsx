import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Play,
  Type,
  UserRound,
} from 'lucide-react'
import type { Direction, NameMode, RoundConfig, RoundSize } from '../types'

type SettingsPageProps = {
  config: RoundConfig
  onBack: () => void
  onChange: (config: RoundConfig) => void
  onStart: () => void
}

const nameModes: { value: NameMode; label: string }[] = [
  { value: 'first', label: 'Vorname' },
  { value: 'last', label: 'Nachname' },
  { value: 'full', label: 'Beides' },
]

const roundSizes: { value: RoundSize; label: string }[] = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 'unlimited', label: 'Unbegrenzt' },
]

function ChoiceMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-7 w-7 place-items-center rounded-full ${
        selected ? 'bg-blue-600 text-white' : 'border-2 border-slate-200 text-transparent'
      }`}
    >
      <Check size={17} strokeWidth={3} />
    </span>
  )
}

function DirectionChoice({
  direction,
  selected,
  onSelect,
}: {
  direction: Direction
  selected: boolean
  onSelect: () => void
}) {
  const photoFirst = direction === 'photo-to-name'

  return (
    <button
      aria-pressed={selected}
      className={`relative min-h-44 rounded-[22px] border bg-white p-5 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50/70 shadow-[0_8px_20px_rgba(15,109,245,0.12)]'
          : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="absolute top-4 right-4">
        <ChoiceMark selected={selected} />
      </span>
      <span className="mt-8 flex items-center gap-2 text-slate-500">
        <span
          className={`grid h-12 w-12 place-items-center rounded-full ${
            selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100'
          }`}
        >
          {photoFirst ? <UserRound size={25} /> : <Type size={25} />}
        </span>
        <ArrowRight size={22} />
        <span
          className={`grid h-12 w-12 place-items-center rounded-full ${
            selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100'
          }`}
        >
          {photoFirst ? <Type size={25} /> : <ImageIcon size={25} />}
        </span>
      </span>
      <span className="mt-5 block text-base font-extrabold text-[#102142]">
        {photoFirst ? 'Foto → Name' : 'Name → Foto'}
      </span>
    </button>
  )
}

export function SettingsPage({
  config,
  onBack,
  onChange,
  onStart,
}: SettingsPageProps) {
  const update = <Key extends keyof RoundConfig>(key: Key, value: RoundConfig[Key]) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <main className="page">
      <button
        aria-label="Zurück zur Startseite"
        className="mb-7 grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-[#102142] shadow-sm"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={23} />
      </button>

      <header className="mb-7">
        <p className="mb-1 text-xs font-bold tracking-[0.16em] text-blue-600 uppercase">
          Neue Runde
        </p>
        <h1 className="text-[34px] leading-tight font-extrabold tracking-[-0.035em] text-[#102142]">
          Lernrunde
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-slate-600">
          Stell dir eine kurze Runde zusammen, die gerade zu deiner Fahrt passt.
        </p>
      </header>

      <div className="space-y-7">
        <fieldset>
          <legend className="mb-3 text-[15px] font-extrabold text-[#102142]">
            Was lernen?
          </legend>
          <div className="surface grid grid-cols-3 overflow-hidden rounded-2xl">
            {nameModes.map((mode) => {
              const selected = config.nameMode === mode.value
              return (
                <button
                  aria-pressed={selected}
                  className={`relative min-h-14 border-r border-slate-200 px-2 text-sm font-semibold last:border-r-0 ${
                    selected ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700'
                  }`}
                  key={mode.value}
                  onClick={() => update('nameMode', mode.value)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {selected ? (
                      <Check
                        aria-hidden="true"
                        className="rounded-full bg-blue-600 p-0.5 text-white"
                        size={18}
                        strokeWidth={3}
                      />
                    ) : null}
                    {mode.label}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[15px] font-extrabold text-[#102142]">
            Abfragemodus
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <DirectionChoice
              direction="photo-to-name"
              onSelect={() => update('direction', 'photo-to-name')}
              selected={config.direction === 'photo-to-name'}
            />
            <DirectionChoice
              direction="name-to-photo"
              onSelect={() => update('direction', 'name-to-photo')}
              selected={config.direction === 'name-to-photo'}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[15px] font-extrabold text-[#102142]">
            Anzahl Fragen
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {roundSizes.map((size) => {
              const selected = config.roundSize === size.value
              return (
                <button
                  aria-pressed={selected}
                  className={`relative min-h-14 rounded-2xl border px-1 text-sm font-bold transition ${
                    selected
                      ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                  key={String(size.value)}
                  onClick={() => update('roundSize', size.value)}
                  type="button"
                >
                  {size.label}
                  {selected ? (
                    <Check
                      aria-hidden="true"
                      className="absolute -top-2 -right-1 rounded-full bg-blue-600 p-1 text-white"
                      size={22}
                      strokeWidth={3}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <p className="mb-3 text-[15px] font-extrabold text-[#102142]">Fokus</p>
          <button
            aria-pressed={config.adaptive}
            className="surface flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl px-4 text-left"
            onClick={() => update('adaptive', !config.adaptive)}
            type="button"
          >
            <span>
              <span className="block text-sm font-bold text-[#102142]">
                Schwierige Personen häufiger
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                Passt die Auswahl an deinen Lernstand an.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                config.adaptive ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                  config.adaptive ? 'left-7' : 'left-1'
                }`}
              />
            </span>
          </button>
        </div>

        <button
          className="primary-button flex min-h-16 w-full items-center justify-center gap-3 rounded-[20px] px-6 text-lg font-extrabold"
          onClick={onStart}
          type="button"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-blue-600">
            <Play aria-hidden="true" fill="currentColor" size={18} />
          </span>
          Runde starten
        </button>
      </div>
    </main>
  )
}
