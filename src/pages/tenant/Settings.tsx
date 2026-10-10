import { useState } from 'react'
import { Building, Copy, ExternalLink, KeyRound, Layers, Radio, Trash2, UserCog } from 'lucide-react'
import { Avatar, Button, Card, IconButton, Input, Modal, PageHeader, PasswordInput, PhoneInput, toast } from '../../components/ui'
import { updateDb } from '../../lib/db'
import { useTenant } from '../../lib/tenant'
import type { Named, Tenant } from '../../lib/types'
import { appUrl, copyText, displayPhone, uid } from '../../lib/utils'
import { phoneTaken } from '../super/ClientModals'

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
function ListEditor({ field, placeholder, usedBy }: { field: 'branches' | 'channels' | 'departments'; placeholder: string; usedBy: (t: Tenant, id: string) => number }) {
  const { tenant, update } = useTenant()
  const [name, setName] = useState('')
  const items: Named[] = tenant[field]
  const add = () => {
    if (!name.trim()) return
    if (items.some((i) => i.name.toLowerCase() === name.trim().toLowerCase())) return toast('Bu nom allaqachon mavjud', 'error')
    update((t) => t[field].push({ id: uid(), name: name.trim() }))
    setName('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add}>Qo'shish</Button>
      </div>
      <div className="mt-3 space-y-1.5">
        {items.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Hozircha yo'q</p>}
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pl-3 pr-1.5">
            <input
              className="flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
              defaultValue={i.name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== i.name) update((t) => (t[field].find((x) => x.id === i.id)!.name = v))
                else e.target.value = i.name
              }}
            />
            <span className="text-xs text-slate-400">{usedBy(tenant, i.id)}</span>
            <IconButton
              tone="danger"
              onClick={() => {
                if (field === 'branches' && items.length <= 1) return toast("Kamida bitta filial bo'lishi kerak", 'error')
                if (usedBy(tenant, i.id) > 0 && field === 'branches') return toast('Bu filialda nomzod yoki xodimlar bor', 'error')
                if (confirm(`"${i.name}" o'chirilsinmi?`)) update((t) => (t[field] = t[field].filter((x) => x.id !== i.id)))
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
    if (!f.name.trim()) e.name = 'Ism-familiyani kiriting'
    if (f.phone.length !== 9) e.phone = "Telefon raqam to'liq emas"
    else if (phoneTaken(f.phone)) e.phone = 'Bu raqam allaqachon ishlatilgan'
    if (f.password.length < 4) e.password = 'Kamida 4 ta belgi'
    setErr(e)
    if (Object.keys(e).length) return
    update((t) => t.managers.push({ id: uid(), name: f.name.trim(), phone: f.phone, password: f.password, createdAt: new Date().toISOString() }))
    toast("HR menejer qo'shildi")
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Menejer qo'shish"
      subtitle="Menejer shu telefon va parol bilan tizimga kiradi"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save}>Saqlash</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Ism-Familiya" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} autoFocus />
        <PhoneInput label="Telefon raqam" value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
        <PasswordInput label="Maxfiy parol" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} autoComplete="new-password" />
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
    if (f.cur !== client.password) e.cur = "Joriy parol noto'g'ri"
    if (f.pw.length < 4) e.pw = 'Kamida 4 ta belgi'
    else if (f.pw !== f.pw2) e.pw2 = 'Parollar mos kelmadi'
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.clients.find((c) => c.id === client.id)!.password = f.pw
    })
    setF({ cur: '', pw: '', pw2: '' })
    toast("Parol o'zgartirildi")
  }
  return (
    <div className="space-y-3">
      <PasswordInput label="Joriy parol" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} error={err.cur} autoComplete="current-password" />
      <PasswordInput label="Yangi parol" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} autoComplete="new-password" />
      <PasswordInput label="Takrorlang" value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} error={err.pw2} autoComplete="new-password" />
      <Button onClick={save}>Saqlash</Button>
    </div>
  )
}

export default function TenantSettings() {
  const { tenant, update, client } = useTenant()
  const [mgr, setMgr] = useState(false)
  const landing = (branchId?: string) => appUrl(`/c/${client.subdomain}${branchId ? `?branch=${branchId}` : ''}`)
  const copy = async (u: string) => (await copyText(u)) && toast('Nusxalandi!')

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Tizimni sozlash va foydalanuvchilar boshqaruvi" />
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Box icon={<Building size={18} />} title="Filiallar">
          <ListEditor field="branches" placeholder="Yangi filial nomi..." usedBy={(t, id) => t.candidates.filter((c) => c.branchId === id).length + t.employees.filter((e) => e.branchId === id).length} />
        </Box>
        <Box icon={<Radio size={18} />} title="Kanallar (Traffic)" subtitle="Nomzodlar qayerdan kelishi">
          <ListEditor field="channels" placeholder="Yangi kanal nomi..." usedBy={(t, id) => t.candidates.filter((c) => c.channelId === id).length} />
        </Box>
        <Box icon={<Layers size={18} />} title="Bo'limlar">
          <ListEditor field="departments" placeholder="Yangi bo'lim nomi..." usedBy={(t, id) => t.employees.filter((e) => e.departmentId === id).length} />
        </Box>

        <Box
          icon={<UserCog size={18} />}
          title="HR Menejerlar"
          subtitle="Tizimga kira oladigan xodimlar"
          action={
            <Button size="sm" onClick={() => setMgr(true)}>
              + Menejer
            </Button>
          }
        >
          {tenant.managers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">HR menejerlar yo'q</p>}
          <div className="space-y-2">
            {tenant.managers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-slate-400">{displayPhone(m.phone)}</p>
                </div>
                <IconButton
                  title="Parolni o'zgartirish"
                  onClick={() => {
                    const pw = prompt(`${m.name} uchun yangi parol (kamida 4 belgi):`)
                    if (pw === null) return
                    if (pw.length < 4) return toast('Parol juda qisqa', 'error')
                    update((t) => (t.managers.find((x) => x.id === m.id)!.password = pw))
                    toast("Parol o'zgartirildi")
                  }}
                >
                  <KeyRound size={15} />
                </IconButton>
                <IconButton
                  tone="danger"
                  onClick={() => {
                    if (confirm(`${m.name}ni o'chirasizmi? U tizimga kira olmaydi.`)) update((t) => (t.managers = t.managers.filter((x) => x.id !== m.id)))
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        </Box>

        <Box icon={<ExternalLink size={18} />} title="Landing Page havolalari" subtitle="Barcha aktiv vakansiyalar sahifasi">
          <div className="space-y-2">
            {[{ id: '', name: 'Barcha filiallar' }, ...tenant.branches].map((b) => (
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

        <Box icon={<KeyRound size={18} />} title="Profil paroli" subtitle={`Login: ${displayPhone(client.phone)}`}>
          <ProfilePassword />
        </Box>
      </div>
      {mgr && <ManagerModal onClose={() => setMgr(false)} />}
    </div>
  )
}
