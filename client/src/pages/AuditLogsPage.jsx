import { RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { inputClassName } from '../components/Form'
import { MobileCard, MobileList, MobileMeta } from '../components/MobileList'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useDebounce } from '../hooks/useDebounce'
import { auditLogApi } from '../services/api'
import { formatDate, roleLabel } from '../utils/format'

const entityTypes = [
  'client',
  'invoice',
  'invitation',
  'organization',
  'payment',
  'product',
  'recurring_invoice',
  'subscription',
  'user',
]

function labelFromValue(value) {
  return value?.replaceAll('_', ' ').replaceAll('.', ' ') ?? ''
}

function actorName(log) {
  if (!log.user) return 'Deleted user'

  return `${log.user.name ?? ''} ${log.user.lastName ?? ''}`.trim() || log.user.email
}

function metadataSummary(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'No metadata'

  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${labelFromValue(key)}: ${String(value)}`)
    .join(' | ') || 'No metadata'
}

function roleTone(role) {
  if (role === 'owner') return 'active'
  if (role === 'admin') return 'warning'
  return 'neutral'
}

export function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    entityType: '',
    createdFrom: '',
    createdTo: '',
    page: 1,
    limit: 20,
  })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(false)
  const debouncedFilters = useDebounce(filters)

  const buildParams = (sourceFilters) => Object.fromEntries(Object.entries(sourceFilters).filter(([, value]) => value !== ''))

  const params = useMemo(() => buildParams(filters), [filters])
  const debouncedParams = useMemo(() => buildParams(debouncedFilters), [debouncedFilters])

  const loadAuditLogs = async (requestParams = params) => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })

    try {
      const data = await auditLogApi.list(requestParams)
      setAuditLogs(data.auditLogs ?? [])
      setPagination(data.pagination ?? { page: Number(requestParams.page ?? filters.page), limit: Number(requestParams.limit ?? filters.limit), totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs(debouncedParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedParams])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      entityType: '',
      createdFrom: '',
      createdTo: '',
      page: 1,
      limit: 20,
    })
  }

  return (
    <section>
      <PageHeader
        title="Audit Logs"
        description="Owner-only history of organization write activity."
        action={<Button variant="secondary" onClick={loadAuditLogs}><RefreshCw size={16} />Refresh</Button>}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_170px_150px_150px_92px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input
              className={inputClassName('w-full pl-10')}
              placeholder="Search action"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') loadAuditLogs() }}
            />
          </div>
          <select className={inputClassName()} value={filters.entityType} onChange={(event) => updateFilter('entityType', event.target.value)}>
            <option value="">All entities</option>
            {entityTypes.map((type) => <option key={type} value={type}>{labelFromValue(type)}</option>)}
          </select>
          <input className={inputClassName()} type="date" value={filters.createdFrom} onChange={(event) => updateFilter('createdFrom', event.target.value)} />
          <input className={inputClassName()} type="date" value={filters.createdTo} onChange={(event) => updateFilter('createdTo', event.target.value)} />
          <Button variant="secondary" type="button" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      <div className="mx-5 mt-4"><Notice tone={notice.tone}>{notice.message}</Notice></div>

      <MobileList>
        {auditLogs.map((log) => (
          <MobileCard key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{labelFromValue(log.action)}</p>
                <p className="mt-1 text-sm text-muted">{actorName(log)}</p>
              </div>
              <StatusPill tone={roleTone(log.metadata?.actorRole ?? log.user?.role)}>
                {roleLabel(log.metadata?.actorRole ?? log.user?.role)}
              </StatusPill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMeta label="Entity">{labelFromValue(log.entityType)} {log.entityId ? `#${log.entityId}` : ''}</MobileMeta>
              <MobileMeta label="When">{formatDate(log.createdAt)}</MobileMeta>
              <MobileMeta label="IP">{log.ipAddress ?? 'Not captured'}</MobileMeta>
              <MobileMeta label="Metadata">{metadataSummary(log.metadata)}</MobileMeta>
            </div>
          </MobileCard>
        ))}
      </MobileList>

      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3">Actor</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity</th>
              <th className="px-5 py-3">Metadata</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-surface/70">
                <td className="px-5 py-3">
                  <p className="font-medium">{actorName(log)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill tone={roleTone(log.metadata?.actorRole ?? log.user?.role)}>
                      {roleLabel(log.metadata?.actorRole ?? log.user?.role)}
                    </StatusPill>
                    <span className="text-xs text-muted">#{log.userId ?? 'deleted'}</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-medium">{labelFromValue(log.action)}</td>
                <td className="px-5 py-3 text-muted">{labelFromValue(log.entityType)} {log.entityId ? `#${log.entityId}` : ''}</td>
                <td className="max-w-sm px-5 py-3 text-muted">
                  <p className="truncate" title={metadataSummary(log.metadata)}>{metadataSummary(log.metadata)}</p>
                </td>
                <td className="px-5 py-3 text-muted">{log.ipAddress ?? 'Not captured'}</td>
                <td className="px-5 py-3 text-muted">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && auditLogs.length === 0 ? (
        <EmptyState title="No audit logs found" description="Activity will appear here after organization members perform write actions." />
      ) : null}

      <div className="flex items-center justify-between border-t border-line bg-panel px-5 py-4 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <ShieldCheck size={16} />
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)} - {pagination.total} total
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</Button>
          <Button variant="secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</Button>
        </div>
      </div>
    </section>
  )
}
