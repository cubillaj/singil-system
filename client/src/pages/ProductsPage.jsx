import { ArrowLeft, Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
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
import { productApi } from '../services/api'

const emptyForm = {
  name: '',
  description: '',
  unit: 'item',
  unitPrice: '',
  taxRate: '0',
}

function cleanPayload(form, { keepEmpty = false } = {}) {
  return Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => keepEmpty || value !== ''),
  )
}

function productToForm(product) {
  return {
    name: product.name ?? '',
    description: product.description ?? '',
    unit: product.unit ?? 'item',
    unitPrice: product.unitPrice ?? '',
    taxRate: product.taxRate ?? '0',
  }
}

export function ProductsPage({ user, onNavigate }) {
  const canManageProducts = ['admin', 'owner'].includes(user?.role)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [modal, setModal] = useState({ open: false })
  const [productToDelete, setProductToDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(filters.search)

  const loadProducts = async () => {
    setLoading(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const data = await productApi.list(params)
      setProducts(data.products ?? [])
      setPagination(data.pagination ?? { page: filters.page, limit: filters.limit, totalPages: 1, total: 0 })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.sortOrder, debouncedSearch])

  const confirmDeleteProduct = async () => {
    if (!canManageProducts) return
    if (!productToDelete) return
    setNotice({ tone: 'error', message: '' })
    try {
      await productApi.delete(productToDelete.id)
      setModal({
        open: true,
        tone: 'success',
        title: 'Product deleted',
        message: `${productToDelete.name} was removed successfully.`,
        confirmText: 'Done',
        onConfirm: () => setModal({ open: false }),
      })
      setProductToDelete(null)
      await loadProducts()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
      setProductToDelete(null)
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
        open={Boolean(productToDelete)}
        tone="danger"
        title="Delete product?"
        message={productToDelete ? `${productToDelete.name} will be permanently removed from this organization.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
      <PageHeader
        title="Products"
        description="View invoice line items, units, prices, and tax rates."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadProducts}>
              <RefreshCw size={16} />
              Refresh
            </Button>
            {canManageProducts ? (
              <Button onClick={() => onNavigate('product-new')}>
                <Plus size={16} />
                New product
              </Button>
            ) : null}
          </div>
        )}
      />

      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[1fr_140px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
            <input
              className={inputClassName('w-full pl-10')}
              placeholder="Search products"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') loadProducts()
              }}
            />
          </div>
          <select className={inputClassName()} value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value, page: 1 })}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadProducts}>Apply</Button>
        </div>
      </div>

      <div className="mx-5 mt-4">
        <Notice tone={notice.tone}>{notice.message}</Notice>
      </div>

      <MobileList>
        {products.map((product) => (
          <MobileCard key={product.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{product.name}</p>
                <p className="mt-1 text-sm text-muted">{product.description || 'No description'}</p>
              </div>
              {canManageProducts ? (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" className="w-9 px-0" title="Edit product" aria-label="Edit product" onClick={() => onNavigate('product-edit', { productId: product.id })}>
                    <Edit3 size={16} />
                  </Button>
                  <Button variant="ghost" className="w-9 px-0 text-danger" title="Delete product" aria-label="Delete product" onClick={() => setProductToDelete(product)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MobileMeta label="Unit">{product.unit}</MobileMeta>
              <MobileMeta label="Price">{product.unitPrice}</MobileMeta>
              <MobileMeta label="Tax">{product.taxRate ?? '0'}%</MobileMeta>
            </div>
          </MobileCard>
        ))}
      </MobileList>

      <div className="hidden overflow-x-auto bg-panel md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Unit</th>
              <th className="px-5 py-3 font-semibold">Price</th>
              <th className="px-5 py-3 font-semibold">Tax</th>
              {canManageProducts ? <th className="px-5 py-3 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface/70">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{product.name}</p>
                  <p className="text-muted">{product.description || 'No description'}</p>
                </td>
                <td className="px-5 py-3 text-muted">{product.unit}</td>
                <td className="px-5 py-3 font-medium">{product.unitPrice}</td>
                <td className="px-5 py-3 text-muted">{product.taxRate ?? '0'}%</td>
                {canManageProducts ? (
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" className="mr-1 w-10 px-0" title="Edit product" aria-label="Edit product" onClick={() => onNavigate('product-edit', { productId: product.id })}>
                      <Edit3 size={17} />
                    </Button>
                    <Button variant="ghost" className="w-10 px-0 text-danger" title="Delete product" aria-label="Delete product" onClick={() => setProductToDelete(product)}>
                      <Trash2 size={17} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && products.length === 0 ? <EmptyState title="No products found" description="Create a product or adjust the filters." /> : null}

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

export function ProductFormPage({ productId, onNavigate }) {
  const isEditing = Boolean(productId)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [successModal, setSuccessModal] = useState({ open: false })
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return
      setLoading(true)
      setNotice({ tone: 'error', message: '' })
      try {
        const data = await productApi.get(productId)
        setForm(productToForm(data.product))
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  const submitProduct = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const payload = cleanPayload(form, { keepEmpty: isEditing })
      if (isEditing) {
        await productApi.update(productId, payload)
      } else {
        await productApi.create(payload)
      }
      setSuccessModal({
        open: true,
        title: isEditing ? 'Product updated' : 'Product created',
        message: isEditing ? 'The product details were saved successfully.' : 'The new product is ready to use.',
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
        confirmText="Back to products"
        onConfirm={() => onNavigate('products')}
        onClose={() => onNavigate('products')}
      />
      <PageHeader
        title={isEditing ? 'Edit Product' : 'Create Product'}
        description={isEditing ? 'Update the product details used on invoices.' : 'Add a new product or service for invoice line items.'}
        action={(
          <Button variant="secondary" onClick={() => onNavigate('products')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={submitProduct} className="grid max-w-3xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <Field label="Name">
          <input className={inputClassName()} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required disabled={loading} />
        </Field>
        <Field label="Description">
          <textarea className={inputClassName('min-h-24 resize-y py-2')} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={loading} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Unit">
            <input className={inputClassName()} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} disabled={loading} />
          </Field>
          <Field label="Price">
            <input className={inputClassName()} type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required disabled={loading} />
          </Field>
          <Field label="Tax %">
            <input className={inputClassName()} type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => setForm({ ...form, taxRate: event.target.value })} disabled={loading} />
          </Field>
        </div>
        <Button type="submit" disabled={saving || loading} className="w-fit">
          <Plus size={17} />
          {saving ? 'Saving...' : isEditing ? 'Save product' : 'Create product'}
        </Button>
      </form>
    </section>
  )
}
