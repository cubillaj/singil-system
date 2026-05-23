export function formatDate(value) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getInitials(user) {
  const first = user?.name?.[0] ?? ''
  const last = user?.lastName?.[0] ?? ''

  return `${first}${last}`.toUpperCase() || 'S'
}

export function roleLabel(role) {
  return role?.replace('_', ' ') ?? 'member'
}
