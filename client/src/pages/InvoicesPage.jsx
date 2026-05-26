import { ArrowLeft, Edit3, Eye, FileDown, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { Modal } from '../components/Modal'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { clientApi, invoiceApi, productApi } from '../services/api'
import { formatDate } from '../utils/format'

const currencies = ['PH', 'USD', 'EUR', 'CAD', 'AUD']
const statuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']

const emptyInvoice = {
  clientId: '',
  invoiceNumber: '',
  status: 'draft',
  currency: 'PH',
  issueDate: '',
  dueDate: '',
  amountPaid: '',
  notes: '',
  internalNotes: '',
  footer: '',
  items: [{ productId: '', description: '', quantity: '1', unitPrice: '', taxRate: '0', discount: '0' }],
}

function cleanPayload(form) {
  const payload = Object.fromEntries(
    Object.entries(form)
      .filter(([key]) => key !== 'items')
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  )

  return {
    ...payload,
    clientId: Number(form.clientId),
    items: form.items.map((item) => ({
      ...Object.fromEntries(
        Object.entries(item)
          .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
          .filter(([, value]) => value !== ''),
      ),
      productId: item.productId ? Number(item.productId) : null,
    })),
  }
}

function invoiceToForm(invoice) {
  return {
    ...emptyInvoice,
    clientId: invoice.client?.id ? String(invoice.client.id) : '',
    invoiceNumber: invoice.invoiceNumber ?? '',
    status: invoice.status ?? 'draft',
    currency: invoice.currency ?? 'PH',
    issueDate: invoice.issueDate ? invoice.issueDate.slice(0, 10) : '',
    dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : '',
    amountPaid: invoice.amountPaid ?? '',
    notes: invoice.notes ?? '',
    internalNotes: invoice.internalNotes ?? '',
    footer: invoice.footer ?? '',
    items: invoice.items?.length ? invoice.items.map((item) => ({
      productId: item.productId ? String(item.productId) : '',
      description: item.description ?? '',
      quantity: item.quantity ?? '1',
      unitPrice: item.unitPrice ?? '',
      taxRate: item.taxRate ?? '0',
      discount: item.discount ?? '0',
    })) : emptyInvoice.items,
  }
}

function statusTone(status) {
  if (status === 'paid') return 'active'
  if (status === 'overdue' || status === 'cancelled') return 'danger'
  if (status === 'sent' || status === 'viewed') return 'warning'
  return 'neutral'
}

function money(currency, value) {
  return `${currency ?? 'PH'} ${Number(value ?? 0).toFixed(2)}`
}

export function InvoicesPage({ onNavigate }) {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', currency: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)
  const [modal, setModal] = useState({ open: false })
  const [loading, setLoading] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await invoiceApi.list(params)
      setInvoices(data.invoices ?? [])
      setPagination(data.pagination ?? { page: filters.page, limit: filters.limit, totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.currency, filters.sortOrder])

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return
    try {
      await invoiceApi.delete(invoiceToDelete.id)
      setInvoiceToDelete(null)
      setModal({ open: true, title: 'Invoice deleted', message: 'The invoice was removed successfully.', confirmText: 'Done', onConfirm: () => setModal({ open: false }) })
      await loadInvoices()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
      setInvoiceToDelete(null)
    }
  }

  return (
    <section>
      <Modal open={modal.open} title={modal.title} message={modal.message} confirmText={modal.confirmText} onConfirm={modal.onConfirm} onClose={modal.onConfirm} />
      <Modal open={Boolean(invoiceToDelete)} tone="danger" title="Delete invoice?" message={invoiceToDelete ? `${invoiceToDelete.invoiceNumber} will be permanently removed.` : ''} confirmText="Delete" cancelText="Cancel" onConfirm={confirmDeleteInvoice} onCancel={() => setInvoiceToDelete(null)} />
      <PageHeader
        title="Invoices"
        description="Track invoices, balances, clients, and payment status."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadInvoices}><RefreshCw size={16} />Refresh</Button>
            <Button onClick={() => onNavigate('invoice-new')}><Plus size={16} />New invoice</Button>
          </div>
        )}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_140px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input className={inputClassName('w-full pl-10')} placeholder="Search invoice number" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} onKeyDown={(event) => { if (event.key === 'Enter') loadInvoices() }} />
          </div>
          <select className={inputClassName()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
            <option value="">Status</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className={inputClassName()} value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value, page: 1 })}>
            <option value="">Currency</option>
            {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
          <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value, page: 1 })}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadInvoices}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      <div className="overflow-x-auto bg-panel">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Invoice</th>
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Dates</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Due</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-surface/70">
                <td className="px-5 py-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-5 py-3"><p className="font-medium">{invoice.client?.name ?? 'Unknown'}</p><p className="text-muted">{invoice.client?.email ?? ''}</p></td>
                <td className="px-5 py-3 text-muted">{formatDate(invoice.issueDate)}<br />Due {formatDate(invoice.dueDate)}</td>
                <td className="px-5 py-3 font-medium">{money(invoice.currency, invoice.total)}</td>
                <td className="px-5 py-3">{money(invoice.currency, invoice.amountDue)}</td>
                <td className="px-5 py-3"><StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill></td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" className="mr-1 w-10 px-0" title="View invoice" aria-label="View invoice" onClick={() => onNavigate('invoice-detail', { invoiceId: invoice.id })}><Eye size={17} /></Button>
                  <Button variant="ghost" className="mr-1 w-10 px-0" title="Edit invoice" aria-label="Edit invoice" onClick={() => onNavigate('invoice-edit', { invoiceId: invoice.id })}><Edit3 size={17} /></Button>
                  <Button variant="ghost" className="w-10 px-0 text-danger" title="Delete invoice" aria-label="Delete invoice" onClick={() => setInvoiceToDelete(invoice)}><Trash2 size={17} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && invoices.length === 0 ? <EmptyState title="No invoices found" description="Create an invoice or adjust the filters." /> : null}
      <div className="flex items-center justify-between border-t border-line bg-panel px-5 py-4 text-sm">
        <div className="flex items-center gap-2 text-muted"><StatusPill>{pagination.total} total</StatusPill><span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span></div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</Button>
          <Button variant="secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</Button>
        </div>
      </div>
    </section>
  )
}

export function InvoiceFormPage({ invoiceId, onNavigate }) {
  const isEditing = Boolean(invoiceId)
  const [form, setForm] = useState(emptyInvoice)
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [clientsData, productsData, invoiceData] = await Promise.all([
          clientApi.list({ limit: 10 }),
          productApi.list({ limit: 10 }),
          isEditing ? invoiceApi.get(invoiceId) : Promise.resolve(null),
        ])
        setClients(clientsData.clients ?? [])
        setProducts(productsData.products ?? [])
        if (invoiceData?.invoice) setForm(invoiceToForm(invoiceData.invoice))
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [invoiceId, isEditing])

  const setItem = (index, changes) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
    }))
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', description: '', quantity: '1', unitPrice: '', taxRate: '0', discount: '0' }] })
  const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })

  const selectProduct = (index, productId) => {
    const product = products.find((item) => String(item.id) === productId)
    setItem(index, {
      productId,
      description: product?.description || product?.name || '',
      unitPrice: product?.unitPrice ?? '',
      taxRate: product?.taxRate ?? '0',
    })
  }

  const previewTotal = useMemo(() => form.items.reduce((sum, item) => {
    const base = Number(item.quantity || 0) * Number(item.unitPrice || 0)
    const discount = base * (Number(item.discount || 0) / 100)
    const taxable = base - discount
    const tax = taxable * (Number(item.taxRate || 0) / 100)
    return sum + taxable + tax
  }, 0), [form.items])

  const submitInvoice = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const payload = cleanPayload(form)
      if (isEditing) await invoiceApi.update(invoiceId, payload)
      else await invoiceApi.create(payload)
      setSuccessModal({ open: true, title: isEditing ? 'Invoice updated' : 'Invoice created', message: 'The invoice was saved successfully.' })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Modal open={successModal.open} title={successModal.title} message={successModal.message} confirmText="Back to invoices" onConfirm={() => onNavigate('invoices')} onClose={() => onNavigate('invoices')} />
      <PageHeader title={isEditing ? 'Edit Invoice' : 'Create Invoice'} description="Choose a client, add line items, and let the server calculate totals." action={<Button variant="secondary" onClick={() => onNavigate('invoices')}><ArrowLeft size={16} />Back</Button>} />
      <form onSubmit={submitInvoice} className="grid max-w-5xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Client">
            <select className={inputClassName()} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required disabled={loading}>
              <option value="">Select client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </Field>
          <Field label="Invoice number"><input className={inputClassName()} value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} disabled={loading} /></Field>
          <Field label="Status">
            <select className={inputClassName()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} disabled={loading}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select className={inputClassName()} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} disabled={loading}>
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </Field>
          <Field label="Issue date"><input className={inputClassName()} type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} required disabled={loading} /></Field>
          <Field label="Due date"><input className={inputClassName()} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required disabled={loading} /></Field>
          <Field label="Amount paid"><input className={inputClassName()} type="number" min="0" step="0.01" value={form.amountPaid} onChange={(event) => setForm({ ...form, amountPaid: event.target.value })} disabled={loading} /></Field>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Line items</h2>
            <Button type="button" variant="secondary" onClick={addItem}><Plus size={16} />Add item</Button>
          </div>
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-3 border-t border-line pt-4 md:grid-cols-[1.2fr_1.4fr_90px_120px_90px_90px_44px]">
              <select className={inputClassName()} value={item.productId} onChange={(event) => selectProduct(index, event.target.value)} disabled={loading}>
                <option value="">Manual item</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <input className={inputClassName()} placeholder="Description" value={item.description} onChange={(event) => setItem(index, { description: event.target.value })} required disabled={loading} />
              <input className={inputClassName()} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setItem(index, { quantity: event.target.value })} required disabled={loading} />
              <input className={inputClassName()} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItem(index, { unitPrice: event.target.value })} required disabled={loading} />
              <input className={inputClassName()} type="number" min="0" step="0.01" value={item.taxRate} onChange={(event) => setItem(index, { taxRate: event.target.value })} disabled={loading} />
              <input className={inputClassName()} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => setItem(index, { discount: event.target.value })} disabled={loading} />
              <Button type="button" variant="ghost" className="w-10 px-0 text-danger" onClick={() => removeItem(index)} disabled={form.items.length === 1}><Trash2 size={17} /></Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Notes"><textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={loading} /></Field>
          <Field label="Internal notes"><textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.internalNotes} onChange={(event) => setForm({ ...form, internalNotes: event.target.value })} disabled={loading} /></Field>
        </div>
        <Field label="Footer"><input className={inputClassName()} value={form.footer} onChange={(event) => setForm({ ...form, footer: event.target.value })} disabled={loading} /></Field>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-sm font-semibold">Preview total: {money(form.currency, previewTotal)}</p>
          <Button type="submit" disabled={saving || loading}><Plus size={17} />{saving ? 'Saving...' : isEditing ? 'Save invoice' : 'Create invoice'}</Button>
        </div>
      </form>
    </section>
  )
}

export function InvoiceDetailPage({ invoiceId, onNavigate }) {
  const [invoice, setInvoice] = useState(null)
  const [exportData, setExportData] = useState(null)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true)
      try {
        const data = await invoiceApi.get(invoiceId)
        setInvoice(data.invoice)
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    loadInvoice()
  }, [invoiceId])

  const loadExport = async () => {
    setNotice({ tone: 'error', message: '' })
    try {
      const data = await invoiceApi.export(invoiceId)
      setExportData(data.invoice)
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    }
  }

  return (
    <section>
      <Modal open={Boolean(exportData)} title="Export data" message={exportData ? JSON.stringify(exportData, null, 2) : ''} confirmText="Close" onConfirm={() => setExportData(null)} onClose={() => setExportData(null)} />
      <PageHeader title={invoice?.invoiceNumber ?? 'Invoice'} description="Invoice detail with client and line items." action={<div className="flex gap-2"><Button variant="secondary" onClick={() => onNavigate('invoices')}><ArrowLeft size={16} />Back</Button><Button variant="secondary" onClick={() => onNavigate('invoice-edit', { invoiceId })}><Edit3 size={16} />Edit</Button><Button onClick={loadExport}><FileDown size={16} />Export</Button></div>} />
      <div className="p-5"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      {!loading && invoice ? (
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs text-muted">Client</p><p className="font-semibold">{invoice.client?.name}</p><p className="text-sm text-muted">{invoice.client?.email}</p></div>
            <div><p className="text-xs text-muted">Issue</p><p className="font-semibold">{formatDate(invoice.issueDate)}</p></div>
            <div><p className="text-xs text-muted">Due</p><p className="font-semibold">{formatDate(invoice.dueDate)}</p></div>
            <div><p className="text-xs text-muted">Status</p><StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill></div>
          </div>
          <div className="overflow-x-auto bg-panel">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase text-muted"><tr><th className="px-5 py-3">Description</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Unit</th><th className="px-5 py-3">Tax</th><th className="px-5 py-3">Discount</th><th className="px-5 py-3">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {invoice.items?.map((item) => <tr key={item.id}><td className="px-5 py-3 font-medium">{item.description}</td><td className="px-5 py-3">{item.quantity}</td><td className="px-5 py-3">{money(invoice.currency, item.unitPrice)}</td><td className="px-5 py-3">{item.taxRate}%</td><td className="px-5 py-3">{item.discount}%</td><td className="px-5 py-3 font-medium">{money(invoice.currency, item.total)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid justify-end gap-2 text-sm">
            <p>Total: <strong>{money(invoice.currency, invoice.total)}</strong></p>
            <p>Paid: <strong>{money(invoice.currency, invoice.amountPaid)}</strong></p>
            <p>Due: <strong>{money(invoice.currency, invoice.amountDue)}</strong></p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
