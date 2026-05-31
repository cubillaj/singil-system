import { ArrowLeft, Edit3, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { MobileCard, MobileList, MobileMeta } from '../components/MobileList'
import { Modal } from '../components/Modal'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { useDebounce } from '../hooks/useDebounce'
import { paymentApi } from '../services/api'
import { formatDate } from '../utils/format'

const emptyPayment = {
  amount: '',
  method: 'bank_transfer',
  reference: '',
  note: '',
  paidAt: '',
}

const paymentMethods = [
  ['bank_transfer', 'Bank transfer'],
  ['gcash', 'GCash'],
  ['maya', 'Maya'],
  ['other', 'Other'],
]

function money(currency, value) {
  return `${currency ?? 'PH'} ${Number(value ?? 0).toFixed(2)}`
}

function methodLabel(method) {
  return paymentMethods.find(([value]) => value === method)?.[1] ?? method?.replace('_', ' ')
}

function paymentToForm(payment) {
  return {
    amount: payment?.amount ?? '',
    method: payment?.method ?? 'bank_transfer',
    reference: payment?.reference ?? '',
    note: payment?.note ?? '',
    paidAt: payment?.paidAt ? payment.paidAt.slice(0, 10) : '',
  }
}

function cleanPaymentPayload(form) {
  return Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  )
}

export function PaymentsPage({ onNavigate }) {
  const [payments, setPayments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(filters.search)

  const loadPayments = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await paymentApi.list(params)
      setPayments(data.payments ?? [])
      setPagination(data.pagination ?? { page: filters.page, limit: filters.limit, totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.sortOrder, debouncedSearch])

  return (
    <section>
      <PageHeader
        title="Payments"
        description="Review recorded invoice payments and balances."
        action={<Button variant="secondary" onClick={loadPayments}><RefreshCw size={16} />Refresh</Button>}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_140px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input className={inputClassName('w-full pl-10')} placeholder="Search reference, note, or invoice" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} onKeyDown={(event) => { if (event.key === 'Enter') loadPayments() }} />
          </div>
          <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value, page: 1 })}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadPayments}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4"><Notice tone={notice.tone}>{notice.message}</Notice></div>

      <MobileList>
        {payments.map((payment) => (
          <MobileCard key={payment.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{money(payment.currency, payment.amount)}</p>
                <p className="mt-1 text-sm text-muted">{methodLabel(payment.method)}</p>
              </div>
              <Button variant="ghost" className="w-9 px-0" title="Edit payment" aria-label="Edit payment" onClick={() => onNavigate('payment-detail', { paymentId: payment.id })}><Pencil size={16} /></Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMeta label="Reference">{payment.reference || 'Not set'}</MobileMeta>
              <MobileMeta label="Paid">{formatDate(payment.paidAt)}</MobileMeta>
            </div>
          </MobileCard>
        ))}
      </MobileList>

      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Paid at</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-surface/70">
                <td className="px-5 py-3 font-medium">{money(payment.currency, payment.amount)}</td>
                <td className="px-5 py-3">{methodLabel(payment.method)}</td>
                <td className="px-5 py-3 text-muted">{payment.reference || 'Not set'}</td>
                <td className="px-5 py-3 text-muted">{formatDate(payment.paidAt)}</td>
                <td className="px-5 py-3 text-right"><Button variant="ghost" className="w-10 px-0" title="Edit payment" aria-label="Edit payment" onClick={() => onNavigate('payment-detail', { paymentId: payment.id })}><Pencil size={17} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && payments.length === 0 ? <EmptyState title="No payments found" description="Record a payment from an invoice or adjust the filters." /> : null}
      <div className="flex items-center justify-between border-t border-line bg-panel px-5 py-4 text-sm">
        <div className="text-muted">Page {pagination.page} of {Math.max(pagination.totalPages, 1)} - {pagination.total} total</div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</Button>
          <Button variant="secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</Button>
        </div>
      </div>
    </section>
  )
}

export function PaymentDetailPage({ paymentId, onNavigate }) {
  const [payment, setPayment] = useState(null)
  const [form, setForm] = useState(emptyPayment)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)
  const [successModal, setSuccessModal] = useState({ open: false })

  const loadPayment = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const data = await paymentApi.get(paymentId)
      setPayment(data.payment)
      setForm(paymentToForm(data.payment))
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId])

  const submitPayment = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const data = await paymentApi.update(paymentId, cleanPaymentPayload(form))
      setPayment(data.payment)
      setForm(paymentToForm(data.payment))
      setSuccessModal({ open: true })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await paymentApi.delete(paymentId)
      onNavigate('payments')
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
      setPaymentToDelete(null)
    }
  }

  return (
    <section>
      <Modal open={Boolean(paymentToDelete)} tone="danger" title="Delete payment?" message="This payment record will be removed." confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setPaymentToDelete(null)} />
      <Modal open={successModal.open} title="Payment updated" message="The payment and invoice balance were updated successfully." confirmText="Back to payments" onConfirm={() => onNavigate('payments')} onClose={() => onNavigate('payments')} />
      <PageHeader
        title={payment ? money(payment.currency, payment.amount) : 'Payment'}
        description="Edit a recorded payment and review the related invoice balance."
        action={<div className="flex gap-2"><Button variant="secondary" onClick={() => onNavigate('payments')}><ArrowLeft size={16} />Back</Button><Button variant="ghost" className="text-danger" onClick={() => setPaymentToDelete(payment)}><Trash2 size={16} />Delete</Button></div>}
      />
      <div className="p-5"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      {!loading && payment ? (
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs text-muted">Invoice</p><p className="font-semibold">{payment.invoice?.invoiceNumber ?? `#${payment.invoiceId}`}</p></div>
            <div><p className="text-xs text-muted">Client</p><p className="font-semibold">{payment.invoice?.client?.name ?? 'Unknown'}</p><p className="text-sm text-muted">{payment.invoice?.client?.email ?? ''}</p></div>
            <div><p className="text-xs text-muted">Invoice paid</p><p className="font-semibold">{money(payment.currency, payment.invoice?.amountPaid)}</p></div>
            <div><p className="text-xs text-muted">Invoice due</p><p className="font-semibold">{money(payment.currency, payment.invoice?.amountDue)}</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs text-muted">Invoice total</p><p className="font-semibold">{money(payment.currency, payment.invoice?.total)}</p></div>
            <div><p className="text-xs text-muted">Invoice status</p><p className="font-semibold capitalize">{payment.invoice?.status ?? 'Unknown'}</p></div>
            <div><p className="text-xs text-muted">Payment method</p><p className="font-semibold">{methodLabel(payment.method)}</p></div>
            <div><p className="text-xs text-muted">Recorded</p><p className="font-semibold">{formatDate(payment.createdAt)}</p></div>
          </div>

          <form onSubmit={submitPayment} className="grid max-w-3xl gap-4 border-t border-line pt-5 md:grid-cols-2">
            <Field label="Amount"><input className={inputClassName()} type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field>
            <Field label="Method">
              <select className={inputClassName()} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
                {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Reference"><input className={inputClassName()} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></Field>
            <Field label="Paid at"><input className={inputClassName()} type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} /></Field>
            <Field label="Note"><textarea className={inputClassName('min-h-24 resize-y py-2 md:col-span-2')} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
            <div className="md:col-span-2"><Button type="submit" disabled={saving}><Edit3 size={16} />{saving ? 'Saving...' : 'Save payment'}</Button></div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
