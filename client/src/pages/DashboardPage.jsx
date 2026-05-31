import { AlertCircle, BriefcaseBusiness, CalendarClock, FileText, ReceiptText, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { MobileCard, MobileList, MobileMeta } from '../components/MobileList'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { dashboardApi } from '../services/api'
import { formatDate, formatDateOnly } from '../utils/format'

function money(currency, value) {
  return `${currency ?? 'PH'} ${Number(value ?? 0).toFixed(2)}`
}

function statusTone(status) {
  if (status === 'paid') return 'active'
  if (status === 'overdue' || status === 'cancelled') return 'danger'
  if (status === 'sent' || status === 'viewed') return 'warning'
  return 'default'
}

function methodLabel(method) {
  return method?.replace('_', ' ') ?? 'payment'
}

function Metric({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass = {
    default: 'bg-surface text-muted',
    active: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-danger',
  }[tone]

  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <div className={`grid size-10 place-items-center rounded-md ${toneClass}`}>
          <Icon size={19} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function InvoiceRows({ invoices = [], onNavigate }) {
  if (!invoices.length) return <EmptyState title="No invoices yet" description="Create an invoice to start tracking balances." />

  return (
    <>
      <MobileList>
        {invoices.map((invoice) => (
          <MobileCard key={invoice.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-sm text-muted">{invoice.client?.name ?? 'Unknown client'}</p>
              </div>
              <StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMeta label="Total">{money(invoice.currency, invoice.total)}</MobileMeta>
              <MobileMeta label="Due">{money(invoice.currency, invoice.amountDue)}</MobileMeta>
            </div>
          </MobileCard>
        ))}
      </MobileList>
      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="cursor-pointer hover:bg-surface/70" onClick={() => onNavigate('invoice-detail', { invoiceId: invoice.id })}>
                <td className="px-5 py-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-5 py-3 text-muted">{invoice.client?.name ?? 'Unknown client'}</td>
                <td className="px-5 py-3">{money(invoice.currency, invoice.total)}</td>
                <td className="px-5 py-3">{money(invoice.currency, invoice.amountDue)}</td>
                <td className="px-5 py-3"><StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PaymentRows({ payments = [], onNavigate }) {
  if (!payments.length) return <EmptyState title="No payments recorded" description="Record a payment from an invoice detail page." />

  return (
    <div className="grid gap-2">
      {payments.map((payment) => (
        <button key={payment.id} type="button" onClick={() => onNavigate('payment-detail', { paymentId: payment.id })} className="flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 text-left text-sm hover:bg-surface/70">
          <span>
            <span className="block font-medium text-ink">{money(payment.currency, payment.amount)}</span>
            <span className="text-muted capitalize">{methodLabel(payment.method)} - {payment.invoice?.invoiceNumber ?? `#${payment.invoiceId}`}</span>
          </span>
          <span className="text-muted">{formatDateOnly(payment.paidAt)}</span>
        </button>
      ))}
    </div>
  )
}

function OwnerDashboard({ data, onNavigate }) {
  const summary = data.summary ?? {}
  const plan = data.plan ?? {}
  const team = data.teamSummary ?? {}

  return (
    <div className="grid gap-5 p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={FileText} label="Invoice total" value={money('PH', summary.totalInvoiceAmount)} />
        <Metric icon={ReceiptText} label="Paid" value={money('PH', summary.totalPaidAmount)} tone="active" />
        <Metric icon={AlertCircle} label="Due" value={money('PH', summary.totalDueAmount)} tone="warning" />
        <Metric icon={CalendarClock} label="Recurring active" value={summary.activeRecurringInvoices ?? 0} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Section title="Recent Invoices"><InvoiceRows invoices={data.recentInvoices} onNavigate={onNavigate} /></Section>
        <div className="grid gap-5">
          <Section title="Plan Usage">
            <div className="grid gap-2 rounded-md border border-line bg-panel p-4 text-sm">
              <p><span className="text-muted">Plan:</span> <strong className="capitalize">{plan.organizationPlan ?? 'free'}</strong></p>
              <p><span className="text-muted">Clients:</span> {plan.clientTotals ?? 0}</p>
              <p><span className="text-muted">Products:</span> {plan.productTotals ?? 0}</p>
              <p><span className="text-muted">Invitations:</span> {plan.invitationTotals ?? 0}</p>
            </div>
          </Section>
          <Section title="Team Summary">
            <div className="grid gap-2 rounded-md border border-line bg-panel p-4 text-sm">
              <p><span className="text-muted">Owners:</span> {team.totalOwner ?? 0}</p>
              <p><span className="text-muted">Admins:</span> {team.totalAdmin ?? 0}</p>
              <p><span className="text-muted">Members:</span> {team.totalMember ?? 0}</p>
              <p><span className="text-muted">Pending invitations:</span> {team.pendingInvitations ?? 0}</p>
            </div>
          </Section>
        </div>
      </div>
      <Section title="Recent Payments"><PaymentRows payments={data.recentPayments} onNavigate={onNavigate} /></Section>
    </div>
  )
}

function AdminDashboard({ data, onNavigate }) {
  const invoice = data.invoiceStatus ?? {}

  return (
    <div className="grid gap-5 p-5">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric icon={AlertCircle} label="Amount due" value={money('PH', invoice.amountDueTotals)} tone="warning" />
        <Metric icon={FileText} label="Draft" value={invoice.draftTotals ?? 0} />
        <Metric icon={FileText} label="Sent" value={invoice.sentTotals ?? 0} />
        <Metric icon={ReceiptText} label="Paid" value={invoice.paidTotals ?? 0} tone="active" />
        <Metric icon={AlertCircle} label="Overdue" value={invoice.overDueTotals ?? 0} tone="danger" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Recent Payments"><PaymentRows payments={data.payment?.recentPayments} onNavigate={onNavigate} /></Section>
        <Section title="Upcoming Recurring Invoices">
          <div className="grid gap-2">
            {(data.upcomingRecurringInvoices ?? []).map((template) => (
              <button key={template.id} type="button" onClick={() => onNavigate('recurring-detail', { recurringInvoiceId: template.id })} className="flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 text-left text-sm hover:bg-surface/70">
                <span><span className="block font-medium text-ink">{template.client?.name ?? 'Unknown client'}</span><span className="text-muted capitalize">{template.interval}</span></span>
                <span className="text-muted">{formatDateOnly(template.nextIssueDate)}</span>
              </button>
            ))}
            {(data.upcomingRecurringInvoices ?? []).length === 0 ? <EmptyState title="No upcoming schedules" description="Active recurring invoices will appear here." /> : null}
          </div>
        </Section>
      </div>
      <Section title="Recent Clients">
        <div className="grid gap-2">
          {(data.client?.recentClients ?? []).map((client) => (
            <div key={`${client.email}-${client.name}`} className="border-b border-line bg-panel px-4 py-3 text-sm">
              <p className="font-medium text-ink">{client.name}</p>
              <p className="text-muted">{client.email || client.company || 'No contact details'}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function MemberDashboard({ data, onNavigate }) {
  const invoice = data.invoice ?? {}

  return (
    <div className="grid gap-5 p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={BriefcaseBusiness} label="Clients" value={data.client?.clientTotals?.count ?? 0} />
        <Metric icon={FileText} label="Invoices" value={invoice.totalInvoices ?? 0} />
        <Metric icon={AlertCircle} label="Unpaid due" value={money('PH', invoice.unpaidInvoiceAmount)} tone="warning" />
      </div>
      <Section title="Recent Invoices"><InvoiceRows invoices={invoice.recentInvoices} onNavigate={onNavigate} /></Section>
      <Section title="Recent Payments"><PaymentRows payments={data.recentPayments} onNavigate={onNavigate} /></Section>
    </div>
  )
}

export function DashboardPage({ user, onNavigate }) {
  const [data, setData] = useState(null)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const response = await dashboardApi.get(user?.role)
      setData(response.ownerDashboardData ?? response.adminDashboardData ?? response.memberDashboardData ?? null)
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  const title = useMemo(() => {
    if (user?.role === 'owner') return 'Owner Dashboard'
    if (user?.role === 'admin') return 'Admin Dashboard'
    if (user?.role === 'member') return 'Member Dashboard'
    return 'Dashboard'
  }, [user?.role])

  return (
    <section>
      <PageHeader
        title={title}
        description="A quick view of billing activity for your workspace."
        action={<Button variant="secondary" onClick={loadDashboard}><RefreshCw size={16} />Refresh</Button>}
      />
      <div className="px-5 pt-5"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      {loading ? <p className="p-5 text-sm text-muted">Loading dashboard...</p> : null}
      {!loading && !data ? <EmptyState title="No dashboard available" description="This role does not have a dashboard yet." /> : null}
      {!loading && data && user?.role === 'owner' ? <OwnerDashboard data={data} onNavigate={onNavigate} /> : null}
      {!loading && data && user?.role === 'admin' ? <AdminDashboard data={data} onNavigate={onNavigate} /> : null}
      {!loading && data && user?.role === 'member' ? <MemberDashboard data={data} onNavigate={onNavigate} /> : null}
    </section>
  )
}
