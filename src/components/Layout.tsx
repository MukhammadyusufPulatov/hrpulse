import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, Bell, Briefcase, Building2, Cake, ChevronDown, CreditCard, FileText, Globe, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Rocket, Settings, UserPlus, Users, X } from 'lucide-react'
import { canLogin, filialsOf, setSession, subStatus, useDb, useSession } from '../lib/db'
import { LANGS, getLang, setLang, t, type Lang } from '../lib/i18n'
import { useTenant } from '../lib/tenant'
import { cn, timeAgo } from '../lib/utils'
import { daysToBirthday } from '../pages/tenant/Birthdays'
import { Avatar } from './ui'

type Item = { to: string; label: string; icon: ReactNode; children?: { to: string; label: string; dot?: string }[]; badge?: number }

export function Logo({ name = 'HR PULSE', sub, compact }: { name?: string; sub?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', compact && 'justify-center')}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
        <Activity size={22} strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-tight tracking-tight text-slate-900">{name}</p>
          {sub && <p className="truncate text-[11px] font-medium text-slate-400">{sub}</p>}
        </div>
      )}
    </div>
  )
}

/** Til almashtirgich: UZ / RU / EN */
export function LangSwitch({ dark }: { dark?: boolean }) {
  const cur = getLang()
  return (
    <div className={cn('flex items-center gap-0.5 rounded-xl p-1', dark ? 'bg-white/10' : 'bg-slate-100')} title={LANGS.find((l) => l.value === cur)?.label}>
      <Globe size={14} className={cn('mx-1', dark ? 'text-white/60' : 'text-slate-400')} />
      {LANGS.map((l) => (
        <button
          key={l.value}
          onClick={() => setLang(l.value as Lang)}
          className={cn(
            'rounded-lg px-2 py-1 text-[11px] font-bold uppercase transition cursor-pointer',
            cur === l.value ? (dark ? 'bg-white text-slate-900' : 'bg-white text-slate-900 shadow-sm') : dark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {l.value}
        </button>
      ))}
    </div>
  )
}

function NavItem({ item, compact, onNavigate }: { item: Item; compact: boolean; onNavigate: () => void }) {
  const loc = useLocation()
  const active = loc.pathname.startsWith(item.to)
  const [open, setOpen] = useState(active)
  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  const base = cn('flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer', compact ? 'justify-center px-0' : 'px-3')
  const badge = !!item.badge && (
    <span className={cn('rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white', compact && 'absolute right-1.5 top-1')}>{item.badge}</span>
  )
  if (!item.children || compact) {
    return (
      <NavLink
        to={item.to}
        end={!!item.children}
        title={compact ? item.label : undefined}
        onClick={onNavigate}
        className={({ isActive }) => cn(base, 'relative', isActive || (compact && active) ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
      >
        {item.icon}
        {!compact && <span className="flex-1">{item.label}</span>}
        {badge}
      </NavLink>
    )
  }
  return (
    <div>
      <div className={cn(base, 'p-0', active ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}>
        <NavLink to={item.to} end onClick={onNavigate} className="flex flex-1 items-center gap-3 py-2.5 pl-3">
          {item.icon}
          <span className="flex-1">{item.label}</span>
        </NavLink>
        <button onClick={() => setOpen(!open)} className="px-3 py-2.5 cursor-pointer" aria-label={t('Ochish')}>
          <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
          {item.children.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">{t("Hozircha mijoz yo'q")}</p>}
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={onNavigate}
              className={({ isActive }) => cn('flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors', isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800')}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.dot }} />
              <span className="truncate">{c.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

const COLLAPSE_KEY = 'hrpulse_sidebar_collapsed'

function Shell({ items, brand, header, footer, banner, children }: { items: Item[]; brand: (compact: boolean) => ReactNode; header?: ReactNode; footer: (compact: boolean) => ReactNode; banner?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false) // mobil menyu
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1') // kompyuterda yig'ilgan menyu
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  const toggleDesktop = () => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '0' : '1')
    setCollapsed(!collapsed)
  }

  const side = (compact: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cn('py-5', compact ? 'px-3' : 'px-5')}>{brand(compact)}</div>
      <nav className={cn('scroll-thin flex-1 space-y-1 overflow-y-auto pb-4', compact ? 'px-2.5' : 'px-3')}>
        {items.map((i) => (
          <NavItem key={i.to} item={i} compact={compact} onNavigate={() => setOpen(false)} />
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">{footer(compact)}</div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/70 bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-20' : 'w-64')}>{side(collapsed)}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-white shadow-xl animate-pop">
            <button className="absolute right-3 top-5 p-1 text-slate-400 cursor-pointer" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {side(false)}
          </aside>
        </div>
      )}
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer" onClick={() => setOpen(true)} aria-label={t('Menyu')}>
            <Menu size={20} />
          </button>
          <button
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:block cursor-pointer"
            onClick={toggleDesktop}
            title={collapsed ? t('Menyuni ochish') : t('Menyuni yopish')}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="flex flex-1 items-center justify-end gap-2">{header}</div>
        </header>
        {banner}
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

function UserFooter({ name, role, logoutTo = '/login', compact }: { name: string; role: string; logoutTo?: string; compact: boolean }) {
  const nav = useNavigate()
  const logout = (
    <button
      title={t('Chiqish')}
      onClick={() => {
        setSession(null)
        nav(logoutTo)
      }}
      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
    >
      <LogOut size={18} />
    </button>
  )
  if (compact)
    return (
      <div className="flex flex-col items-center gap-2" title={name}>
        <Avatar name={name} size={36} />
        {logout}
      </div>
    )
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <Avatar name={name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-400">{role}</p>
      </div>
      {logout}
    </div>
  )
}

export function SuperLayout({ children }: { children: ReactNode }) {
  const db = useDb()
  const expiring = db.clients.filter((c) => subStatus(c) === 'expiring').length
  const items: Item[] = [
    { to: '/super/dashboard', label: t('Dashboard'), icon: <LayoutDashboard size={19} /> },
    {
      to: '/super/clients',
      label: t('Mijozlar'),
      icon: <Building2 size={19} />,
      children: db.clients.map((c) => ({ to: `/super/clients/${c.id}`, label: c.companyName, dot: c.primaryColor })),
    },
    { to: '/super/subscriptions', label: t('Obunalar'), icon: <CreditCard size={19} />, badge: expiring },
    { to: '/super/settings', label: t('Sozlamalar'), icon: <Settings size={19} /> },
  ]
  return (
    <Shell items={items} header={<LangSwitch />} brand={(c) => <Logo sub={t('Super Admin panel')} compact={c} />} footer={(c) => <UserFooter name={db.superAdmin.name} role="Super Admin" compact={c} />}>
      {children}
    </Shell>
  )
}

function Notifications() {
  const { tenant, me, update } = useTenant()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mine = tenant.notices.filter((n) => n.to === me || n.to === 'all')
  const unread = mine.filter((n) => !n.read).length
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open && unread) update((t) => t.notices.forEach((n) => (n.to === me || n.to === 'all') && (n.read = true)))
        }}
        className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
        aria-label={t('Bildirishnomalar')}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-pop">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold">{t('Bildirishnomalar')}</p>
            {mine.length > 0 && (
              <button className="text-xs font-semibold text-brand cursor-pointer" onClick={() => update((x) => (x.notices = x.notices.filter((n) => !(n.to === me || n.to === 'all'))))}>
                {t('Tozalash')}
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-80 overflow-y-auto">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">{t("Bildirishnomalar yo'q")}</p>}
            {mine.map((n) => (
              <div key={n.id} className="border-b border-slate-50 px-4 py-3 last:border-0">
                <p className="text-sm text-slate-700">{n.text}</p>
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Filial almashtirgich: bir xil telefon raqamga ochilgan profillar orasida o'tish (faqat admin uchun) */
export function FilialSwitch() {
  const { client, isAdmin } = useTenant()
  const db = useDb()
  const session = useSession()
  const nav = useNavigate()
  if (!isAdmin || session?.role !== 'admin') return null
  const filials = filialsOf(client, db.clients).filter((c) => !canLogin(c))
  if (filials.length < 2) return null
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 text-sm font-semibold text-slate-700 focus-within:border-brand">
      <Building2 size={16} className="text-slate-400" />
      <select
        value={client.id}
        onChange={(e) => {
          localStorage.setItem('hrpulse_last_filial_' + client.phone, e.target.value)
          setSession({ role: 'admin', clientId: e.target.value })
          nav('/app/dashboard')
        }}
        className="h-full max-w-[220px] cursor-pointer rounded-r-xl bg-transparent pr-2 outline-none"
        title={t('Filialni tanlang')}
      >
        {filials.map((f) => (
          <option key={f.id} value={f.id}>
            {f.companyName}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TenantLayout({ children }: { children: ReactNode }) {
  const { client, tenant, isAdmin, meName } = useTenant()
  const items: Item[] = [
    { to: '/app/dashboard', label: t('Dashboard'), icon: <LayoutDashboard size={19} /> },
    { to: '/app/recruiting', label: t('Rekruiting'), icon: <UserPlus size={19} /> },
    { to: '/app/onboarding', label: t('Onboarding'), icon: <Rocket size={19} /> },
    { to: '/app/employees', label: t('Xodimlar'), icon: <Users size={19} /> },
    { to: '/app/reports', label: t('Statistika'), icon: <BarChart3 size={19} /> },
    { to: '/app/birthdays', label: t("Tug'ilgan kunlar"), icon: <Cake size={19} /> },
    { to: '/app/documents', label: t('Hujjatlar'), icon: <FileText size={19} /> },
    { to: '/app/vacancies', label: t('Vakansiyalar'), icon: <Briefcase size={19} /> },
    ...(isAdmin ? [{ to: '/app/settings', label: t('Sozlamalar'), icon: <Settings size={19} /> }] : []),
  ]
  // Bugun tug'ilgan kuni bo'lgan xodimlar — kun bo'yi admin va HR menejerlarga ko'rinib turadi
  const bdays = tenant.employees.filter((e) => e.birthDate && daysToBirthday(e.birthDate) === 0)
  const banner = bdays.length > 0 && (
    <div className="sticky top-16 z-10 overflow-hidden border-b border-pink-200 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-white shadow-sm animate-drop">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 text-sm sm:px-6">
        <Cake size={18} className="shrink-0" />
        <p className="flex-1">{t("Bugun {name}ning tug'ilgan kuni. Tabriklashni unutmang! 🎉", { name: bdays.map((e) => e.name).join(', ') })}</p>
        <NavLink to="/app/birthdays" className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30">
          {t("Ko'rish")}
        </NavLink>
      </div>
    </div>
  )
  return (
    <Shell
      banner={banner}
      items={items}
      brand={(c) => <Logo name={client.companyName} sub={`${client.subdomain}.hrpulse.uz`} compact={c} />}
      header={
        <>
          <FilialSwitch />
          <LangSwitch />
          <Notifications />
        </>
      }
      footer={(c) => <UserFooter name={meName} role={isAdmin ? t('Admin') : t('HR menejer')} logoutTo={`/c/${client.subdomain}`} compact={c} />}
    >
      {children}
    </Shell>
  )
}
