import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ClientFormPage, ClientsPage } from './pages/ClientsPage'
import { InvitationCreatePage, InvitationsPage } from './pages/InvitationsPage'
import { InvoiceDetailPage, InvoiceFormPage, InvoicesPage } from './pages/InvoicesPage'
import { MemberEditPage, MemberPasswordPage, MembersPage } from './pages/MembersPage'
import { OrganizationPage } from './pages/OrganizationPage'
import { ChangePasswordPage, ProfileEditPage, ProfilePage } from './pages/ProfilePage'
import { ProductFormPage, ProductsPage } from './pages/ProductsPage'
import { PaymentDetailPage, PaymentsPage } from './pages/PaymentsPage'
import { RecurringInvoiceDetailPage, RecurringInvoiceFormPage, RecurringInvoicesPage } from './pages/RecurringInvoicesPage'
import { SubscriptionPage } from './pages/SubscriptionPage'

function defaultPageForRole(role) {
  if (role === 'system_admin') return '/dashboard/invitations'
  if (role === 'member') return '/dashboard/clients'
  return '/dashboard/members'
}

function canAccessPage(role, page) {
  const access = {
    members: ['admin', 'owner'],
    'member-edit': ['admin', 'owner'],
    'member-password': ['admin', 'owner'],
    clients: ['admin', 'member', 'owner'],
    'client-new': ['admin', 'member', 'owner'],
    'client-edit': ['admin', 'member', 'owner'],
    products: ['admin', 'member', 'owner'],
    'product-new': ['admin', 'owner'],
    'product-edit': ['admin', 'owner'],
    invoices: ['admin', 'member', 'owner'],
    'invoice-new': ['admin', 'member', 'owner'],
    'invoice-detail': ['admin', 'member', 'owner'],
    'invoice-edit': ['admin', 'member', 'owner'],
    payments: ['admin', 'member', 'owner'],
    'payment-detail': ['admin', 'member', 'owner'],
    recurring: ['admin', 'member', 'owner'],
    'recurring-new': ['admin', 'owner'],
    'recurring-detail': ['admin', 'member', 'owner'],
    'recurring-edit': ['admin', 'owner'],
    invitations: ['system_admin', 'admin', 'owner'],
    'invitation-new': ['system_admin', 'admin', 'owner'],
    organization: ['admin', 'owner'],
    subscription: ['owner'],
    profile: ['system_admin', 'admin', 'member', 'owner'],
    'profile-edit': ['system_admin', 'admin', 'member', 'owner'],
    'profile-password': ['system_admin', 'admin', 'member', 'owner'],
  }

  return access[page]?.includes(role) ?? false
}

function pageToPath(page, params = {}) {
  const paths = {
    members: '/dashboard/members',
    'member-edit': `/dashboard/members/${params.memberId}/edit`,
    'member-password': `/dashboard/members/${params.memberId}/password`,
    clients: '/dashboard/clients',
    'client-new': '/dashboard/clients/new',
    'client-edit': `/dashboard/clients/${params.clientId}/edit`,
    products: '/dashboard/products',
    'product-new': '/dashboard/products/new',
    'product-edit': `/dashboard/products/${params.productId}/edit`,
    invoices: '/dashboard/invoices',
    'invoice-new': '/dashboard/invoices/new',
    'invoice-detail': `/dashboard/invoices/${params.invoiceId}`,
    'invoice-edit': `/dashboard/invoices/${params.invoiceId}/edit`,
    payments: '/dashboard/payments',
    'payment-detail': `/dashboard/payments/${params.paymentId}`,
    recurring: '/dashboard/recurring-invoices',
    'recurring-new': '/dashboard/recurring-invoices/new',
    'recurring-detail': `/dashboard/recurring-invoices/${params.recurringInvoiceId}`,
    'recurring-edit': `/dashboard/recurring-invoices/${params.recurringInvoiceId}/edit`,
    invitations: '/dashboard/invitations',
    'invitation-new': '/dashboard/invitations/new',
    organization: '/dashboard/organization',
    subscription: '/dashboard/subscription',
    profile: '/dashboard/profile',
    'profile-edit': '/dashboard/profile/edit',
    'profile-password': '/dashboard/profile/password',
  }

  return paths[page] ?? '/dashboard'
}

function activePageFromPath(pathname) {
  if (pathname.startsWith('/dashboard/members/') && pathname.endsWith('/edit')) return 'member-edit'
  if (pathname.startsWith('/dashboard/members/') && pathname.endsWith('/password')) return 'member-password'
  if (pathname === '/dashboard/members') return 'members'
  if (pathname === '/dashboard/clients/new') return 'client-new'
  if (pathname.startsWith('/dashboard/clients/') && pathname.endsWith('/edit')) return 'client-edit'
  if (pathname === '/dashboard/clients') return 'clients'
  if (pathname === '/dashboard/products/new') return 'product-new'
  if (pathname.startsWith('/dashboard/products/') && pathname.endsWith('/edit')) return 'product-edit'
  if (pathname === '/dashboard/products') return 'products'
  if (pathname === '/dashboard/invoices/new') return 'invoice-new'
  if (pathname.startsWith('/dashboard/invoices/') && pathname.endsWith('/edit')) return 'invoice-edit'
  if (pathname.startsWith('/dashboard/invoices/')) return 'invoice-detail'
  if (pathname === '/dashboard/invoices') return 'invoices'
  if (pathname.startsWith('/dashboard/payments/')) return 'payment-detail'
  if (pathname === '/dashboard/payments') return 'payments'
  if (pathname === '/dashboard/recurring-invoices/new') return 'recurring-new'
  if (pathname.startsWith('/dashboard/recurring-invoices/') && pathname.endsWith('/edit')) return 'recurring-edit'
  if (pathname.startsWith('/dashboard/recurring-invoices/')) return 'recurring-detail'
  if (pathname === '/dashboard/recurring-invoices') return 'recurring'
  if (pathname === '/dashboard/invitations/new') return 'invitation-new'
  if (pathname === '/dashboard/invitations') return 'invitations'
  if (pathname === '/dashboard/organization') return 'organization'
  if (pathname === '/dashboard/subscription') return 'subscription'
  if (pathname === '/dashboard/profile/edit') return 'profile-edit'
  if (pathname === '/dashboard/profile/password') return 'profile-password'
  if (pathname === '/dashboard/profile') return 'profile'
  return 'dashboard'
}

function routeRootPage(page) {
  if (page.startsWith('client-')) return 'clients'
  if (page.startsWith('product-')) return 'products'
  if (page.startsWith('invoice-')) return 'invoices'
  if (page.startsWith('payment-')) return 'payments'
  if (page.startsWith('recurring-')) return 'recurring'
  if (page.startsWith('member-')) return 'members'
  if (page.startsWith('invitation-')) return 'invitations'
  if (page.startsWith('profile-')) return 'profile'
  return page
}

function ProtectedPage({ user, page, children }) {
  if (!canAccessPage(user?.role, page)) {
    return <Navigate to={defaultPageForRole(user?.role)} replace />
  }

  return children
}

function ClientEditRoute({ onNavigate }) {
  const { clientId } = useParams()
  return <ClientFormPage clientId={clientId} onNavigate={onNavigate} />
}

function ProductEditRoute({ onNavigate }) {
  const { productId } = useParams()
  return <ProductFormPage productId={productId} onNavigate={onNavigate} />
}

function MemberEditRoute({ user, onNavigate }) {
  const { memberId } = useParams()
  return <MemberEditPage user={user} memberId={memberId} onNavigate={onNavigate} />
}

function MemberPasswordRoute({ user, onNavigate }) {
  const { memberId } = useParams()
  return <MemberPasswordPage user={user} memberId={memberId} onNavigate={onNavigate} />
}

function InvoiceDetailRoute({ onNavigate }) {
  const { invoiceId } = useParams()
  return <InvoiceDetailPage invoiceId={invoiceId} onNavigate={onNavigate} />
}

function InvoiceEditRoute({ onNavigate }) {
  const { invoiceId } = useParams()
  return <InvoiceFormPage invoiceId={invoiceId} onNavigate={onNavigate} />
}

function PaymentDetailRoute({ onNavigate }) {
  const { paymentId } = useParams()
  return <PaymentDetailPage paymentId={paymentId} onNavigate={onNavigate} />
}

function RecurringInvoiceDetailRoute({ user, onNavigate }) {
  const { recurringInvoiceId } = useParams()
  return <RecurringInvoiceDetailPage user={user} recurringInvoiceId={recurringInvoiceId} onNavigate={onNavigate} />
}

function RecurringInvoiceEditRoute({ onNavigate }) {
  const { recurringInvoiceId } = useParams()
  return <RecurringInvoiceFormPage recurringInvoiceId={recurringInvoiceId} onNavigate={onNavigate} />
}

function App() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navigateToPage = (page, params = {}) => {
    navigate(pageToPath(page, params))
  }

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

  const activePage = activePageFromPath(location.pathname)
  const activeRootPage = routeRootPage(activePage)

  return (
    <DashboardLayout user={auth.user} activePage={activeRootPage} onNavigate={navigateToPage} onLogout={auth.logout}>
      <Routes>
        <Route path="/dashboard" element={<Navigate to={defaultPageForRole(auth.user?.role)} replace />} />
        <Route path="/dashboard/members" element={<ProtectedPage user={auth.user} page="members"><MembersPage user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/members/:memberId/edit" element={<ProtectedPage user={auth.user} page="member-edit"><MemberEditRoute user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/members/:memberId/password" element={<ProtectedPage user={auth.user} page="member-password"><MemberPasswordRoute user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/clients" element={<ProtectedPage user={auth.user} page="clients"><ClientsPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/clients/new" element={<ProtectedPage user={auth.user} page="client-new"><ClientFormPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/clients/:clientId/edit" element={<ProtectedPage user={auth.user} page="client-edit"><ClientEditRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/products" element={<ProtectedPage user={auth.user} page="products"><ProductsPage user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/products/new" element={<ProtectedPage user={auth.user} page="product-new"><ProductFormPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/products/:productId/edit" element={<ProtectedPage user={auth.user} page="product-edit"><ProductEditRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invoices" element={<ProtectedPage user={auth.user} page="invoices"><InvoicesPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invoices/new" element={<ProtectedPage user={auth.user} page="invoice-new"><InvoiceFormPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invoices/:invoiceId" element={<ProtectedPage user={auth.user} page="invoice-detail"><InvoiceDetailRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invoices/:invoiceId/edit" element={<ProtectedPage user={auth.user} page="invoice-edit"><InvoiceEditRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/payments" element={<ProtectedPage user={auth.user} page="payments"><PaymentsPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/payments/:paymentId" element={<ProtectedPage user={auth.user} page="payment-detail"><PaymentDetailRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/recurring-invoices" element={<ProtectedPage user={auth.user} page="recurring"><RecurringInvoicesPage user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/recurring-invoices/new" element={<ProtectedPage user={auth.user} page="recurring-new"><RecurringInvoiceFormPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/recurring-invoices/:recurringInvoiceId" element={<ProtectedPage user={auth.user} page="recurring-detail"><RecurringInvoiceDetailRoute user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/recurring-invoices/:recurringInvoiceId/edit" element={<ProtectedPage user={auth.user} page="recurring-edit"><RecurringInvoiceEditRoute onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invitations" element={<ProtectedPage user={auth.user} page="invitations"><InvitationsPage user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/invitations/new" element={<ProtectedPage user={auth.user} page="invitation-new"><InvitationCreatePage user={auth.user} onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/organization" element={<ProtectedPage user={auth.user} page="organization"><OrganizationPage user={auth.user} onUpdated={auth.refresh} /></ProtectedPage>} />
        <Route path="/dashboard/subscription" element={<ProtectedPage user={auth.user} page="subscription"><SubscriptionPage user={auth.user} onUpdated={auth.refresh} /></ProtectedPage>} />
        <Route path="/dashboard/profile" element={<ProtectedPage user={auth.user} page="profile"><ProfilePage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="/dashboard/profile/edit" element={<ProtectedPage user={auth.user} page="profile-edit"><ProfileEditPage onNavigate={navigateToPage} onUpdated={auth.refresh} /></ProtectedPage>} />
        <Route path="/dashboard/profile/password" element={<ProtectedPage user={auth.user} page="profile-password"><ChangePasswordPage onNavigate={navigateToPage} /></ProtectedPage>} />
        <Route path="*" element={<Navigate to={defaultPageForRole(auth.user?.role)} replace />} />
      </Routes>
    </DashboardLayout>
  )
}

export default App
