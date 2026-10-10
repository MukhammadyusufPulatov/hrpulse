import { useEffect, useState } from 'react'
import { Button, ColorPicker, Input, Modal, PasswordInput, PhoneInput, Select, toast } from '../../components/ui'
import { defaultTenant, getDb, subEnd, updateDb, useDb } from '../../lib/db'
import type { Client } from '../../lib/types'
import { addDays, durationLabel, fmtDate, money, uid } from '../../lib/utils'

/** Telefon raqam boshqa foydalanuvchida bandmi? */
export function phoneTaken(phone: string, exceptClientId?: string) {
  const db = getDb()
  if (db.superAdmin.phone === phone) return true
  if (db.clients.some((c) => c.phone === phone && c.id !== exceptClientId)) return true
  return Object.values(db.tenants).some((t) => t.managers.some((m) => m.phone === phone))
}

const SUB_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/

export function ClientFormModal({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client }) {
  const db = useDb()
  const empty = { companyName: '', contactName: '', phone: '', subdomain: '', primaryColor: '#f97316', instagram: '', tariffId: db.tariffs[0]?.id ?? '', password: '' }
  const [f, setF] = useState(empty)
  const [err, setErr] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErr({})
    setF(client ? { ...empty, ...client, instagram: client.instagram ?? '', tariffId: '', password: '' } : empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client])

  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    const sub = f.subdomain.trim().toLowerCase()
    if (!f.companyName.trim()) e.companyName = 'Kompaniya nomini kiriting'
    if (!f.contactName.trim()) e.contactName = "Mas'ul shaxsni kiriting"
    if (f.phone.length !== 9) e.phone = "Telefon raqam to'liq emas"
    else if (phoneTaken(f.phone, client?.id)) e.phone = 'Bu raqam allaqachon ishlatilgan'
    if (!SUB_RE.test(sub)) e.subdomain = 'Faqat lotin harflari, raqam va "-" (masalan: registon)'
    else if (db.clients.some((c) => c.subdomain === sub && c.id !== client?.id)) e.subdomain = 'Bu subdomain band'
    if (f.instagram.trim() && !/^https?:\/\//.test(f.instagram.trim())) e.instagram = 'Link https:// bilan boshlanishi kerak'
    if (!client) {
      if (!f.tariffId) e.tariffId = 'Tarif tanlang (Sozlamalar → Tariflar)'
      if (f.password.length < 4) e.password = 'Kamida 4 ta belgi'
    }
    setErr(e)
    if (Object.keys(e).length) return

    if (client) {
      updateDb((d) => {
        const c = d.clients.find((x) => x.id === client.id)!
        Object.assign(c, { companyName: f.companyName.trim(), contactName: f.contactName.trim(), phone: f.phone, subdomain: sub, primaryColor: f.primaryColor, instagram: f.instagram.trim() || undefined })
      })
      toast("Mijoz ma'lumotlari saqlandi")
    } else {
      const t = db.tariffs.find((x) => x.id === f.tariffId)!
      const now = new Date().toISOString()
      const id = uid()
      updateDb((d) => {
        d.clients.push({
          id,
          companyName: f.companyName.trim(),
          contactName: f.contactName.trim(),
          phone: f.phone,
          password: f.password,
          subdomain: sub,
          primaryColor: f.primaryColor,
          instagram: f.instagram.trim() || undefined,
          createdAt: now,
          subscriptions: [{ id: uid(), tariffId: t.id, tariffName: t.name, price: t.price, start: now, end: addDays(now, t.durationDays) }],
        })
        d.tenants[id] = defaultTenant()
      })
      toast("Mijoz qo'shildi")
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Mijozni tahrirlash' : "Yangi mijoz qo'shish"}
      subtitle={client ? undefined : "Mijoz shu telefon raqam va parol orqali o'z admin profiliga kiradi"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save}>{client ? 'Saqlash' : "Qo'shish"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Kompaniya nomi" value={f.companyName} onChange={(e) => set('companyName')(e.target.value)} error={err.companyName} placeholder="Masalan: Registon o'quv markazi" className="sm:col-span-2" />
        <Input label="Mas'ul shaxsning ism-familiyasi" value={f.contactName} onChange={(e) => set('contactName')(e.target.value)} error={err.contactName} placeholder="Ism Familiya" />
        <PhoneInput label="Telefon raqami" value={f.phone} onChange={set('phone')} error={err.phone} />
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Subdomain uchun nom</span>
          <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <input
              className="h-full flex-1 rounded-l-xl bg-transparent px-3.5 text-sm outline-none"
              value={f.subdomain}
              onChange={(e) => set('subdomain')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="kompaniya"
            />
            <span className="pr-3.5 text-sm font-medium text-slate-400">.hrpulse.uz</span>
          </div>
          {err.subdomain && <span className="mt-1 block text-xs text-red-500">{err.subdomain}</span>}
        </div>
        <Input
          label="Instagram sahifasi linki"
          value={f.instagram}
          onChange={(e) => set('instagram')(e.target.value)}
          error={err.instagram}
          placeholder="https://instagram.com/kompaniya"
          hint="Ariza yuborgan nomzodga 'Instagramda kuzatib boring' tugmasi chiqadi"
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <ColorPicker label="Primary rang" value={f.primaryColor} onChange={set('primaryColor')} />
        </div>
        {!client && (
          <>
            <Select
              label="Tarif"
              value={f.tariffId}
              onChange={(e) => set('tariffId')(e.target.value)}
              error={err.tariffId}
              placeholder="Tanlang"
              options={db.tariffs.map((t) => ({ value: t.id, label: `${t.name} — ${money(t.price)} / ${durationLabel(t.durationDays)}` }))}
            />
            <PasswordInput label="Parol" value={f.password} onChange={(e) => set('password')(e.target.value)} error={err.password} placeholder="Kamida 4 belgi" autoComplete="new-password" />
          </>
        )}
      </div>
    </Modal>
  )
}

export function SetPasswordModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    setPw('')
    setPw2('')
    setErr('')
  }, [client])
  const save = () => {
    if (pw.length < 4) return setErr("Parol kamida 4 ta belgidan iborat bo'lsin")
    if (pw !== pw2) return setErr('Parollar mos kelmadi')
    updateDb((d) => {
      d.clients.find((c) => c.id === client!.id)!.password = pw
    })
    toast("Parol o'rnatildi")
    onClose()
  }
  return (
    <Modal
      open={!!client}
      onClose={onClose}
      size="sm"
      title="Parol o'rnatish"
      subtitle={client?.companyName}
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
        <PasswordInput label="Yangi parol" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
        <PasswordInput label="Parolni takrorlang" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" error={err} />
      </div>
    </Modal>
  )
}

export function RenewModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const db = useDb()
  const [tariffId, setTariffId] = useState('')
  useEffect(() => setTariffId(client?.subscriptions.at(-1)?.tariffId ?? db.tariffs[0]?.id ?? ''), [client, db.tariffs])
  if (!client) return null
  const t = db.tariffs.find((x) => x.id === tariffId)
  const end = subEnd(client)
  const start = end && end > new Date().toISOString() ? end : new Date().toISOString()
  const save = () => {
    if (!t) return
    updateDb((d) => {
      d.clients.find((c) => c.id === client.id)!.subscriptions.push({ id: uid(), tariffId: t.id, tariffName: t.name, price: t.price, start, end: addDays(start, t.durationDays) })
    })
    toast('Obuna uzaytirildi')
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Obunani uzaytirish"
      subtitle={client.companyName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={!t}>
            Tasdiqlash
          </Button>
        </>
      }
    >
      <Select label="Tarif" value={tariffId} onChange={(e) => setTariffId(e.target.value)} options={db.tariffs.map((x) => ({ value: x.id, label: `${x.name} — ${money(x.price)} / ${durationLabel(x.durationDays)}` }))} />
      {t && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Boshlanish</span>
            <span className="font-semibold">{fmtDate(start)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Tugash</span>
            <span className="font-semibold">{fmtDate(addDays(start, t.durationDays))}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Summa</span>
            <span className="font-bold text-slate-900">{money(t.price)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
