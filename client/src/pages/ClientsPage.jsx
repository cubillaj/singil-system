import { ArrowLeft, Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { Modal } from '../components/Modal'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { clientApi } from '../services/api'

const emptyForm = {
  fullName: '',
  email: '',
  contactPerson: '',
  contactPhone: '',
  company: '',
  currency: 'PH',
  barangay: '',
  province: '',
  region: '',
  city: '',
  country: 'Philippines',
  notes: '',
}

const currencies = ['PH', 'USD', 'EUR', 'CAD', 'AUD']

function cleanPayload(form) {
  return Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  )
}

function clientToForm(client) {
  return {
    ...emptyForm,
    fullName: client.name ?? '',
    email: client.email ?? '',
    contactPerson: client.contactPerson ?? '',
    contactPhone: client.contactPhone ?? '',
    company: client.company ?? '',
    currency: client.currency ?? 'PH',
    barangay: client.barangay ?? '',
    province: client.province ?? '',
    region: client.region ?? '',
    city: client.city ?? '',
    country: client.country ?? 'Philippines',
    notes: client.notes ?? '',
  }
}

export function ClientsPage({ onNavigate }) {
  const [clients, setClients] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', currency: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [modal, setModal] = useState({ open: false })
  const [clientToDelete, setClientToDelete] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadClients = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await clientApi.list(params)
      setClients(data.clients ?? [])
      setPagination(data.pagination ?? { page: filters.page, limit: filters.limit, totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.currency, filters.sortOrder])

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return
    setNotice({ tone: 'error', message: '' })
    try {
      await clientApi.delete(clientToDelete.id)
      setModal({
        open: true,
        tone: 'success',
        title: 'Client deleted',
        message: `${clientToDelete.name} was removed successfully.`,
        confirmText: 'Done',
        onConfirm: () => setModal({ open: false }),
      })
      setClientToDelete(null)
      await loadClients()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
      setClientToDelete(null)
    }
  }

  return (
    <section>
      <Modal
        open={modal.open}
        tone={modal.tone}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        onClose={modal.onClose}
      />
      <Modal
        open={Boolean(clientToDelete)}
        tone="danger"
        title="Delete client?"
        message={clientToDelete ? `${clientToDelete.name} will be permanently removed from this organization.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteClient}
        onCancel={() => setClientToDelete(null)}
      />
      <PageHeader
        title="Clients"
        description="Manage billing clients for your organization."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadClients}>
              <RefreshCw size={16} />
              Refresh
            </Button>
            <Button onClick={() => onNavigate('client-new')}>
              <Plus size={16} />
              New client
            </Button>
          </div>
        )}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_130px_140px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input
              className={inputClassName('w-full pl-10')}
              placeholder="Search clients"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') loadClients()
              }}
            />
          </div>
          <select className={inputClassName()} value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value, page: 1 })}>
            <option value="">Currency</option>
            {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
          <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value, page: 1 })}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadClients}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4">
        <Notice tone={notice.tone}>{notice.message}</Notice>
      </div>

      <div className="overflow-x-auto bg-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Contact</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Currency</th>
              <th className="px-5 py-3 font-semibold">Location</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface/70">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{client.name}</p>
                  <p className="text-muted">{client.email}</p>
                </td>
                <td className="px-5 py-3 text-muted">{client.contactPerson || client.contactPhone || 'None'}</td>
                <td className="px-5 py-3 text-muted">{client.company || 'None'}</td>
                <td className="px-5 py-3"><StatusPill>{client.currency || 'None'}</StatusPill></td>
                <td className="px-5 py-3 text-muted">{[client.city, client.country].filter(Boolean).join(', ') || 'None'}</td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" className="mr-1 w-10 px-0" title="Edit client" aria-label="Edit client" onClick={() => onNavigate('client-edit', { clientId: client.id })}>
                    <Edit3 size={17} />
                  </Button>
                  <Button variant="ghost" className="w-10 px-0 text-danger" title="Delete client" aria-label="Delete client" onClick={() => setClientToDelete(client)}>
                    <Trash2 size={17} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && clients.length === 0 ? <EmptyState title="No clients found" description="Create a client or adjust the filters." /> : null}

      <div className="flex items-center justify-between border-t border-line bg-panel px-5 py-4 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <StatusPill>{pagination.total} total</StatusPill>
          <span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</Button>
          <Button variant="secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</Button>
        </div>
      </div>
    </section>
  )
}

export function ClientFormPage({ clientId, onNavigate }) {
  const isEditing = Boolean(clientId)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return
      setLoading(true)
      setNotice({ tone: 'error', message: '' })
      try {
        const data = await clientApi.get(clientId)
        setForm(clientToForm(data.client))
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadClient()
  }, [clientId])

  const submitClient = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const payload = cleanPayload(form)
      if (isEditing) {
        await clientApi.update(clientId, payload)
      } else {
        await clientApi.create(payload)
      }
      setSuccessModal({
        open: true,
        title: isEditing ? 'Client updated' : 'Client created',
        message: isEditing ? 'The client details were saved successfully.' : 'The new client is ready to use.',
      })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Modal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        confirmText="Back to clients"
        onConfirm={() => onNavigate('clients')}
        onClose={() => onNavigate('clients')}
      />
      <PageHeader
        title={isEditing ? 'Edit Client' : 'Create Client'}
        description={isEditing ? 'Update client billing and contact details.' : 'Add a new billing client to your organization.'}
        action={(
          <Button variant="secondary" onClick={() => onNavigate('clients')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={submitClient} className="grid max-w-4xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input className={inputClassName()} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required disabled={loading} />
          </Field>
          <Field label="Email">
            <input className={inputClassName()} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={loading} />
          </Field>
          <Field label="Company">
            <input className={inputClassName()} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Currency">
            <select className={inputClassName()} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} disabled={loading}>
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </Field>
          <Field label="Contact person">
            <input className={inputClassName()} value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Contact phone">
            <input className={inputClassName()} value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Barangay">
            <input className={inputClassName()} value={form.barangay} onChange={(event) => setForm({ ...form, barangay: event.target.value })} disabled={loading} />
          </Field>
          <Field label="City">
            <input className={inputClassName()} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Province">
            <input className={inputClassName()} value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Region">
            <input className={inputClassName()} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Country">
            <input className={inputClassName()} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} disabled={loading} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={loading} />
        </Field>
        <Button type="submit" disabled={saving || loading} className="w-fit">
          <Plus size={17} />
          {saving ? 'Saving...' : isEditing ? 'Save client' : 'Create client'}
        </Button>
      </form>
    </section>
  )
}
