export function Field({ label, error, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  )
}

export function inputClassName(className = '') {
  return `h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 ${className}`
}
