import { RefreshCw, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { inputClassName } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { organizationApi } from '../services/api'
import { formatDate, roleLabel } from '../utils/format'

export function MembersPage() {
  const [members, setMembers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 })
  const [drafts, setDrafts] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadMembers = async () => {
    setLoading(true)
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await organizationApi.members(params)
      const nextMembers = data.members ?? []
      setMembers(nextMembers)
      setDrafts(Object.fromEntries(nextMembers.map((member) => [
        member.id,
        { role: member.role, status: member.status ?? 'active' },
      ])))
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
  }, [filters.page, filters.status])

  const updateMember = async (member) => {
    const draft = drafts[member.id]
    if (!draft) return

    const patch = {}
    if (draft.role !== member.role) patch.role = draft.role
    if (draft.status !== (member.status ?? 'active')) patch.status = draft.status
    if (Object.keys(patch).length === 0) return

    await organizationApi.updateMember(member.id, patch)
    await loadMembers()
  }

  const updateDraft = (memberId, patch) => {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...current[memberId],
        ...patch,
      },
    }))
  }

  const deleteMember = async (member) => {
    if (!window.confirm(`Delete ${member.name} ${member.lastName}?`)) return
    await organizationApi.deleteMember(member.id)
    await loadMembers()
  }

  return (
    <section>
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
            <option value="inactive">Inactive</option>
          </select>
          <Button variant="secondary" onClick={loadMembers}>Apply</Button>
        </div>
      </div>

      {error ? <div className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div> : null}

      <div className="overflow-x-auto bg-panel">
        <table className="w-full min-w-[820px] text-left text-sm">
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
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-surface/70">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{member.name} {member.lastName}</p>
                  <p className="text-sm text-muted">{member.email}</p>
                </td>
                <td className="px-5 py-3">
                  <select className={inputClassName('w-32')} value={drafts[member.id]?.role ?? member.role} onChange={(event) => updateDraft(member.id, { role: event.target.value })}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <select className={inputClassName('w-32')} value={drafts[member.id]?.status ?? member.status ?? 'active'} onChange={(event) => updateDraft(member.id, { status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inActive">Inactive</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-muted">{formatDate(member.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" onClick={() => updateMember(member)} title="Save member changes" aria-label="Save member changes" className="mr-1 w-10 px-0">
                    <Save size={17} />
                  </Button>
                  <Button variant="ghost" onClick={() => deleteMember(member)} title="Delete member" aria-label="Delete member" className="w-10 px-0 text-danger">
                    <Trash2 size={17} />
                  </Button>
                </td>
              </tr>
            ))}
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
