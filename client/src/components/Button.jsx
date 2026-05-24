export function Button({ as: Component = 'button', variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-strong',
    secondary: 'border border-line bg-panel text-ink hover:bg-surface',
    danger: 'bg-danger text-white hover:bg-red-800',
    ghost: 'text-muted hover:bg-surface hover:text-ink',
  }

  return (
    <Component
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
