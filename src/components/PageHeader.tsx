import { UserRound } from 'lucide-react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  eyebrow?: string
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-7 flex items-start justify-between gap-5">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold tracking-[0.16em] text-blue-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[34px] leading-tight font-extrabold tracking-[-0.035em] text-[#102142]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-sm text-[15px] leading-6 text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
        <UserRound aria-hidden="true" size={25} strokeWidth={2.3} />
      </span>
    </header>
  )
}
