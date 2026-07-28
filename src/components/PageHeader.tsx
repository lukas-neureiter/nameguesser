type PageHeaderProps = {
  title: string
  subtitle?: string
  eyebrow?: string
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="page-header mb-7">
      {eyebrow ? (
        <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-blue-600 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-[#17233b]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-xl text-[15px] leading-6 text-slate-600">{subtitle}</p>
      ) : null}
    </header>
  )
}
