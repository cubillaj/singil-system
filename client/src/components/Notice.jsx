export function Notice({ tone = 'error', children }) {
  if (!children) return null

  const tones = {
    error: 'border-red-200 bg-red-50 text-danger',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-warn',
  }

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}
