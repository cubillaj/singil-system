export function StatusPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-surface text-muted ring-line',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    warning: 'bg-amber-50 text-warn ring-amber-200',
    danger: 'bg-red-50 text-danger ring-red-200',
  }

  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}
