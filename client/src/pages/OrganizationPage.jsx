import { ImageUp, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Field, inputClassName } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { organizationApi } from '../services/api'

export function OrganizationPage({ user, onUpdated }) {
  const [name, setName] = useState(user?.organization?.name ?? '')
  const [logo, setLogo] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(user?.organization?.name ?? '')
  }, [user?.organization?.name])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const data = new FormData()
      if (name) data.append('name', name)
      if (logo) data.append('logo', logo)
      await organizationApi.updateProfile(data)
      setMessage('Organization updated.')
      setLogo(null)
      await onUpdated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <PageHeader title="Organization" description="Update your workspace profile." />

      <form onSubmit={submit} className="grid max-w-3xl gap-5 p-5">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          {user?.organization?.logoUrl ? (
            <img src={user.organization.logoUrl} alt="" className="size-16 rounded-md object-cover ring-1 ring-line" />
          ) : (
            <div className="grid size-16 place-items-center rounded-md bg-surface ring-1 ring-line">
              <ImageUp className="text-muted" size={24} />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink">{user?.organization?.name ?? 'Organization'}</p>
            <p className="text-sm text-muted">{user?.organization?.slug ?? 'No slug yet'}</p>
          </div>
        </div>

        <Field label="Organization name">
          <input className={inputClassName('max-w-md')} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>

        <Field label="Logo">
          <input className="block max-w-md text-sm text-muted file:mr-4 file:h-10 file:rounded-md file:border-0 file:bg-accent file:px-3 file:text-sm file:font-medium file:text-white" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
        </Field>

        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}

        <Button type="submit" disabled={submitting} className="w-fit">
          <Save size={17} />
          {submitting ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </section>
  )
}
