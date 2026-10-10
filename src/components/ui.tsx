import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CheckCircle2, Eye, EyeOff, Inbox, Info, X, XCircle } from 'lucide-react'
import { COLORS, cn, fileToDataUrl, formatPhone, initials, normalizePhone } from '../lib/utils'
import { t } from '../lib/i18n'

// ---------------- Button ----------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand text-white hover:opacity-90 shadow-sm shadow-brand/30',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    soft: 'bg-brand/10 text-brand hover:bg-brand/15',
  }
  const s = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-sm gap-2' }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer',
        v[variant],
        s[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ className, children, tone = 'default', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) {
  return (
    <button
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
        tone === 'danger' ? 'text-slate-400 hover:bg-red-50 hover:text-red-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

// ---------------- Form fields ----------------
export function Field({ label, error, hint, children, className }: { label?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50'

export function Input({ label, error, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <input className={cn(inputCls, error && 'border-red-300')} {...rest} />
    </Field>
  )
}

export function PasswordInput({ label, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} error={error} className={className}>
      <div className="relative">
        <input type={show ? 'text' : 'password'} className={cn(inputCls, 'pr-11', error && 'border-red-300')} {...rest} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" tabIndex={-1}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  )
}

export function PhoneInput({ label, value, onChange, error, autoFocus, className }: { label?: string; value: string; onChange: (digits: string) => void; error?: string; autoFocus?: boolean; className?: string }) {
  return (
    <Field label={label} error={error} className={className}>
      <div className={cn('flex h-11 items-center rounded-xl border border-slate-200 bg-white transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10', error && 'border-red-300')}>
        <span className="pl-3.5 pr-2 text-sm font-semibold text-slate-500">+998</span>
        <input
          inputMode="tel"
          autoFocus={autoFocus}
          className="h-full flex-1 rounded-r-xl bg-transparent pr-3.5 text-sm outline-none placeholder:text-slate-400"
          placeholder="90 123 45 67"
          value={formatPhone(value)}
          onChange={(e) => onChange(normalizePhone(e.target.value))}
        />
      </div>
    </Field>
  )
}

export function Textarea({ label, error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <Field label={label} error={error} className={className}>
      <textarea className={cn(inputCls, 'h-auto min-h-[88px] py-2.5 leading-relaxed')} {...rest} />
    </Field>
  )
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Field label={label} error={error} className={className}>
      <select className={cn(inputCls, 'cursor-pointer pr-8', error && 'border-red-300')} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label?: string }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            className={cn('h-8 w-8 rounded-full ring-offset-2 transition cursor-pointer', value.toLowerCase() === c && 'ring-2 ring-slate-800')}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <label className="relative flex h-8 items-center gap-2 rounded-full border border-slate-200 pl-1 pr-3 text-xs font-medium text-slate-500 cursor-pointer">
          <span className="h-6 w-6 rounded-full border border-slate-200" style={{ background: value }} />
          {value}
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </div>
    </Field>
  )
}

export function PhotoInput({ value, onChange, name = '' }: { value?: string; onChange: (v?: string) => void; name?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => ref.current?.click()} className="relative cursor-pointer">
        <Avatar name={name || '?'} photo={value} size={64} />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white ring-2 ring-white">
          <Camera size={14} />
        </span>
      </button>
      <div className="text-xs text-slate-500">
        <button type="button" className="font-semibold text-brand cursor-pointer" onClick={() => ref.current?.click()}>
          {t("Rasm yuklash")}
        </button>
        {value && (
          <button type="button" className="ml-3 text-red-500 cursor-pointer" onClick={() => onChange(undefined)}>
            {t("O'chirish")}
          </button>
        )}
        <p className="mt-0.5">{t("JPG yoki PNG")}</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onChange(await fileToDataUrl(f))
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ---------------- Display ----------------
export function Avatar({ name, photo, size = 36, color, square }: { name: string; photo?: string; size?: number; color?: string; square?: boolean }) {
  if (photo) return <img src={photo} alt={name} className={cn('shrink-0 object-cover', square ? 'rounded-xl' : 'rounded-full')} style={{ width: size, height: size }} />
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center font-bold', square ? 'rounded-xl' : 'rounded-full', !color && 'bg-brand/10 text-brand')}
      style={{ width: size, height: size, fontSize: size * 0.36, ...(color ? { background: color + '1f', color } : {}) }}
    >
      {initials(name) || '?'}
    </div>
  )
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40', className)} {...rest}>
      {children}
    </div>
  )
}

type Tone = 'brand' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'slate' | 'yellow'
const toneCls: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  yellow: 'bg-amber-50 text-amber-600',
}

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', toneCls[tone], className)}>{children}</span>
}

export function StatCard({ title, value, sub, icon, tone = 'brand', onClick }: { title: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; tone?: Tone; onClick?: () => void }) {
  return (
    <Card className={cn('relative overflow-hidden p-5', onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md')} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', toneCls[tone])}>{icon}</div>
      </div>
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon ?? <Inbox size={26} />}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition cursor-pointer', value === it.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = t("Qidiruv..."), className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input className={cn(inputCls, 'h-10 pl-9')} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cn('relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl animate-pop', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} aria-label={t("Yopish")}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---------------- Toast ----------------
type ToastItem = { id: number; text: string; type: 'success' | 'error' | 'info' }
let toastListener: ((tn: ToastItem) => void) | null = null
export function toast(text: string, type: ToastItem['type'] = 'success') {
  toastListener?.({ id: Date.now() + Math.random(), text, type })
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    toastListener = (tn) => {
      setItems((x) => [...x, tn])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== tn.id)), 3200)
    }
    return () => {
      toastListener = null
    }
  }, [])
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {items.map((tn) => (
        <div key={tn.id} className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl animate-pop">
          {tn.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : tn.type === 'error' ? <XCircle size={18} className="text-red-400" /> : <Info size={18} className="text-blue-400" />}
          {tn.text}
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {head.map((h, i) => (
              <th key={i} className="px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

// ---------------- Drawer (yon oyna) ----------------
export function Drawer({ open, onClose, title, actions, children }: { open: boolean; onClose: () => void; title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/30 animate-fade" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl animate-slide">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <h3 className="flex-1 text-lg font-bold text-slate-900">{title}</h3>
          {actions}
          <IconButton onClick={onClose} aria-label={t("Yopish")}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
