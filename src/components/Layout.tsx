import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BarChart3, Bell, Building2, Cake, ChevronDown, ClipboardList, CreditCard, FileText, LayoutDashboard,
  LogOut, Menu, Settings, UserPlus, Users, Briefcase, X, Rocket,
} from 'lucide-react'
import { setSession, subStatus, useDb } from '../lib/db'
import { useTenant } from '../lib/tenant'
import { cn, timeAgo } from '../lib/utils'
import { Avatar } from './ui'

type Item = { to: string; label: string; icon: ReactNode; children?: { to: string; label: string; dot?: string }[]; badge?: number }

export function Logo({ name = 'HR PULSE', sub }: { name?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
        <Activity size={22} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold leading-tight tracking-tight text-slate-900">{name}</p>
        {sub && <p className="truncate text-[11px] font-medium text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function NavItem({ item, onNavigate }: { item: Item; onNavigate: () => void }) {
  const loc = useLocation()
  const active = loc.pathname.startsWith(item.to)
  const [open, setOpen] = useState(active)
  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  const base = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer'
  if (!item.children) {
    return (
      <NavLink to={item.to} onClick={onNavigate} className={({ isActive }) => cn(base, isActive ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}>
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {!!item.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{item.badge}</span>}
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
        <button onClick={() => setOpen(!open)} className="px-3 py-2.5 cursor-pointer" aria-label="Ochish">
          <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
          {item.children.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Hozircha mijoz yo'q</p>}
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

function Shell({ items, brand, header, footer, children }: { items: Item[]; brand: ReactNode; header?: ReactNode; footer: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  const side = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">{brand}</div>
      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((i) => (
          <NavItem key={i.to} item={i} onNavigate={() => setOpen(false)} />
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">{footer}</div>
    </div>
  )
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-white shadow-xl animate-pop">
            <button className="absolute right-3 top-5 p-1 text-slate-400 cursor-pointer" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {side}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer" onClick={() => setOpen(true)} aria-label="Menyu">
            <Menu size={20} />
          </button>
          <div className="flex flex-1 items-center justify-end gap-2">{header}</div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

function UserFooter({ name, role }: { name: string; role: string }) {
  const nav = useNavigate()
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <Avatar name={name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-400">{role}</p>
      </div>
      <button
        title="Chiqish"
        onClick={() => {
          setSession(null)
          nav('/login')
        }}
        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
      >
        <LogOut size={18} />
      </button>
    </div>
  )
}

export function SuperLayout({ children }: { children: ReactNode }) {
  const db = useDb()
  const expiring = db.clients.filter((c) => subStatus(c) === 'expiring').length
  const items: Item[] = [
    { to: '/super/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    {
      to: '/super/clients',
      label: 'Mijozlar',
      icon: <Building2 size={19} />,
      children: db.clients.map((c) => ({ to: `/super/clients/${c.id}`, label: c.companyName, dot: c.primaryColor })),
    },
    { to: '/super/subscriptions', label: 'Obunalar', icon: <CreditCard size={19} />, badge: expiring },
    { to: '/super/settings', label: 'Sozlamalar', icon: <Settings size={19} /> },
  ]
  return (
    <Shell items={items} brand={<Logo sub="Super Admin panel" />} footer={<UserFooter name={db.superAdmin.name} role="Super Admin" />}>
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
        aria-label="Bildirishnomalar"
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-pop">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold">Bildirishnomalar</p>
            {mine.length > 0 && (
              <button className="text-xs font-semibold text-brand cursor-pointer" onClick={() => update((t) => (t.notices = t.notices.filter((n) => !(n.to === me || n.to === 'all'))))}>
                Tozalash
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-80 overflow-y-auto">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Bildirishnomalar yo'q</p>}
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

export function BranchSelect() {
  const { tenant, branch, setBranch } = useTenant()
  if (tenant.branches.length < 2) return null
  return (
    <select value={branch} onChange={(e) => setBranch(e.target.value)} className="h-10 max-w-[180px] cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand">
      <option value="all">Barcha filiallar</option>
      {tenant.branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  )
}

export function TenantLayout({ children }: { children: ReactNode }) {
  const { client, tenant, me, isAdmin, meName } = useTenant()
  const pendingTasks = tenant.tasks.filter((t) => t.status === 'pending' && (isAdmin || t.assigneeId === me)).length
  const items: Item[] = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { to: '/app/recruiting', label: 'Rekruiting', icon: <UserPlus size={19} /> },
    { to: '/app/onboarding', label: 'Onboarding', icon: <Rocket size={19} /> },
    { to: '/app/employees', label: 'Xodimlar', icon: <Users size={19} /> },
    { to: '/app/reports', label: 'Hisobotlar', icon: <BarChart3 size={19} /> },
    { to: '/app/tasks', label: 'Tasklar', icon: <ClipboardList size={19} />, badge: pendingTasks },
    { to: '/app/birthdays', label: "Tug'ilgan kunlar", icon: <Cake size={19} /> },
    { to: '/app/documents', label: 'Hujjatlar', icon: <FileText size={19} /> },
    { to: '/app/vacancies', label: 'Vakansiyalar', icon: <Briefcase size={19} /> },
    ...(isAdmin ? [{ to: '/app/settings', label: 'Sozlamalar', icon: <Settings size={19} /> }] : []),
  ]
  return (
    <Shell
      items={items}
      brand={<Logo name={client.companyName} sub={`${client.subdomain}.hrpulse.uz`} />}
      header={
        <>
          <BranchSelect />
          <Notifications />
        </>
      }
      footer={<UserFooter name={meName} role={isAdmin ? 'Admin' : 'HR menejer'} />}
    >
      {children}
    </Shell>
  )
}

