import { useState } from 'react'
import heroImg from '../assets/hero.png'
import { Button } from '../components/Button'
import { Field, inputClassName } from '../components/Form'

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

export function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
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
    <main className="grid min-h-screen bg-panel lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden border-r border-line bg-surface px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-accent text-sm font-bold text-white">S</div>
          <div>
            <p className="text-base font-semibold text-ink">Singil</p>
            <p className="text-sm text-muted">Invoice operations</p>
          </div>
        </div>
        <div className="max-w-lg">
          <img src={heroImg} alt="" className="mb-10 h-36 w-36 object-contain" />
          <h1 className="text-4xl font-semibold tracking-normal text-ink">Manage billing teams with less drift.</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">
            Sign in to manage organization members, invitations, and workspace profile settings.
          </p>
        </div>
        <p className="text-sm text-muted">Local API: {import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 lg:hidden">
            <div className="mb-3 grid size-10 place-items-center rounded-md bg-accent text-sm font-bold text-white">S</div>
            <h1 className="text-2xl font-semibold text-ink">Singil</h1>
          </div>

          <div className="mb-6 inline-flex rounded-md border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`h-9 rounded px-4 text-sm font-medium ${mode === 'login' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`h-9 rounded px-4 text-sm font-medium ${mode === 'register' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
            >
              Register
            </button>
          </div>

          {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div> : null}

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="grid gap-4">
              <Field label="Email">
                <input className={inputClassName()} value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
              </Field>
              <Field label="Password">
                <input className={inputClassName()} type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
              </Field>
              <Button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input className={inputClassName()} value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} />
                </Field>
                <Field label="Last name">
                  <input className={inputClassName()} value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} />
                </Field>
              </div>
              <Field label="Account type">
                <select className={inputClassName()} value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                  <option value="owner">Owner</option>
                  <option value="member">Invited member</option>
                  <option value="admin">Invited admin</option>
                </select>
              </Field>
              {registerForm.role === 'owner' ? (
                <Field label="Organization name">
                  <input className={inputClassName()} value={registerForm.organizationName} onChange={(event) => setRegisterForm({ ...registerForm, organizationName: event.target.value })} />
                </Field>
              ) : (
                <Field label="Invitation code">
                  <input className={inputClassName()} value={registerForm.code} onChange={(event) => setRegisterForm({ ...registerForm, code: event.target.value })} />
                </Field>
              )}
              <Field label="Email">
                <input className={inputClassName()} value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
              </Field>
              <Field label="Password">
                <input className={inputClassName()} type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} />
              </Field>
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</Button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
