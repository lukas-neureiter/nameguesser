import { useMemo, useState } from 'react'
import { Search, UsersRound, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PersonRow } from '../components/PersonRow'
import type { LearningStatus } from '../types'
import type { PersonSummary } from './HomePage'

type FilterValue = 'Alle' | LearningStatus

type PeoplePageProps = {
  people: PersonSummary[]
}

const filters: FilterValue[] = [
  'Alle',
  'Neu',
  'Unsicher',
  'In Übung',
  'Gut gelernt',
  'Gemeistert',
]

export function PeoplePage({ people }: PeoplePageProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterValue>('Alle')
  const normalizedQuery = query.trim().toLocaleLowerCase('de')

  const visiblePeople = useMemo(
    () =>
      people.filter((person) => {
        const name =
          `${person.employee.firstName} ${person.employee.lastName}`.toLocaleLowerCase('de')
        const matchesSearch = !normalizedQuery || name.includes(normalizedQuery)
        const matchesFilter = filter === 'Alle' || person.status === filter
        return matchesSearch && matchesFilter
      }),
    [filter, normalizedQuery, people],
  )
  const trimmedQuery = query.trim()
  const resultLabel = normalizedQuery
    ? visiblePeople.length === 0
      ? `Keine Treffer für „${trimmedQuery}“`
      : `${visiblePeople.length} Treffer für „${trimmedQuery}“`
    : filter === 'Alle'
      ? 'Alle Personen'
      : filter

  return (
    <main className="page page-people">
      <PageHeader
        subtitle="Suche Namen oder filtere nach dem aktuellen Lernstatus."
        title="Personen"
      />

      <div className="surface relative rounded-2xl">
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
            {visiblePeople.map((person) => (
              <PersonRow key={person.employee.id} {...person} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <UsersRound aria-hidden="true" size={24} />
            </span>
            <p className="mt-3 text-sm font-extrabold text-[#102142]">
              Keine Treffer
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Passe die Suche oder den Lernstatus-Filter an.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
