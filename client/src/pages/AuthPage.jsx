import { CheckCircle2, FileText, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import heroImg from '../assets/singil-hero-illustration.svg'
import { Button } from '../components/Button'
import { Field, inputClassName } from '../components/Form'
import { Notice } from '../components/Notice'
import logoImage from '../assets/singil-favicon-green.svg'
import logoImageLogin from '../assets/singil_login_wave.svg'
import registerImage from '../assets/singil_register_workspace.svg'
import { usePlanCatalog } from '../hooks/usePlanCatalog'
const initialLogin = { email: '', password: '' }
const initialRegister = {
  name: '',
  lastName: '',
  organizationName: '',
  email: '',
  password: '',
  role: 'owner',
  code: '',
}

const features = [
  { title: 'Clients', text: 'Keep customer profiles, contact details, currencies, and notes ready for billing.', icon: Users },
  { title: 'Products', text: 'Save services, rates, units, and tax values so invoice work starts from clean data.', icon: FileText },
  { title: 'Teams', text: 'Invite owners, admins, and members with access that matches their work.', icon: ShieldCheck },
]

function PublicNav() {
  const linkClass = ({ isActive }) => (isActive ? 'text-ink' : 'hover:text-ink')

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImage} width={36} height={36} />
          <div>
            <p className="text-sm font-semibold">Singil</p>
            <p className="text-xs text-muted">Invoice operations</p>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
          <NavLink to="/subscription" className={linkClass}>Subscription</NavLink>
          <NavLink to="/login" className={linkClass}>Login</NavLink>
        </div>

        <Button as={Link} to="/register">Get started</Button>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-panel px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-ink">Singil</p>
          <p>Billing workspace for teams that want cleaner invoice operations.</p>
        </div>
        <div className="flex gap-4">
          <Link to="/about" className="hover:text-ink">About</Link>
          <Link to="/subscription" className="hover:text-ink">Subscription</Link>
          <Link to="/login" className="hover:text-ink">Login</Link>
        </div>
      </div>
    </footer>
  )
}

function AboutSection() {
  return (
    <section className="border-b border-line bg-panel px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">One place for the work before the invoice</h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Singil helps your team keep client records, product pricing, and member access organized before invoices and payments become messy.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="rounded-md border border-line bg-surface p-5">
                <Icon className="mb-4 text-accent" size={24} />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SubscriptionSection({ compact = false }) {
  const { plans, loading, error } = usePlanCatalog()

  return (
    <section className="border-b border-line bg-surface px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">Subscription plans</h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Start with a simple workspace, then upgrade when your billing process needs more automation and team control.
          </p>
        </div>
        {loading ? <p className="text-sm text-muted">Loading plans...</p> : null}
        {error ? <Notice>{error}</Notice> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-md border border-line bg-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{plan.description}</p>
                </div>
                <p className="text-right text-sm font-semibold text-accent">{plan.priceLabel}</p>
              </div>
              <ul className="mt-5 grid gap-3 text-sm text-muted">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="shrink-0 text-accent" size={17} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {!compact ? (
                <Button as={Link} to="/register" className="mt-6 w-full" variant={plan.name === 'Free' ? 'secondary' : 'primary'}>
                  Choose {plan.name}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <>
      <section className="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden border-b border-line bg-[#edf5f2] px-4 py-14 sm:px-6 lg:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)] lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-md border border-line bg-panel px-3 py-1 text-sm font-medium text-accent">
              Billing workspace for Philippine teams
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
              Manage clients, products, invitations, and billing operations in one workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Singil keeps the everyday setup work for invoicing organized, so teams can spend less time chasing records and more time collecting payments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/register">Create workspace</Button>
              <Button as={Link} to="/login" variant="secondary">Sign in</Button>
            </div>
          </div>

          <div className="relative min-h-[18rem] overflow-hidden rounded-md border border-line bg-panel shadow-sm sm:min-h-[24rem] lg:min-h-[30rem]">
            <img
              src={heroImg}
              alt="Person working on invoices and billing"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </section>
      <AboutSection />
      <SubscriptionSection compact />
    </>
  )
}

function AboutPage() {
  return (
    <section className="min-h-[calc(100vh-4rem)] bg-panel px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Billing work stays easier when the basics stay organized</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Singil is designed for owners, admins, and members who need a shared place for client records, service pricing, organization roles, and invitation-based onboarding.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="rounded-md border border-line bg-surface p-5">
                <Icon className="mb-4 text-accent" size={24} />
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SubscriptionPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <SubscriptionSection />
    </div>
  )
}

function AuthFormPage({ mode, onLogin, onRegister }) {
  const navigate = useNavigate()
  const authImage = mode === 'login' ? logoImageLogin : registerImage
  const authImageAlt = mode === 'login' ? 'Person signing in to Singil' : 'Team creating a Singil workspace'
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitLogin = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onLogin(loginForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...registerForm }
      if (payload.role === 'owner') delete payload.code
      if (payload.role !== 'owner') delete payload.organizationName
      await onRegister(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-panel px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        <div className="grid gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold sm:text-4xl">{mode === 'login' ? 'Sign in to Singil' : 'Create your Singil workspace'}</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Owners can create a workspace. Invited admins and members can join with the exact invitation code and role assigned to them.
            </p>
          </div>
          <div className="hidden overflow-hidden rounded-md border border-line bg-surface md:block">
            <img
              src={authImage}
              alt={authImageAlt}
              className="h-[22rem] w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="rounded-md border border-line bg-panel p-5 shadow-sm">
          <div className="mb-6 inline-flex rounded-md border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`h-9 rounded px-4 text-sm font-medium ${mode === 'login' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className={`h-9 rounded px-4 text-sm font-medium ${mode === 'register' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
            >
              Register
            </button>
          </div>

          <div className="mb-4">
            <Notice>{error}</Notice>
          </div>

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="grid gap-4">
              <Field label="Email">
                <input required={true} className={inputClassName()} value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
              </Field>
              <Field label="Password">
                <input required={true} className={inputClassName()} type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
              </Field>
              <Button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input required={true} className={inputClassName()} value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} />
                </Field>
                <Field label="Last name">
                  <input required={true} className={inputClassName()} value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} />
                </Field>
              </div>
              <Field label="Account type">
                <select required={true} className={inputClassName()} value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                  <option value="owner">Owner</option>
                  <option value="member">Invited member</option>
                  <option value="admin">Invited admin</option>
                </select>
              </Field>
              {registerForm.role === 'owner' ? (
                <Field label="Organization name">
                  <input required={true} className={inputClassName()} value={registerForm.organizationName} onChange={(event) => setRegisterForm({ ...registerForm, organizationName: event.target.value })} />
                </Field>
              ) : (
                <Field label="Invitation code">
                  <input required={true} className={inputClassName()} value={registerForm.code} onChange={(event) => setRegisterForm({ ...registerForm, code: event.target.value })} />
                </Field>
              )}
              <Field label="Email">
                <input required={true} className={inputClassName()} value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
              </Field>
              <Field label="Password">
                <input required={true} className={inputClassName()} type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} />
              </Field>
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

export function AuthPage({ onLogin, onRegister }) {
  return (
    <main className="min-h-screen bg-panel text-ink">
      <PublicNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/login" element={<AuthFormPage mode="login" onLogin={onLogin} onRegister={onRegister} />} />
        <Route path="/register" element={<AuthFormPage mode="register" onLogin={onLogin} onRegister={onRegister} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </main>
  )
}
