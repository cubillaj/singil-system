import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { Modal } from '../components/Modal'
import { MobileCard, MobileList, MobileMeta } from '../components/MobileList'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useDebounce } from '../hooks/useDebounce'
import { invitationApi } from '../services/api'
import { formatDate } from '../utils/format'

function defaultExpiry() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 16)
}

export function InvitationsPage({ user, onNavigate }) {
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    organizationId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    createdFrom: '',
    createdTo: '',
  })
  const [error, setError] = useState('')
  const [modal, setModal] = useState({ open: false })
  const [inviteToDelete, setInviteToDelete] = useState(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectedInvitationIds, setSelectedInvitationIds] = useState([])
  const [loading, setLoading] = useState(false)
  const debouncedFilters = useDebounce(filters)

  const selectedCount = selectedInvitationIds.length
  const visibleInvitationIds = invitations.map((invitation) => invitation.id)
  const allVisibleSelected = visibleInvitationIds.length > 0 && visibleInvitationIds.every((id) => selectedInvitationIds.includes(id))

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
      setSelectedInvitationIds([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFilters])

  const confirmDeleteInvitation = async () => {
    if (!inviteToDelete) return
    const params = user?.role === 'system_admin' ? { organizationId: filters.organizationId } : {}
    setError('')
    try {
      await invitationApi.delete(inviteToDelete.id, params)
      setModal({
        open: true,
        tone: 'success',
        title: 'Invitation deleted',
        message: 'The invitation code was removed successfully.',
        confirmText: 'Done',
        onConfirm: () => setModal({ open: false }),
      })
      setInviteToDelete(null)
      await loadInvitations()
    } catch (err) {
      setError(err.message)
      setInviteToDelete(null)
    }
  }

  const toggleInvitationSelection = (id) => {
    setSelectedInvitationIds((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ))
  }

  const toggleAllVisibleInvitations = () => {
    setSelectedInvitationIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleInvitationIds.includes(id))
      }

      return [...new Set([...current, ...visibleInvitationIds])]
    })
  }

  const confirmBulkDeleteInvitations = async () => {
    if (selectedCount === 0) return
    const params = user?.role === 'system_admin' ? { organizationId: filters.organizationId } : {}
    setError('')
    try {
      await invitationApi.bulkDelete(selectedInvitationIds, params)
      setModal({
        open: true,
        tone: 'success',
        title: 'Invitations deleted',
        message: `${selectedCount} invitation${selectedCount === 1 ? '' : 's'} removed successfully.`,
        confirmText: 'Done',
        onConfirm: () => setModal({ open: false }),
      })
      setBulkDeleteOpen(false)
      setSelectedInvitationIds([])
      await loadInvitations()
    } catch (err) {
      setError(err.message)
      setBulkDeleteOpen(false)
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
        onConfirm={modal.onConfirm}
        onClose={modal.onClose}
      />
      <Modal
        open={Boolean(inviteToDelete)}
        tone="danger"
        title="Delete invitation?"
        message="This invitation code will no longer be usable."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteInvitation}
        onCancel={() => setInviteToDelete(null)}
      />
      <Modal
        open={bulkDeleteOpen}
        tone="danger"
        title="Delete selected invitations?"
        message={`${selectedCount} invitation${selectedCount === 1 ? '' : 's'} will no longer be usable.`}
        confirmText="Delete selected"
        cancelText="Cancel"
        onConfirm={confirmBulkDeleteInvitations}
        onCancel={() => setBulkDeleteOpen(false)}
      />
      <PageHeader
        title="Invitations"
        description="Create and manage organization invitation codes."
        action={(
          <Button onClick={() => onNavigate('invitation-new', { organizationId: filters.organizationId })}>
            <Plus size={16} />
            New invitation
          </Button>
        )}
      />

      <div className="grid gap-3 border-b border-line bg-panel p-5">
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

        <Notice>{error}</Notice>

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm">
            <span className="font-medium text-ink">{selectedCount} selected</span>
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => setSelectedInvitationIds([])}>Clear</Button>
              <Button variant="danger" type="button" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        <MobileList>
          {invitations.map((invitation) => {
            const expired = invitation.expiresAt && new Date(invitation.expiresAt) <= new Date()
            const used = Boolean(invitation.usedAt)
            const selected = selectedInvitationIds.includes(invitation.id)

            return (
              <MobileCard key={invitation.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleInvitationSelection(invitation.id)}
                      aria-label={`Select invitation ${invitation.code}`}
                      className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-ink">{invitation.code}</p>
                      <p className="mt-1 text-sm capitalize text-muted">{invitation.role ?? 'member'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" title="Copy code" aria-label="Copy code" className="w-9 px-0" onClick={() => navigator.clipboard?.writeText(invitation.code)}>
                      <Copy size={16} />
                    </Button>
                    <Button variant="ghost" title="Delete invitation" aria-label="Delete invitation" className="w-9 px-0 text-danger" onClick={() => setInviteToDelete(invitation)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MobileMeta label="Expires">{formatDate(invitation.expiresAt)}</MobileMeta>
                  <MobileMeta label="Status">
                    <StatusPill tone={used ? 'neutral' : expired ? 'danger' : 'active'}>
                      {used ? 'Used' : expired ? 'Expired' : 'Active'}
                    </StatusPill>
                  </MobileMeta>
                </div>
              </MobileCard>
            )
          })}
        </MobileList>

        <div className="hidden overflow-x-auto bg-white md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleInvitations}
                    aria-label="Select all visible invitations"
                    className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  />
                </th>
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
                const selected = selectedInvitationIds.includes(invitation.id)

                return (
                  <tr key={invitation.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleInvitationSelection(invitation.id)}
                        aria-label={`Select invitation ${invitation.code}`}
                        className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                      />
                    </td>
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
                      <Button variant="ghost" title="Delete invitation" aria-label="Delete invitation" className="w-10 px-0 text-danger" onClick={() => setInviteToDelete(invitation)}>
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

export function InvitationCreatePage({ user, onNavigate }) {
  const [form, setForm] = useState({ role: 'member', expiresAt: defaultExpiry(), organizationId: '' })
  const [error, setError] = useState('')
  const [successModal, setSuccessModal] = useState({ open: false })
  const [saving, setSaving] = useState(false)

  const createInvitation = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        role: form.role,
        expiresAt: new Date(form.expiresAt).toISOString(),
      }

      if (user?.role === 'system_admin') {
        payload.organizationId = Number(form.organizationId)
      }

      await invitationApi.create(payload)
      setSuccessModal({
        open: true,
        title: 'Invitation created',
        message: 'The new invitation code is ready to share.',
      })
    } catch (err) {
      setError(err.message)
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
        confirmText="Back to invitations"
        onConfirm={() => onNavigate('invitations')}
        onClose={() => onNavigate('invitations')}
      />
      <PageHeader
        title="Create Invitation"
        description="Generate a code for a new organization user."
        action={(
          <Button variant="secondary" onClick={() => onNavigate('invitations')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={createInvitation} className="grid max-w-2xl gap-5 p-5">
        <Notice>{error}</Notice>
        {user?.role === 'system_admin' ? (
          <Field label="Target organization ID">
            <input className={inputClassName()} value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })} required />
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
          <input className={inputClassName()} type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} required />
        </Field>
        <Button type="submit" disabled={saving} className="w-fit">
          <Plus size={17} />
          {saving ? 'Creating...' : 'Create invitation'}
        </Button>
      </form>
    </section>
  )
}
