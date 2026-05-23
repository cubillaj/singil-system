export function EmptyState({ title, description }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
    </div>
  )
}
