import { ArrowLeft, Edit3, KeyRound, RefreshCw, Save, Search, Trash2 } from 'lucide-react'
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
import { organizationApi } from '../services/api'
import { formatDate, roleLabel } from '../utils/format'

function canManageMember(currentUser, member) {
  if (currentUser?.role === 'owner') return true
  return currentUser?.role === 'admin' && member.role === 'member'
}

function canChangeMemberPassword(currentUser, member) {
  if (member.role === 'owner') return false
  if (currentUser?.role === 'owner') return ['admin', 'member'].includes(member.role)
  return currentUser?.role === 'admin' && member.role === 'member'
}

export function MembersPage({ user, onNavigate }) {
  const [members, setMembers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 })
  const [error, setError] = useState('')
  const [modal, setModal] = useState({ open: false })
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(filters.search)

  const loadMembers = async () => {
    setLoading(true)
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await organizationApi.members(params)
      setMembers(data.members ?? [])
      setPagination(data.pagination ?? pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, debouncedSearch])

  const confirmDeleteMember = async () => {
    if (!memberToDelete || !canManageMember(user, memberToDelete)) return
    setError('')
    try {
      await organizationApi.deleteMember(memberToDelete.id)
      setModal({
        open: true,
        tone: 'success',
        title: 'Member deleted',
        message: `${memberToDelete.name} ${memberToDelete.lastName} was removed successfully.`,
        confirmText: 'Done',
        onConfirm: () => setModal({ open: false }),
      })
      setMemberToDelete(null)
      await loadMembers()
    } catch (err) {
      setError(err.message)
      setMemberToDelete(null)
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
        open={Boolean(memberToDelete)}
        tone="danger"
        title="Delete member?"
        message={memberToDelete ? `${memberToDelete.name} ${memberToDelete.lastName} will lose access to this organization.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMember}
        onCancel={() => setMemberToDelete(null)}
      />
      <PageHeader
        title="Members"
        description="Manage users in your organization."
        action={(
          <Button variant="secondary" onClick={loadMembers}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        )}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input
              className={inputClassName('w-full pl-10')}
              placeholder="Search name or email"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') loadMembers()
              }}
            />
          </div>
          <select className={inputClassName()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inActive">Inactive</option>
          </select>
          <Button variant="secondary" onClick={loadMembers}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4">
        <Notice>{error}</Notice>
      </div>

      <MobileList>
        {members.map((member) => {
          const manageable = canManageMember(user, member)

          return (
            <MobileCard key={member.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{member.name} {member.lastName}</p>
                  <p className="mt-1 text-sm text-muted">{member.email}</p>
                </div>
                {manageable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" onClick={() => onNavigate('member-edit', { memberId: member.id })} title="Edit member" aria-label="Edit member" className="w-9 px-0">
                      <Edit3 size={16} />
                    </Button>
                    <Button variant="ghost" onClick={() => setMemberToDelete(member)} title="Delete member" aria-label="Delete member" className="w-9 px-0 text-danger">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MobileMeta label="Role"><StatusPill>{roleLabel(member.role)}</StatusPill></MobileMeta>
                <MobileMeta label="Status"><StatusPill tone={member.status === 'active' ? 'active' : 'neutral'}>{member.status ?? 'active'}</StatusPill></MobileMeta>
                <MobileMeta label="Created">{formatDate(member.createdAt)}</MobileMeta>
              </div>
            </MobileCard>
          )
        })}
      </MobileList>

      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((member) => {
              const manageable = canManageMember(user, member)

              return (
                <tr key={member.id} className="hover:bg-surface/70">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{member.name} {member.lastName}</p>
                    <p className="text-sm text-muted">{member.email}</p>
                  </td>
                  <td className="px-5 py-3"><StatusPill>{roleLabel(member.role)}</StatusPill></td>
                  <td className="px-5 py-3">
                    <StatusPill tone={member.status === 'active' ? 'active' : 'neutral'}>{member.status ?? 'active'}</StatusPill>
                  </td>
                  <td className="px-5 py-3 text-muted">{formatDate(member.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {manageable ? (
                      <>
                        <Button variant="ghost" onClick={() => onNavigate('member-edit', { memberId: member.id })} title="Edit member" aria-label="Edit member" className="mr-1 w-10 px-0">
                          <Edit3 size={17} />
                        </Button>
                        <Button variant="ghost" onClick={() => setMemberToDelete(member)} title="Delete member" aria-label="Delete member" className="w-10 px-0 text-danger">
                          <Trash2 size={17} />
                        </Button>
                      </>
                    ) : <span className="text-xs text-muted">Restricted</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!loading && members.length === 0 ? <EmptyState title="No members found" description="Adjust filters or invite someone new." /> : null}

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

export function MemberEditPage({ user, memberId, onNavigate }) {
  const [member, setMember] = useState(null)
  const [form, setForm] = useState({ role: 'member', status: 'active' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadMember = async () => {
      setLoading(true)
      setNotice({ tone: 'error', message: '' })
      try {
        const data = await organizationApi.member(memberId)
        setMember(data.user)
        setForm({ role: data.user.role, status: data.user.status ?? 'active' })
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadMember()
  }, [memberId])

  const saveMember = async (event) => {
    event.preventDefault()
    if (!member || !canManageMember(user, member)) return
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      await organizationApi.updateMember(memberId, form)
      setSuccessModal({
        open: true,
        title: 'Member updated',
        message: 'The member access settings were saved successfully.',
      })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const ownerOnlyRole = user?.role !== 'owner'

  return (
    <section>
      <Modal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        confirmText="Back to members"
        onConfirm={() => onNavigate('members')}
        onClose={() => onNavigate('members')}
      />
      <PageHeader
        title="Edit Member"
        description="Update organization member access and account status."
        action={(
          <div className="flex gap-2">
            {member && canChangeMemberPassword(user, member) ? (
              <Button variant="secondary" onClick={() => onNavigate('member-password', { memberId })}>
                <KeyRound size={16} />
                Change password
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => onNavigate('members')}>
              <ArrowLeft size={16} />
              Back
            </Button>
          </div>
        )}
      />

      <form onSubmit={saveMember} className="grid max-w-2xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="border-b border-line pb-4">
          <p className="text-sm font-semibold text-ink">{member?.name} {member?.lastName}</p>
          <p className="text-sm text-muted">{member?.email}</p>
        </div>
        <Field label="Role">
          <select className={inputClassName()} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} disabled={loading || ownerOnlyRole}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClassName()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} disabled={loading}>
            <option value="active">Active</option>
            <option value="inActive">Inactive</option>
          </select>
        </Field>
        <Button type="submit" disabled={saving || loading || !member || !canManageMember(user, member)} className="w-fit">
          <Save size={17} />
          {saving ? 'Saving...' : 'Save member'}
        </Button>
      </form>
    </section>
  )
}

export function MemberPasswordPage({ user, memberId, onNavigate }) {
  const [member, setMember] = useState(null)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadMember = async () => {
      setLoading(true)
      setNotice({ tone: 'error', message: '' })
      try {
        const data = await organizationApi.member(memberId)
        setMember(data.user)
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadMember()
  }, [memberId])

  const submitPassword = async (event) => {
    event.preventDefault()
    if (!member || !canChangeMemberPassword(user, member)) return

    if (form.newPassword !== form.confirmPassword) {
      setNotice({ tone: 'error', message: 'New password and confirm password do not match' })
      return
    }

    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      await organizationApi.changeMemberPassword(memberId, { newPassword: form.newPassword })
      setSuccessModal({
        open: true,
        title: 'Password changed',
        message: `${member.name} ${member.lastName}'s password was updated successfully.`,
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
        confirmText="Back to members"
        onConfirm={() => onNavigate('members')}
        onClose={() => onNavigate('members')}
      />
      <PageHeader
        title="Change Member Password"
        description="Set a strong temporary password for an organization user."
        action={(
          <Button variant="secondary" onClick={() => onNavigate('member-edit', { memberId })}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={submitPassword} className="grid max-w-2xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="border-b border-line pb-4">
          <p className="text-sm font-semibold text-ink">{member?.name} {member?.lastName}</p>
          <p className="text-sm text-muted">{member?.email}</p>
        </div>
        {!loading && member && !canChangeMemberPassword(user, member) ? (
          <Notice tone="warning">You cannot change this user's password.</Notice>
        ) : null}
        <Field label="New password">
          <input className={inputClassName()} type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required disabled={loading || !member || !canChangeMemberPassword(user, member)} />
        </Field>
        <Field label="Confirm new password">
          <input className={inputClassName()} type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required disabled={loading || !member || !canChangeMemberPassword(user, member)} />
        </Field>
        <Button type="submit" disabled={saving || loading || !member || !canChangeMemberPassword(user, member)} className="w-fit">
          <Save size={17} />
          {saving ? 'Saving...' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
