import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Button } from './Button'

export function Modal({ open, tone = 'success', title, message, confirmText = 'OK', cancelText, onConfirm, onCancel, onClose }) {
  if (!open) return null

  const close = onClose ?? onCancel ?? onConfirm
  const Icon = tone === 'danger' ? AlertTriangle : CheckCircle2
  const iconClass = tone === 'danger' ? 'bg-red-50 text-danger' : 'bg-emerald-50 text-emerald-700'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-md rounded-md border border-line bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`grid size-10 shrink-0 place-items-center rounded-md ${iconClass}`}>
              <Icon size={21} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              {message ? <p className="mt-1 text-sm leading-6 text-muted">{message}</p> : null}
            </div>
          </div>
          <button type="button" onClick={close} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink" aria-label="Close modal">
            <X size={17} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          {cancelText ? (
            <Button type="button" variant="secondary" onClick={onCancel}>{cancelText}</Button>
          ) : null}
          <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm ?? close}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
