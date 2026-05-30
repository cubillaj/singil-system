import { ArrowLeft, CalendarClock, Edit3, Eye, Plus, RefreshCw, Search, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field, inputClassName } from '../components/Form'
import { Modal } from '../components/Modal'
import { MobileCard, MobileList, MobileMeta } from '../components/MobileList'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useDebounce } from '../hooks/useDebounce'
import { clientApi, productApi, recurringInvoiceApi } from '../services/api'
import { formatDate, formatDateOnly } from '../utils/format'

const currencies = ['PH', 'USD', 'EUR', 'CAD', 'AUD']
const intervals = ['weekly', 'monthly', 'quarterly', 'yearly']

const emptyItem = {
  productId: '',
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '0',
  discount: '0',
}

const emptyRecurringInvoice = {
  clientId: '',
  interval: 'monthly',
  nextIssueDate: '',
  endDate: '',
  autoSend: false,
  isActive: true,
  currency: 'PH',
  notes: '',
  footer: '',
  dueDaysAfterIssue: '30',
  items: [emptyItem],
}

function money(currency, value) {
  return `${currency ?? 'PH'} ${Number(value ?? 0).toFixed(2)}`
}

function lineItemTotal(item) {
  const base = Number(item.quantity || 0) * Number(item.unitPrice || 0)
  const discount = base * (Number(item.discount || 0) / 100)
  const taxable = base - discount
  const tax = taxable * (Number(item.taxRate || 0) / 100)
  return taxable + tax
}

function intervalLabel(interval) {
  return interval?.replace('_', ' ') ?? 'monthly'
}

function statusTone(template) {
  if (!template?.isActive) return 'danger'
  if (template?.autoSend) return 'active'
  return 'warning'
}

function productLabel(productsById, productId) {
  if (!productId) return ''
  const product = productsById[String(productId)]
  return product?.name ?? `Product #${productId}`
}

function cleanPayload(form, { keepEmpty = false } = {}) {
  const payload = Object.fromEntries(
    Object.entries(form)
      .filter(([key]) => key !== 'items')
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => keepEmpty || value !== ''),
  )

  return {
    ...payload,
    clientId: Number(form.clientId),
    dueDaysAfterIssue: Number(form.dueDaysAfterIssue),
    items: form.items.map((item) => ({
      ...Object.fromEntries(
        Object.entries(item)
          .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
          .filter(([, value]) => keepEmpty || value !== ''),
      ),
      productId: item.productId ? Number(item.productId) : null,
    })),
  }
}

function recurringToForm(template) {
  return {
    ...emptyRecurringInvoice,
    clientId: template.client?.id ? String(template.client.id) : String(template.clientId ?? ''),
    interval: template.interval ?? 'monthly',
    nextIssueDate: template.nextIssueDate ? template.nextIssueDate.slice(0, 10) : '',
    endDate: template.endDate ? template.endDate.slice(0, 10) : '',
    autoSend: Boolean(template.autoSend),
    isActive: Boolean(template.isActive),
    currency: template.currency ?? 'PH',
    notes: template.notes ?? '',
    footer: template.footer ?? '',
    dueDaysAfterIssue: String(template.dueDaysAfterIssue ?? 30),
    items: template.items?.length ? template.items.map((item) => ({
      productId: item.productId ? String(item.productId) : '',
      description: item.description ?? '',
      quantity: item.quantity ?? '1',
      unitPrice: item.unitPrice ?? '',
      taxRate: item.taxRate ?? '0',
      discount: item.discount ?? '0',
    })) : [emptyItem],
  }
}

function TemplateStatus({ template }) {
  return (
    <StatusPill tone={statusTone(template)}>
      {!template.isActive ? 'inactive' : template.autoSend ? 'auto-send' : 'manual'}
    </StatusPill>
  )
}

export function RecurringInvoicesPage({ user, onNavigate }) {
  const canManage = ['admin', 'owner'].includes(user?.role)
  const [templates, setTemplates] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', interval: '', isActive: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [templateToDelete, setTemplateToDelete] = useState(null)
  const [modal, setModal] = useState({ open: false })
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(filters.search)

  const loadTemplates = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await recurringInvoiceApi.list(params)
      setTemplates(data.recurringInvoices ?? [])
      setPagination(data.pagination ?? { page: filters.page, limit: filters.limit, totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.interval, filters.isActive, filters.sortOrder, debouncedSearch])

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return
    try {
      await recurringInvoiceApi.delete(templateToDelete.id)
      setTemplateToDelete(null)
      setModal({ open: true, title: 'Recurring invoice deleted', message: 'The recurring invoice was removed successfully.', confirmText: 'Done', onConfirm: () => setModal({ open: false }) })
      await loadTemplates()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
      setTemplateToDelete(null)
    }
  }

  const generateInvoice = async (template) => {
    setNotice({ tone: 'error', message: '' })
    try {
      await recurringInvoiceApi.generate(template.id)
      setModal({ open: true, title: 'Invoice generated', message: 'A new invoice was created from this recurring schedule.', confirmText: 'Done', onConfirm: () => setModal({ open: false }) })
      await loadTemplates()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    }
  }

  return (
    <section>
      <Modal open={modal.open} title={modal.title} message={modal.message} confirmText={modal.confirmText} onConfirm={modal.onConfirm} onClose={modal.onConfirm} />
      <Modal open={Boolean(templateToDelete)} tone="danger" title="Delete recurring invoice?" message={templateToDelete ? `The schedule for ${templateToDelete.client?.name ?? 'this client'} will be permanently removed.` : ''} confirmText="Delete" cancelText="Cancel" onConfirm={confirmDeleteTemplate} onCancel={() => setTemplateToDelete(null)} />
      <PageHeader
        title="Recurring Invoices"
        description="Create invoice schedules for clients who are billed on a repeating cycle."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadTemplates}><RefreshCw size={16} />Refresh</Button>
            {canManage ? <Button onClick={() => onNavigate('recurring-new')}><Plus size={16} />New schedule</Button> : null}
          </div>
        )}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_140px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input className={inputClassName('w-full pl-10')} placeholder="Search notes or footer" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} onKeyDown={(event) => { if (event.key === 'Enter') loadTemplates() }} />
          </div>
          <select className={inputClassName()} value={filters.interval} onChange={(event) => setFilters({ ...filters, interval: event.target.value, page: 1 })}>
            <option value="">Interval</option>
            {intervals.map((interval) => <option key={interval} value={interval}>{intervalLabel(interval)}</option>)}
          </select>
          <select className={inputClassName()} value={filters.isActive} onChange={(event) => setFilters({ ...filters, isActive: event.target.value, page: 1 })}>
            <option value="">Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value, page: 1 })}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadTemplates}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      <MobileList>
        {templates.map((template) => (
          <MobileCard key={template.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{template.client?.name ?? 'Unknown client'}</p>
                <p className="mt-1 text-sm capitalize text-muted">{intervalLabel(template.interval)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" className="w-9 px-0" title="View schedule" aria-label="View schedule" onClick={() => onNavigate('recurring-detail', { recurringInvoiceId: template.id })}><Eye size={16} /></Button>
                {canManage ? <Button variant="ghost" className="w-9 px-0" title="Edit schedule" aria-label="Edit schedule" onClick={() => onNavigate('recurring-edit', { recurringInvoiceId: template.id })}><Edit3 size={16} /></Button> : null}
                {canManage ? <Button variant="ghost" className="w-9 px-0" title="Generate invoice" aria-label="Generate invoice" onClick={() => generateInvoice(template)}><Wand2 size={16} /></Button> : null}
                {canManage ? <Button variant="ghost" className="w-9 px-0 text-danger" title="Delete schedule" aria-label="Delete schedule" onClick={() => setTemplateToDelete(template)}><Trash2 size={16} /></Button> : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMeta label="Next issue">{formatDateOnly(template.nextIssueDate)}</MobileMeta>
              <MobileMeta label="End date">{formatDateOnly(template.endDate)}</MobileMeta>
              <MobileMeta label="Due after">{template.dueDaysAfterIssue} days</MobileMeta>
              <MobileMeta label="Status"><TemplateStatus template={template} /></MobileMeta>
            </div>
          </MobileCard>
        ))}
      </MobileList>

      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Interval</th>
              <th className="px-5 py-3 font-semibold">Next issue</th>
              <th className="px-5 py-3 font-semibold">End date</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-surface/70">
                <td className="px-5 py-3"><p className="font-medium">{template.client?.name ?? 'Unknown'}</p><p className="text-muted">{template.client?.email ?? ''}</p></td>
                <td className="px-5 py-3 capitalize">{intervalLabel(template.interval)}</td>
                <td className="px-5 py-3">{formatDateOnly(template.nextIssueDate)}</td>
                <td className="px-5 py-3">{formatDateOnly(template.endDate)}</td>
                <td className="px-5 py-3"><TemplateStatus template={template} /></td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" className="mr-1 w-10 px-0" title="View schedule" aria-label="View schedule" onClick={() => onNavigate('recurring-detail', { recurringInvoiceId: template.id })}><Eye size={17} /></Button>
                  {canManage ? <Button variant="ghost" className="mr-1 w-10 px-0" title="Edit schedule" aria-label="Edit schedule" onClick={() => onNavigate('recurring-edit', { recurringInvoiceId: template.id })}><Edit3 size={17} /></Button> : null}
                  {canManage ? <Button variant="ghost" className="mr-1 w-10 px-0" title="Generate invoice" aria-label="Generate invoice" onClick={() => generateInvoice(template)}><Wand2 size={17} /></Button> : null}
                  {canManage ? <Button variant="ghost" className="w-10 px-0 text-danger" title="Delete schedule" aria-label="Delete schedule" onClick={() => setTemplateToDelete(template)}><Trash2 size={17} /></Button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && templates.length === 0 ? <EmptyState title="No recurring invoices found" description="Create a schedule or adjust the filters." /> : null}
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

export function RecurringInvoiceFormPage({ recurringInvoiceId, onNavigate }) {
  const isEditing = Boolean(recurringInvoiceId)
  const [form, setForm] = useState(emptyRecurringInvoice)
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [productsById, setProductsById] = useState({})
  const [productPicker, setProductPicker] = useState({ index: null, query: '', results: [] })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [clientsData, productsData, recurringData] = await Promise.all([
          clientApi.list({ limit: 10 }),
          productApi.list({ limit: 10 }),
          isEditing ? recurringInvoiceApi.get(recurringInvoiceId) : Promise.resolve(null),
        ])
        setClients(clientsData.clients ?? [])
        setProducts(productsData.products ?? [])
        setProductsById(Object.fromEntries((productsData.products ?? []).map((product) => [String(product.id), product])))
        if (recurringData?.recurringInvoice) setForm(recurringToForm(recurringData.recurringInvoice))
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [recurringInvoiceId, isEditing])

  useEffect(() => {
    if (productPicker.index === null) return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const query = productPicker.query.trim()

      if (!query) {
        setProductPicker((current) => current.index === null ? current : { ...current, results: products })
        return
      }

      try {
        const data = await productApi.list({ search: query, limit: 10 })
        if (!cancelled) {
          setProductsById((current) => ({
            ...current,
            ...Object.fromEntries((data.products ?? []).map((product) => [String(product.id), product])),
          }))
          setProductPicker((current) => current.index === null ? current : { ...current, results: data.products ?? [] })
        }
      } catch (err) {
        if (!cancelled) setNotice({ tone: 'error', message: err.message })
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [productPicker.index, productPicker.query, products])

  const setItem = (index, changes) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
    }))
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] })
  const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })

  const selectProduct = (index, product) => {
    if (!product) {
      setItem(index, { productId: '', description: '', unitPrice: '', taxRate: '0' })
      setProductPicker({ index: null, query: '', results: [] })
      return
    }

    setItem(index, {
      productId: String(product.id),
      description: product.description || product.name || '',
      unitPrice: product.unitPrice ?? '',
      taxRate: product.taxRate ?? '0',
    })
    setProductsById((current) => ({ ...current, [String(product.id)]: product }))
    setProductPicker({ index: null, query: '', results: [] })
  }

  const openProductPicker = (index) => {
    setProductPicker({
      index,
      query: productLabel(productsById, form.items[index]?.productId),
      results: products,
    })
  }

  const previewTotal = useMemo(() => form.items.reduce((sum, item) => {
    const base = Number(item.quantity || 0) * Number(item.unitPrice || 0)
    const discount = base * (Number(item.discount || 0) / 100)
    const taxable = base - discount
    const tax = taxable * (Number(item.taxRate || 0) / 100)
    return sum + taxable + tax
  }, 0), [form.items])

  const submitRecurringInvoice = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const payload = cleanPayload(form, { keepEmpty: isEditing })
      if (isEditing) await recurringInvoiceApi.update(recurringInvoiceId, payload)
      else await recurringInvoiceApi.create(payload)
      setSuccessModal({ open: true, title: isEditing ? 'Recurring invoice updated' : 'Recurring invoice created', message: 'The schedule was saved successfully.' })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Modal open={successModal.open} title={successModal.title} message={successModal.message} confirmText="Back to recurring invoices" onConfirm={() => onNavigate('recurring')} onClose={() => onNavigate('recurring')} />
      <PageHeader title={isEditing ? 'Edit Recurring Invoice' : 'Create Recurring Invoice'} description="Set the client, billing cycle, next issue date, and reusable line items." action={<Button variant="secondary" onClick={() => onNavigate('recurring')}><ArrowLeft size={16} />Back</Button>} />
      <form onSubmit={submitRecurringInvoice} className="grid max-w-5xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Client">
            <select className={inputClassName()} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required disabled={loading}>
              <option value="">Select client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </Field>
          <Field label="Interval">
            <select className={inputClassName()} value={form.interval} onChange={(event) => setForm({ ...form, interval: event.target.value })} disabled={loading}>
              {intervals.map((interval) => <option key={interval} value={interval}>{intervalLabel(interval)}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select className={inputClassName()} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} disabled={loading}>
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </Field>
          <Field label="Next issue date"><input className={inputClassName()} type="date" value={form.nextIssueDate} onChange={(event) => setForm({ ...form, nextIssueDate: event.target.value })} required disabled={loading} /></Field>
          <Field label="End date"><input className={inputClassName()} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} disabled={loading} /></Field>
          <Field label="Due days after issue"><input className={inputClassName()} type="number" min="1" max="365" value={form.dueDaysAfterIssue} onChange={(event) => setForm({ ...form, dueDaysAfterIssue: event.target.value })} required disabled={loading} /></Field>
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={form.autoSend} onChange={(event) => setForm({ ...form, autoSend: event.target.checked })} disabled={loading} />
            Auto-send
          </label>
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} disabled={loading} />
            Active
          </label>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Template items</h2>
            <Button type="button" variant="secondary" onClick={addItem}><Plus size={16} />Add item</Button>
          </div>
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-3 border-t border-line pt-4 md:grid-cols-[1.2fr_1.4fr_90px_120px_90px_90px_44px]">
              <Field label="Product">
                <div className="relative">
                  <input
                    className={inputClassName('w-full')}
                    value={productPicker.index === index ? productPicker.query : productLabel(productsById, item.productId)}
                    onFocus={() => openProductPicker(index)}
                    onChange={(event) => setProductPicker({ index, query: event.target.value, results: productPicker.index === index ? productPicker.results : products })}
                    placeholder="Search product or leave manual"
                    disabled={loading}
                  />
                  {productPicker.index === index ? (
                    <div className="absolute left-0 right-0 top-11 z-20 max-h-64 overflow-y-auto rounded-md border border-line bg-panel shadow-lg">
                      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface" onMouseDown={(event) => event.preventDefault()} onClick={() => selectProduct(index, null)}>
                        <span>Manual item</span>
                        <span className="text-xs text-muted">No product</span>
                      </button>
                      {productPicker.results.map((product) => (
                        <button key={product.id} type="button" className="grid w-full gap-0.5 px-3 py-2 text-left text-sm hover:bg-surface" onMouseDown={(event) => event.preventDefault()} onClick={() => selectProduct(index, product)}>
                          <span className="font-medium text-ink">{product.name}</span>
                          <span className="text-xs text-muted">{product.unit ?? 'item'} - {money(form.currency, product.unitPrice)} - Tax {product.taxRate ?? '0'}%</span>
                        </button>
                      ))}
                      {productPicker.results.length === 0 ? <p className="px-3 py-2 text-sm text-muted">No products found</p> : null}
                    </div>
                  ) : null}
                </div>
              </Field>
              <Field label="Description"><input className={inputClassName()} value={item.description} onChange={(event) => setItem(index, { description: event.target.value })} required disabled={loading} /></Field>
              <Field label="Qty"><input className={inputClassName()} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setItem(index, { quantity: event.target.value })} required disabled={loading} /></Field>
              <Field label="Unit price"><input className={inputClassName()} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItem(index, { unitPrice: event.target.value })} required disabled={loading} /></Field>
              <Field label="Tax %"><input className={inputClassName()} type="number" min="0" step="0.01" value={item.taxRate} onChange={(event) => setItem(index, { taxRate: event.target.value })} disabled={loading} /></Field>
              <Field label="Discount %"><input className={inputClassName()} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => setItem(index, { discount: event.target.value })} disabled={loading} /></Field>
              <div className="flex items-end">
                <Button type="button" variant="ghost" className="w-10 px-0 text-danger" onClick={() => removeItem(index)} disabled={form.items.length === 1} aria-label="Remove item" title="Remove item"><Trash2 size={17} /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Notes"><textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={loading} /></Field>
          <Field label="Footer"><textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.footer} onChange={(event) => setForm({ ...form, footer: event.target.value })} disabled={loading} /></Field>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-sm font-semibold">Preview total: {money(form.currency, previewTotal)}</p>
          <Button type="submit" disabled={saving || loading}><CalendarClock size={17} />{saving ? 'Saving...' : isEditing ? 'Save schedule' : 'Create schedule'}</Button>
        </div>
      </form>
    </section>
  )
}

export function RecurringInvoiceDetailPage({ recurringInvoiceId, user, onNavigate }) {
  const canManage = ['admin', 'owner'].includes(user?.role)
  const [template, setTemplate] = useState(null)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [modal, setModal] = useState({ open: false })
  const [loading, setLoading] = useState(true)

  const loadTemplate = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const data = await recurringInvoiceApi.get(recurringInvoiceId)
      setTemplate(data.recurringInvoice)
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringInvoiceId])

  const generateInvoice = async () => {
    setNotice({ tone: 'error', message: '' })
    try {
      await recurringInvoiceApi.generate(recurringInvoiceId)
      setModal({ open: true, title: 'Invoice generated', message: 'A new invoice was created from this recurring schedule.', confirmText: 'Done', onConfirm: () => setModal({ open: false }) })
      await loadTemplate()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    }
  }

  return (
    <section>
      <Modal open={modal.open} title={modal.title} message={modal.message} confirmText={modal.confirmText} onConfirm={modal.onConfirm} onClose={modal.onConfirm} />
      <PageHeader
        title={template?.client?.name ?? 'Recurring Invoice'}
        description="Recurring invoice detail with schedule settings and reusable line items."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onNavigate('recurring')}><ArrowLeft size={16} />Back</Button>
            {canManage ? <Button variant="secondary" onClick={() => onNavigate('recurring-edit', { recurringInvoiceId })}><Edit3 size={16} />Edit</Button> : null}
            {canManage ? <Button onClick={generateInvoice}><Wand2 size={16} />Generate</Button> : null}
          </div>
        )}
      />
      <div className="p-5"><Notice tone={notice.tone}>{notice.message}</Notice></div>
      {!loading && template ? (
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs text-muted">Client</p><p className="font-semibold">{template.client?.name}</p><p className="text-sm text-muted">{template.client?.email}</p></div>
            <div><p className="text-xs text-muted">Interval</p><p className="font-semibold capitalize">{intervalLabel(template.interval)}</p></div>
            <div><p className="text-xs text-muted">Next issue</p><p className="font-semibold">{formatDateOnly(template.nextIssueDate)}</p></div>
            <div><p className="text-xs text-muted">Status</p><TemplateStatus template={template} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs text-muted">End date</p><p className="font-semibold">{formatDateOnly(template.endDate)}</p></div>
            <div><p className="text-xs text-muted">Due days</p><p className="font-semibold">{template.dueDaysAfterIssue} days</p></div>
            <div><p className="text-xs text-muted">Currency</p><p className="font-semibold">{template.currency}</p></div>
            <div><p className="text-xs text-muted">Created</p><p className="font-semibold">{formatDate(template.createdAt)}</p></div>
          </div>

          <MobileList>
            {template.items?.map((item) => (
              <MobileCard key={item.id}>
                <p className="font-semibold text-ink">{item.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MobileMeta label="Qty">{item.quantity}</MobileMeta>
                  <MobileMeta label="Unit">{money(template.currency, item.unitPrice)}</MobileMeta>
                  <MobileMeta label="Tax">{item.taxRate}%</MobileMeta>
                  <MobileMeta label="Discount">{item.discount}%</MobileMeta>
                  <MobileMeta label="Total">{money(template.currency, lineItemTotal(item))}</MobileMeta>
                </div>
              </MobileCard>
            ))}
          </MobileList>

          <div className="hidden overflow-x-auto bg-panel md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase text-muted"><tr><th className="px-5 py-3">Description</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Unit</th><th className="px-5 py-3">Tax</th><th className="px-5 py-3">Discount</th><th className="px-5 py-3">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {template.items?.map((item) => <tr key={item.id}><td className="px-5 py-3 font-medium">{item.description}</td><td className="px-5 py-3">{item.quantity}</td><td className="px-5 py-3">{money(template.currency, item.unitPrice)}</td><td className="px-5 py-3">{item.taxRate}%</td><td className="px-5 py-3">{item.discount}%</td><td className="px-5 py-3 font-medium">{money(template.currency, lineItemTotal(item))}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 text-sm">
            {template.notes ? <p><span className="font-semibold">Notes:</span> {template.notes}</p> : null}
            {template.footer ? <p><span className="font-semibold">Footer:</span> {template.footer}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
