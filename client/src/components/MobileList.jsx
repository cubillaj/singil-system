export function MobileList({ children }) {
  return (
    <div className="grid gap-3 bg-panel px-4 py-4 md:hidden">
      {children}
    </div>
  )
}

export function MobileCard({ children }) {
  return (
    <article className="rounded-md border border-line bg-panel p-4 shadow-sm">
      {children}
    </article>
  )
}

export function MobileMeta({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  )
}
