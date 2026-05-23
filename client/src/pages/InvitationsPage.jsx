import { Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { invitationApi } from '../services/api'
import { formatDate } from '../utils/format'

function defaultExpiry() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 16)
}

export function InvitationsPage({ user }) {
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ role: 'member', expiresAt: defaultExpiry(), organizationId: '' })
  const [filters, setFilters] = useState({
    organizationId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    createdFrom: '',
    createdTo: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadInvitations = async () => {
    setLoading(true)
    setError('')
    try {
      if (user?.role === 'system_admin' && !filters.organizationId) {
        setInvitations([])
        setPagination({ page: 1, limit: 10, totalPages: 1, total: 0 })
        return
      }

      const params = Object.fromEntries(Object.entries({
        page,
        limit: 10,
        organizationId: filters.organizationId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        createdFrom: filters.createdFrom ? new Date(filters.createdFrom).toISOString() : '',
        createdTo: filters.createdTo ? new Date(filters.createdTo).toISOString() : '',
      }).filter(([, value]) => value !== ''))

      const data = await invitationApi.list(params)
      const invitationRows = data.invitations?.invitations ?? data.invitations ?? []
      setInvitations(invitationRows.map((invitation) => ({
        ...invitation,
        role: invitation.role ?? 'member',
      })))
      setPagination(data.invitations?.pagination ?? data.pagination ?? pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const createInvitation = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const payload = {
        role: form.role,
        expiresAt: new Date(form.expiresAt).toISOString(),
      }
      const targetOrganizationId = form.organizationId || filters.organizationId
      if (user?.role === 'system_admin' && targetOrganizationId) {
        payload.organizationId = Number(targetOrganizationId)
      }
      await invitationApi.create(payload)
      setForm({ role: 'member', expiresAt: defaultExpiry(), organizationId: '' })
      await loadInvitations()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteInvitation = async (invitation) => {
    if (!window.confirm('Delete this invitation?')) return
    const params = user?.role === 'system_admin' ? { organizationId: filters.organizationId } : {}
    await invitationApi.delete(invitation.id, params)
    await loadInvitations()
  }

  return (
    <section>
      <PageHeader title="Invitations" description="Create and manage organization invitation codes." />

      <div className="grid gap-5 border-b border-line bg-panel p-5 xl:grid-cols-[360px_1fr]">
        <form onSubmit={createInvitation} className="grid content-start gap-4">
          {user?.role === 'system_admin' ? (
            <Field label="Target organization ID">
              <input className={inputClassName()} value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })} placeholder={filters.organizationId || 'Required'} />
            </Field>
          ) : null}
          <Field label="Invite role">
            <select className={inputClassName()} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </Field>
          <Field label="Expires at">
            <input className={inputClassName()} type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </Field>
          <Button type="submit">
            <Plus size={17} />
            Create invitation
          </Button>
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
        </form>

        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_180px_180px_90px]">
            {user?.role === 'system_admin' ? (
              <input
                className={inputClassName()}
                placeholder="Organization ID"
                value={filters.organizationId}
                onChange={(event) => setFilters({ ...filters, organizationId: event.target.value })}
              />
            ) : <div />}
            <select className={inputClassName()} value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}>
              <option value="createdAt">Created</option>
              <option value="expiresAt">Expires</option>
            </select>
            <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value })}>
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
            <input className={inputClassName()} type="date" value={filters.createdFrom} onChange={(event) => setFilters({ ...filters, createdFrom: event.target.value })} />
            <input className={inputClassName()} type="date" value={filters.createdTo} onChange={(event) => setFilters({ ...filters, createdTo: event.target.value })} />
            <Button variant="secondary" type="button" onClick={() => { setPage(1); loadInvitations() }}>Apply</Button>
          </div>

          {user?.role === 'system_admin' && !filters.organizationId ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warn">
              Enter an organization ID to list invitations as system admin.
            </div>
          ) : null}

        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invitations.map((invitation) => {
                const expired = invitation.expiresAt && new Date(invitation.expiresAt) <= new Date()
                const used = Boolean(invitation.usedAt)

                return (
                  <tr key={invitation.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{invitation.code}</td>
                    <td className="px-4 py-3 capitalize">{invitation.role ?? 'member'}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(invitation.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={used ? 'neutral' : expired ? 'danger' : 'active'}>
                        {used ? 'Used' : expired ? 'Expired' : 'Active'}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" title="Copy code" aria-label="Copy code" className="mr-1 w-10 px-0" onClick={() => navigator.clipboard?.writeText(invitation.code)}>
                        <Copy size={17} />
                      </Button>
                      <Button variant="ghost" title="Delete invitation" aria-label="Delete invitation" className="w-10 px-0 text-danger" onClick={() => deleteInvitation(invitation)}>
                        <Trash2 size={17} />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && invitations.length === 0 ? <EmptyState title="No invitations yet" description="Create a code to invite someone." /> : null}
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-panel px-5 py-4 text-sm">
        <span className="text-muted">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </section>
  )
}
