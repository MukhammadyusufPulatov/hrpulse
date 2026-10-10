import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Activity, BarChart3, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react'
import { Button } from '../components/ui'
import { formatPhone, normalizePhone } from '../lib/utils'
import { canLogin, getDb, setSession, useDb, useSession } from '../lib/db'
import type { Client } from '../lib/types'
import { Empty } from '../components/ui'
import { LangSwitch } from '../components/Layout'
import { SUPER_BRAND, useBrand } from '../lib/theme'
import { t } from '../lib/i18n'

export default function Login() {
  return <LoginView />
}

/** Mijozning subdomain orqali kirish sahifasi: demo.hrpulse.uz (lokal: /#/c/demo) */
export function TenantLogin() {
  const { sub } = useParams()
  const db = useDb()
  const client = db.clients.find((c) => c.subdomain === sub)
  if (!client)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty title={t("Sahifa topilmadi")} text={t("Bu manzil bo'yicha kompaniya mavjud emas")} />
      </div>
    )
  return <LoginView client={client} />
}

function LoginView({ client }: { client?: Client }) {
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  // Chap (qora) paneldagi urg'u rangi: super admin — oq, mijoz — o'z rangi
  const accent = client?.primaryColor ?? '#ffffff'
  const onAccent = client ? '#ffffff' : '#0b0b0f'
  const session = useSession()
  const nav = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (phone.length !== 9) return setError(t("Telefon raqamni to'liq kiriting"))
    if (!password) return setError(t('Parolni kiriting'))
    const db = getDb()

    if (!client && phone === db.superAdmin.phone && password === db.superAdmin.password) {
      setSession({ role: 'super' })
      return nav('/super/dashboard')
    }

    // Subdomain sahifasida faqat shu kompaniya foydalanuvchilari kira oladi
    const pool = client ? db.clients.filter((c) => c.id === client.id) : db.clients
    // Bir raqamda bir nechta profil (filial) bo'lsa — oxirgi ochilgani yoki birinchi faoli
    const owned = pool.filter((c) => c.phone === phone && c.password === password)
    if (owned.length) {
      const last = localStorage.getItem('hrpulse_last_filial_' + phone)
      const pick = owned.find((c) => c.id === last && !canLogin(c)) ?? owned.find((c) => !canLogin(c))
      if (!pick) return setError(canLogin(owned[0])!)
      setSession({ role: 'admin', clientId: pick.id })
      return nav('/app/dashboard')
    }

    for (const c of pool) {
      const m = db.tenants[c.id]?.managers.find((x) => x.phone === phone && x.password === password)
      if (m) {
        const err = canLogin(c)
        if (err) return setError(err)
        setSession({ role: 'hr', clientId: c.id, managerId: m.id })
        return nav('/app/dashboard')
      }
    }
    setError(t("Telefon raqam yoki parol noto'g'ri"))
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Chap panel — qora, brend */}
      <div className="relative hidden bg-[#0b0b0f] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: accent, color: onAccent }}>
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">{client?.companyName ?? 'HR PULSE'}</span>
        </div>
        <div className="text-white">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent, borderColor: accent + '55' }}>
            {client ? t("HR PULSE · Business CRM") : t("Business CRM")}
          </p>
          <h2 className="max-w-lg text-[44px] font-extrabold leading-[1.1] tracking-tight">{t("HR jarayonlaringizni bir joyda nazorat qiling")}</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">{t("Rekruiting, onboarding, xodimlar bazasi, vazifalar va hisobotlar — barchasi bitta CRM tizimida.")}</p>
          <div className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-8">
            {[
              [<Users key="u" size={20} />, t("Nomzodlar oqimi")],
              [<BarChart3 key="b" size={20} />, t("Hisobotlar")],
              [<ShieldCheck key="s" size={20} />, t("Xavfsiz")],
            ].map(([icon, label], i) => (
              <div key={i} className="flex flex-col gap-3 px-5 first:pl-0">
                <span style={{ color: accent }}>{icon}</span>
                <p className="text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-zinc-600">© {new Date().getFullYear()} HR PULSE</p>
      </div>

      {/* O'ng panel — oq, kirish formasi */}
      <div className="relative flex items-center justify-center bg-white p-6">
        <div className="absolute right-6 top-6">
          <LangSwitch />
        </div>
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">{client?.companyName ?? 'HR PULSE'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Tizimga kirish")}</h1>
          <p className="mt-2 text-sm text-slate-500">{client ? t("{0} — admin va HR menejerlar uchun", { 0: client.companyName }) : t("Telefon raqamingiz va parolingizni kiriting")}</p>
          <div className="mt-9 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Telefon raqam")}</span>
              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-brand focus-within:ring-4 focus-within:bg-white focus-within:ring-brand/10">
                <span className="pl-4 pr-2 text-sm font-semibold text-slate-500">+998</span>
                <input
                  inputMode="tel"
                  autoFocus
                  className="h-full flex-1 rounded-r-xl bg-transparent pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="90 123 45 67"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Parol")}</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:bg-white focus:ring-brand/10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>
          {error && <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="mt-7 w-full shadow-lg shadow-brand/25">
            {t("Kirish")}
          </Button>
          <p className="mt-10 text-center text-xs text-slate-400">{t("Himoyalangan ulanish · HR PULSE")}</p>
        </form>
      </div>
    </div>
  )
}
