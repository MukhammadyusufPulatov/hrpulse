import { useEffect, useState } from 'react'
import { Button, ColorPicker, Input, Modal, PasswordInput, PhoneInput, Select, toast } from '../../components/ui'
import { defaultTenant, getDb, subEnd, updateDb, useDb } from '../../lib/db'
import type { Client } from '../../lib/types'
import { addDays, durationLabel, fmtDate, money, uid } from '../../lib/utils'
import { t } from '../../lib/i18n'

/**
 * Telefon raqam boshqa foydalanuvchida bandmi?
 * allowClients — mijoz profili uchun: boshqa mijozning raqami bo'lsa band emas (yangi profil uning filiali bo'ladi).
 */
export function phoneTaken(phone: string, exceptClientId?: string, allowClients = false) {
  const db = getDb()
  if (db.superAdmin.phone === phone) return true
  if (!allowClients && db.clients.some((c) => c.phone === phone && c.id !== exceptClientId)) return true
  return Object.values(db.tenants).some((tn) => tn.managers.some((m) => m.phone === phone))
}

/** Shu raqamdagi mavjud profil (filial guruhi) */
export function groupOwner(phone: string, exceptClientId?: string) {
  return getDb().clients.find((c) => c.phone === phone && c.id !== exceptClientId)
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

  // Raqam boshqa profilga tegishli bo'lsa — yangi profil uning filiali, parol umumiy
  const owner = f.phone.length === 9 ? groupOwner(f.phone, client?.id) : undefined

  const save = () => {
    const e: Record<string, string> = {}
    const sub = f.subdomain.trim().toLowerCase()
    if (!f.companyName.trim()) e.companyName = t('Kompaniya nomini kiriting')
    if (!f.contactName.trim()) e.contactName = t("Mas'ul shaxsni kiriting")
    if (f.phone.length !== 9) e.phone = t("Telefon raqam to'liq emas")
    else if (phoneTaken(f.phone, client?.id, true)) e.phone = t('Bu raqam allaqachon ishlatilgan')
    if (!SUB_RE.test(sub)) e.subdomain = t('Faqat lotin harflari, raqam va "-" (masalan: registon)')
    else if (db.clients.some((c) => c.subdomain === sub && c.id !== client?.id)) e.subdomain = t('Bu subdomain band')
    if (f.instagram.trim() && !/^https?:\/\//.test(f.instagram.trim())) e.instagram = t('Link https:// bilan boshlanishi kerak')
    if (!client) {
      if (!f.tariffId) e.tariffId = t('Tarif tanlang (Sozlamalar → Tariflar)')
      if (!owner && f.password.length < 4) e.password = t('Kamida 4 ta belgi')
    }
    setErr(e)
    if (Object.keys(e).length) return

    if (client) {
      updateDb((d) => {
        const c = d.clients.find((x) => x.id === client.id)!
        Object.assign(c, { companyName: f.companyName.trim(), contactName: f.contactName.trim(), phone: f.phone, subdomain: sub, primaryColor: f.primaryColor, instagram: f.instagram.trim() || undefined })
        if (owner) c.password = owner.password
      })
      toast(t("Mijoz ma'lumotlari saqlandi"))
    } else {
      const tn = db.tariffs.find((x) => x.id === f.tariffId)!
      const now = new Date().toISOString()
      const id = uid()
      updateDb((d) => {
        d.clients.push({
          id,
          companyName: f.companyName.trim(),
          contactName: f.contactName.trim(),
          phone: f.phone,
          password: owner ? owner.password : f.password,
          subdomain: sub,
          primaryColor: f.primaryColor,
          instagram: f.instagram.trim() || undefined,
          createdAt: now,
          subscriptions: [{ id: uid(), tariffId: tn.id, tariffName: tn.name, price: tn.price, start: now, end: addDays(now, tn.durationDays) }],
        })
        d.tenants[id] = defaultTenant()
      })
      toast(t("Mijoz qo'shildi"))
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? t("Mijozni tahrirlash") : t("Yangi mijoz qo'shish")}
      subtitle={client ? undefined : t("Mijoz shu telefon raqam va parol orqali o'z admin profiliga kiradi")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button onClick={save}>{client ? t("Saqlash") : t("Qo'shish")}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t("Kompaniya nomi")} value={f.companyName} onChange={(e) => set('companyName')(e.target.value)} error={err.companyName} placeholder={t("Masalan: Registon o'quv markazi")} className="sm:col-span-2" />
        <Input label={t("Mas'ul shaxsning ism-familiyasi")} value={f.contactName} onChange={(e) => set('contactName')(e.target.value)} error={err.contactName} placeholder={t("Ism Familiya")} />
        <div>
          <PhoneInput label={t("Telefon raqami")} value={f.phone} onChange={set('phone')} error={err.phone} />
          {owner && <p className="mt-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">{t("Bu raqam «{0}» profiliga tegishli — bu profil uning filiali bo'ladi, parol umumiy.", { 0: owner.companyName })}</p>}
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">{t("Subdomain uchun nom")}</span>
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
          label={t("Instagram sahifasi linki")}
          value={f.instagram}
          onChange={(e) => set('instagram')(e.target.value)}
          error={err.instagram}
          placeholder="https://instagram.com/kompaniya"
          hint={t("Ariza yuborgan nomzodga 'Instagramda kuzatib boring' tugmasi chiqadi")}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <ColorPicker label={t("Primary rang")} value={f.primaryColor} onChange={set('primaryColor')} />
        </div>
        {!client && (
          <>
            <Select
              label={t("Tarif")}
              value={f.tariffId}
              onChange={(e) => set('tariffId')(e.target.value)}
              error={err.tariffId}
              placeholder={t("Tanlang")}
              options={db.tariffs.map((tn) => ({ value: tn.id, label: `${tn.name} — ${money(tn.price)} / ${durationLabel(tn.durationDays)}` }))}
            />
            {owner ? (
              <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">{t("Parol: «{0}» bilan umumiy", { 0: owner.companyName })}</div>
            ) : (
            <PasswordInput label={t("Parol")} value={f.password} onChange={(e) => set('password')(e.target.value)} error={err.password} placeholder={t("Kamida 4 belgi")} autoComplete="new-password" />
            )}
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
    if (pw.length < 4) return setErr(t("Parol kamida 4 ta belgidan iborat bo'lsin"))
    if (pw !== pw2) return setErr(t('Parollar mos kelmadi'))
    updateDb((d) => {
      // Bir xil telefon raqamli barcha profillar (filiallar) uchun umumiy parol
      d.clients.filter((c) => c.phone === client!.phone).forEach((c) => (c.password = pw))
    })
    toast(t("Parol o'rnatildi"))
    onClose()
  }
  return (
    <Modal
      open={!!client}
      onClose={onClose}
      size="sm"
      title={t("Parol o'rnatish")}
      subtitle={client?.companyName}
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
        <PasswordInput label={t("Yangi parol")} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
        <PasswordInput label={t("Parolni takrorlang")} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" error={err} />
      </div>
    </Modal>
  )
}

export function RenewModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const db = useDb()
  const [tariffId, setTariffId] = useState('')
  useEffect(() => setTariffId(client?.subscriptions.at(-1)?.tariffId ?? db.tariffs[0]?.id ?? ''), [client, db.tariffs])
  if (!client) return null
  const tn = db.tariffs.find((x) => x.id === tariffId)
  const end = subEnd(client)
  const start = end && end > new Date().toISOString() ? end : new Date().toISOString()
  const save = () => {
    if (!tn) return
    updateDb((d) => {
      d.clients.find((c) => c.id === client.id)!.subscriptions.push({ id: uid(), tariffId: tn.id, tariffName: tn.name, price: tn.price, start, end: addDays(start, tn.durationDays) })
    })
    toast(t('Obuna uzaytirildi'))
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("Obunani uzaytirish")}
      subtitle={client.companyName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button onClick={save} disabled={!tn}>
            {t("Tasdiqlash")}
          </Button>
        </>
      }
    >
      <Select label={t("Tarif")} value={tariffId} onChange={(e) => setTariffId(e.target.value)} options={db.tariffs.map((x) => ({ value: x.id, label: `${x.name} — ${money(x.price)} / ${durationLabel(x.durationDays)}` }))} />
      {tn && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">{t("Boshlanish")}</span>
            <span className="font-semibold">{fmtDate(start)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">{t("Tugash")}</span>
            <span className="font-semibold">{fmtDate(addDays(start, tn.durationDays))}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">{t("Summa")}</span>
            <span className="font-bold text-slate-900">{money(tn.price)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
