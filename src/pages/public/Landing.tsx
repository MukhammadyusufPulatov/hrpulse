import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Briefcase, MapPin, ArrowRight } from 'lucide-react'
import { Badge, Empty } from '../../components/ui'
import { canLogin, useDb } from '../../lib/db'
import { SUPER_BRAND, useBrand } from '../../lib/theme'
import { nameOf } from '../../lib/tenant'

export default function Landing() {
  const { sub } = useParams()
  const [params, setParams] = useSearchParams()
  const db = useDb()
  const client = db.clients.find((c) => c.subdomain === sub)
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  const t = client && db.tenants[client.id]
  if (!client || !t || canLogin(client))
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty title="Sahifa topilmadi" text="Bu manzil bo'yicha faol kompaniya mavjud emas" />
      </div>
    )
  const branch = params.get('branch') || ''
  const deps = [...new Set(t.vacancies.filter((v) => v.active).map((v) => v.departmentId ?? ''))]
  const dep = params.get('dep') ?? ''
  const list = t.vacancies.filter((v) => v.active && (!branch || v.branchId === branch) && (!dep || (v.departmentId ?? '') === dep))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-brand px-6 pb-24 pt-14 text-white">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-white/70">{client.subdomain}.hrpulse.uz</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{client.companyName}</h1>
          <p className="mt-3 max-w-xl text-white/80">{client.companyName} jamoasining bir qismiga aylaning. Siz uchun eng mos yo'nalishni tanlang.</p>
        </div>
      </header>
      <main className="relative mx-auto -mt-14 max-w-4xl px-4 pb-16">
        <div className="mb-4 flex flex-wrap gap-2">
          {t.branches.length > 1 && (
            <select
              value={branch}
              onChange={(e) => setParams((p) => (e.target.value ? p.set('branch', e.target.value) : p.delete('branch'), p))}
              className="h-10 cursor-pointer rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm outline-none"
            >
              <option value="">Barcha filiallar</option>
              {t.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {deps.length > 1 && (
            <select
              value={dep}
              onChange={(e) => setParams((p) => (e.target.value ? p.set('dep', e.target.value) : p.delete('dep'), p))}
              className="h-10 cursor-pointer rounded-xl border-0 bg-white px-3 text-sm font-semibold shadow-sm outline-none"
            >
              <option value="">Barcha bo'limlar</option>
              {deps.filter(Boolean).map((d) => (
                <option key={d} value={d}>
                  {nameOf(t.departments, d)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-3">
          {list.length === 0 && (
            <div className="rounded-3xl bg-white shadow-sm">
              <Empty icon={<Briefcase size={26} />} title="Bo'sh ish o'rinlari topilmadi" text="Tez orada yangi vakansiyalar e'lon qilinadi" />
            </div>
          )}
          {list.map((v) => (
            <Link key={v.id} to={`/apply/${client.subdomain}/${v.id}/direct`} className="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Briefcase size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">{v.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {nameOf(t.branches, v.branchId)}
                  </span>
                  <Badge tone="brand">{v.type === 'full_time' ? 'Full-time' : 'Part-time'}</Badge>
                </div>
              </div>
              <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand" />
            </Link>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-slate-400">HR PULSE orqali ishlaydi</p>
      </main>
    </div>
  )
}
