import { useState } from 'react'
import { Copy, ExternalLink, KeyRound, Layers, Radio, Trash2, UserCog } from 'lucide-react'
import { Avatar, Button, Card, IconButton, Input, Modal, PageHeader, PasswordInput, PhoneInput, toast } from '../../components/ui'
import { updateDb } from '../../lib/db'
import { useTenant } from '../../lib/tenant'
import type { Named, Tenant } from '../../lib/types'
import { appUrl, copyText, displayPhone, uid } from '../../lib/utils'
import { phoneTaken } from '../super/ClientModals'
import { t } from '../../lib/i18n'

function Box({ icon, title, subtitle, children, action }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </Card>
  )
}

/** Filiallar / kanallar / bo'limlar uchun oddiy ro'yxat muharriri */
function ListEditor({ field, placeholder, usedBy }: { field: 'channels' | 'departments'; placeholder: string; usedBy: (tn: Tenant, id: string) => number }) {
  const { tenant, update } = useTenant()
  const [name, setName] = useState('')
  const items: Named[] = tenant[field]
  const add = () => {
    if (!name.trim()) return
    if (items.some((i) => i.name.toLowerCase() === name.trim().toLowerCase())) return toast(t('Bu nom allaqachon mavjud'), 'error')
    update((tn) => tn[field].push({ id: uid(), name: name.trim() }))
    setName('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add}>{t("Qo'shish")}</Button>
      </div>
      <div className="mt-3 space-y-1.5">
        {items.length === 0 && <p className="py-4 text-center text-sm text-slate-400">{t("Hozircha yo'q")}</p>}
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pl-3 pr-1.5">
            <input
              className="flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
              defaultValue={i.name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== i.name) update((tn) => (tn[field].find((x) => x.id === i.id)!.name = v))
                else e.target.value = i.name
              }}
            />
            <span className="text-xs text-slate-400">{usedBy(tenant, i.id)}</span>
            <IconButton
              tone="danger"
              onClick={() => {
                if (confirm(t("\"{0}\" o'chirilsinmi?", { 0: i.name }))) update((tn) => (tn[field] = tn[field].filter((x) => x.id !== i.id)))
              }}
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManagerModal({ onClose }: { onClose: () => void }) {
  const { update } = useTenant()
  const [f, setF] = useState({ name: '', phone: '', password: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = t('Ism-familiyani kiriting')
    if (f.phone.length !== 9) e.phone = t("Telefon raqam to'liq emas")
    else if (phoneTaken(f.phone)) e.phone = t('Bu raqam allaqachon ishlatilgan')
    if (f.password.length < 4) e.password = t('Kamida 4 ta belgi')
    setErr(e)
    if (Object.keys(e).length) return
    update((tn) => tn.managers.push({ id: uid(), name: f.name.trim(), phone: f.phone, password: f.password, createdAt: new Date().toISOString() }))
    toast(t("HR menejer qo'shildi"))
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("Menejer qo'shish")}
      subtitle={t("Menejer shu telefon va parol bilan tizimga kiradi")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button onClick={save}>{t("Saqlash")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t("Ism-Familiya")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} autoFocus />
        <PhoneInput label={t("Telefon raqam")} value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
        <PasswordInput label={t("Maxfiy parol")} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} autoComplete="new-password" />
      </div>
    </Modal>
  )
}

function ProfilePassword() {
  const { client } = useTenant()
  const [f, setF] = useState({ cur: '', pw: '', pw2: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    if (f.cur !== client.password) e.cur = t("Joriy parol noto'g'ri")
    if (f.pw.length < 4) e.pw = t('Kamida 4 ta belgi')
    else if (f.pw !== f.pw2) e.pw2 = t('Parollar mos kelmadi')
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.clients.filter((c) => c.phone === client.phone).forEach((c) => (c.password = f.pw))
    })
    setF({ cur: '', pw: '', pw2: '' })
    toast(t("Parol o'zgartirildi"))
  }
  return (
    <div className="space-y-3">
      <PasswordInput label={t("Joriy parol")} value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} error={err.cur} autoComplete="current-password" />
      <PasswordInput label={t("Yangi parol")} value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} autoComplete="new-password" />
      <PasswordInput label={t("Takrorlang")} value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} error={err.pw2} autoComplete="new-password" />
      <Button onClick={save}>{t("Saqlash")}</Button>
    </div>
  )
}

export default function TenantSettings() {
  const { tenant, update, client } = useTenant()
  const [mgr, setMgr] = useState(false)
  const landing = (branchId?: string) => appUrl(`/c/${client.subdomain}/jobs${branchId ? `?branch=${branchId}` : ''}`)
  const copy = async (u: string) => (await copyText(u)) && toast(t('Nusxalandi!'))

  return (
    <div>
      <PageHeader title={t("Sozlamalar")} subtitle={t("Tizimni sozlash va foydalanuvchilar boshqaruvi")} />
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Box icon={<Radio size={18} />} title={t("Manbalar")} subtitle={t("Nomzodlar qayerdan keladi: Instagram, Telegram...")}>
          <ListEditor field="channels" placeholder={t("Yangi manba nomi...")} usedBy={(tn, id) => tn.candidates.filter((c) => c.channelId === id).length} />
        </Box>
        <Box icon={<Layers size={18} />} title={t("Vakansiya bo'limlari")} subtitle={t("Masalan: Marketing — bo'lim, Videograf — vakansiya")}>
          <ListEditor field="departments" placeholder={t("Masalan: Marketing")} usedBy={(tn, id) => tn.employees.filter((e) => e.departmentId === id).length} />
        </Box>

        <Box
          icon={<UserCog size={18} />}
          title={t("HR Menejerlar")}
          subtitle={t("Tizimga kira oladigan xodimlar")}
          action={
            <Button size="sm" onClick={() => setMgr(true)}>
              {t("+ Menejer")}
            </Button>
          }
        >
          {tenant.managers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">{t("HR menejerlar yo'q")}</p>}
          <div className="space-y-2">
            {tenant.managers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-slate-400">{displayPhone(m.phone)}</p>
                </div>
                <IconButton
                  title={t("Parolni o'zgartirish")}
                  onClick={() => {
                    const pw = prompt(t("{0} uchun yangi parol (kamida 4 belgi):", { 0: m.name }))
                    if (pw === null) return
                    if (pw.length < 4) return toast(t('Parol juda qisqa'), 'error')
                    update((tn) => (tn.managers.find((x) => x.id === m.id)!.password = pw))
                    toast(t("Parol o'zgartirildi"))
                  }}
                >
                  <KeyRound size={15} />
                </IconButton>
                <IconButton
                  tone="danger"
                  onClick={() => {
                    if (confirm(t("{0}ni o'chirasizmi? U tizimga kira olmaydi.", { 0: m.name }))) update((tn) => (tn.managers = tn.managers.filter((x) => x.id !== m.id)))
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        </Box>

        <Box icon={<ExternalLink size={18} />} title={t("Landing page havolasi")} subtitle={t("Kompaniyangiz uchun alohida vakansiyalar sahifasi")}>
          <div className="space-y-2">
            {[{ id: '', name: t("Barcha vakansiyalar") }].map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{b.name}</p>
                  <p className="truncate text-xs text-slate-400">{landing(b.id)}</p>
                </div>
                <IconButton onClick={() => window.open(landing(b.id), '_blank')}>
                  <ExternalLink size={15} />
                </IconButton>
                <IconButton onClick={() => copy(landing(b.id))}>
                  <Copy size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        </Box>

        <Box icon={<KeyRound size={18} />} title={t("Profil paroli")} subtitle={t("Login: {0}", { 0: displayPhone(client.phone) })}>
          <ProfilePassword />
        </Box>
      </div>
      {mgr && <ManagerModal onClose={() => setMgr(false)} />}
    </div>
  )
}
