import { useEffect, useState } from 'react'
import { DashboardLayout } from './layouts/DashboardLayout'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { InvitationsPage } from './pages/InvitationsPage'
import { MembersPage } from './pages/MembersPage'
import { OrganizationPage } from './pages/OrganizationPage'

function App() {
  const auth = useAuth()
  const [activePage, setActivePageState] = useState(() => localStorage.getItem('singil:page') ?? 'members')

  const setActivePage = (page) => {
    localStorage.setItem('singil:page', page)
    setActivePageState(page)
  }

  useEffect(() => {
    if (auth.user?.role === 'system_admin' && activePage !== 'invitations') {
      setActivePage('invitations')
    }
  }, [activePage, auth.user?.role])

  if (auth.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-sm text-muted">
        Loading workspace...
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <AuthPage onLogin={auth.login} onRegister={auth.register} />
  }

  return (
    <DashboardLayout user={auth.user} activePage={activePage} onNavigate={setActivePage} onLogout={auth.logout}>
      {activePage === 'members' ? <MembersPage /> : null}
      {activePage === 'invitations' ? <InvitationsPage user={auth.user} /> : null}
      {activePage === 'organization' ? <OrganizationPage user={auth.user} onUpdated={auth.refresh} /> : null}
    </DashboardLayout>
  )
}

export default App
