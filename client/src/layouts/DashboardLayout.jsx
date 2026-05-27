import { BriefcaseBusiness, Building2, CircleUser, FileText, LogOut, MailPlus, Package, Repeat, Settings, Users } from 'lucide-react'
import { Button } from '../components/Button'
import { getInitials, roleLabel } from '../utils/format'

const navItems = [
  { id: 'members', label: 'Members', icon: Users, roles: ['admin', 'owner'] },
  { id: 'clients', label: 'Clients', icon: BriefcaseBusiness, roles: ['admin', 'member', 'owner'] },
  { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'member', 'owner'] },
  { id: 'invoices', label: 'Invoices', icon: FileText, roles: ['admin', 'member', 'owner'] },
  { id: 'recurring', label: 'Recurring', icon: Repeat, roles: ['admin', 'member', 'owner'] },
  { id: 'invitations', label: 'Invitations', icon: MailPlus, roles: ['system_admin', 'admin', 'owner'] },
  { id: 'organization', label: 'Organization', icon: Settings, roles: ['admin', 'owner'] },
  { id: 'profile', label: 'Profile', icon: CircleUser, roles: ['system_admin', 'admin', 'member', 'owner'] },
]

function rootPage(page) {
  if (page.startsWith('client-')) return 'clients'
  if (page.startsWith('product-')) return 'products'
  if (page.startsWith('invoice-')) return 'invoices'
  if (page.startsWith('recurring-')) return 'recurring'
  if (page.startsWith('member-')) return 'members'
  if (page.startsWith('invitation-')) return 'invitations'
  return page
}

export function DashboardLayout({ user, activePage, onNavigate, onLogout, children }) {
  const visibleNavItems = navItems.filter((item) => item.roles.includes(user?.role))
  const selectedPage = rootPage(activePage)

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-line px-5">
          <div className="grid size-9 place-items-center rounded-md bg-accent text-sm font-bold text-white">S</div>
          <div>
            <p className="text-sm font-semibold">Singil</p>
            <p className="text-xs text-muted">Billing workspace</p>
          </div>
        </div>
        <nav className="grid gap-1 p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const active = selectedPage === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                  active ? 'bg-accent text-white' : 'text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid size-9 place-items-center rounded-md bg-accent text-sm font-bold text-white">S</div>
            <select
              value={selectedPage}
              onChange={(event) => onNavigate(event.target.value)}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium outline-none"
            >
              {visibleNavItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted lg:flex">
            <Building2 size={18} />
            <span>{user?.organization?.name ?? 'System admin'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{user?.name} {user?.lastName}</p>
              <p className="text-xs capitalize text-muted">{roleLabel(user?.role)}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-surface text-sm font-semibold ring-1 ring-line">
              {getInitials(user)}
            </div>
            <Button variant="ghost" onClick={onLogout} aria-label="Logout" title="Logout" className="w-10 px-0">
              <LogOut size={18} />
            </Button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
