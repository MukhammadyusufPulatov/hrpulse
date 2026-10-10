import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, ChevronRight, MapPin } from 'lucide-react'
import { Empty } from '../../components/ui'
import { LangSwitch } from '../../components/Layout'
import { canLogin, useDb } from '../../lib/db'
import { SUPER_BRAND, useBrand } from '../../lib/theme'
import { nameOf } from '../../lib/tenant'
import { t } from '../../lib/i18n'

/** Kompaniyaning ommaviy vakansiyalar sahifasi: avval bo'limlar, keyin bo'lim ichidagi vakansiyalar */
export default function Landing() {
  const { sub } = useParams()
  const [params, setParams] = useSearchParams()
  const db = useDb()
  const client = db.clients.find((c) => c.subdomain === sub)
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  const tn = client && db.tenants[client.id]
  if (!client || !tn || canLogin(client))
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty title={t("Sahifa topilmadi")} text={t("Bu manzil bo'yicha faol kompaniya mavjud emas")} />
      </div>
    )

  const branch = params.get('branch') || ''
  const dep = params.get('dep')
  const active = tn.vacancies.filter((v) => v.active && (!branch || v.branchId === branch))
  const groups = [...tn.departments.map((d) => ({ id: d.id, name: d.name })), { id: '_', name: t("Boshqa") }]
    .map((g) => ({ ...g, list: active.filter((v) => (v.departmentId ?? '_') === g.id || (g.id === '_' && v.departmentId && !tn.departments.some((d) => d.id === v.departmentId))) }))
    .filter((g) => g.list.length)
  const current = groups.find((g) => g.id === dep)
  const setDep = (id: string | null) =>
    setParams((p) => {
      if (id) p.set('dep', id)
      else p.delete('dep')
      return p
    })

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-white">{client.companyName[0]}</div>
        <span className="flex-1 font-extrabold tracking-tight text-slate-900">{client.companyName}</span>
        <LangSwitch />
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        {!current ? (
          <>
            <div className="mx-auto max-w-2xl pb-12 pt-8 text-center">
              <span className="rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand">{t("Bo'sh ish o'rinlari")}</span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{t("Siz uchun eng mos sohani tanlang")}</h1>
              <p className="mt-4 text-slate-500">
                {t("{0} jamoasiga qo'shiling. O'zingiz qiziqqan bo'limni tanlang va mavjud vakansiyalar bilan tanishing.", { 0: client.companyName })}
              </p>
            </div>
            {groups.length === 0 ? (
              <div className="rounded-3xl bg-white shadow-sm">
                <Empty icon={<Briefcase size={26} />} title={t("Bo'sh ish o'rinlari topilmadi")} text={t("Tez orada yangi vakansiyalar e'lon qilinadi")} />
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {groups.map((g) => (
                  <button key={g.id} onClick={() => setDep(g.id)} className="group rounded-[2rem] border border-slate-100 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Briefcase size={22} />
                    </div>
                    <p className="mt-5 min-h-[56px] text-xl font-bold text-slate-900">{g.name}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{t("{0} ta vakansiya", { 0: g.list.length })}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-brand group-hover:text-white">
                        <ChevronRight size={18} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setDep(null)} className="mb-6 mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
              <ArrowLeft size={16} /> {t("Barcha bo'limlar")}
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{current.name}</h1>
            <p className="mt-2 text-slate-500">{t("Ushbu bo'limdagi mavjud barcha bo'sh ish o'rinlari")}</p>
            <div className="mt-8 space-y-4">
              {current.list.map((v) => (
                <Link key={v.id} to={`/apply/${client.subdomain}/${v.id}/${params.get('ch') || 'direct'}`} className="group flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Briefcase size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-slate-900">{v.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      {tn.branches.length > 1 && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {nameOf(tn.branches, v.branchId)}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">{t("Aktiv")}</span>
                      <span className="text-xs font-semibold">{v.type === 'full_time' ? t("Full-time") : t("Part-time")}</span>
                    </div>
                  </div>
                  <span className="hidden text-sm font-bold text-brand sm:block">{t("Batafsil ma'lumot")}</span>
                  <ChevronRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand" />
                </Link>
              ))}
            </div>
          </>
        )}
        <p className="mt-16 text-center text-xs text-slate-400">{t("HR PULSE orqali ishlaydi")}</p>
      </main>
    </div>
  )
}
