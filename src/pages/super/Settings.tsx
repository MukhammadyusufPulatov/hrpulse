import { useState } from 'react'
import { KeyRound, Pencil, Phone, Tags, Trash2 } from 'lucide-react'
import { Button, Card, Empty, IconButton, Input, Modal, PageHeader, PasswordInput, PhoneInput, Select, Table, toast } from '../../components/ui'
import { getDb, updateDb, useDb } from '../../lib/db'
import type { Tariff } from '../../lib/types'
import { displayPhone, durationLabel, money, uid } from '../../lib/utils'
import { phoneTaken } from './ClientModals'
import { t } from '../../lib/i18n'

function Section({ icon, title, subtitle, children, action }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  )
}

function ChangePassword() {
  const [f, setF] = useState({ cur: '', pw: '', pw2: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    if (f.cur !== getDb().superAdmin.password) e.cur = t("Joriy parol noto'g'ri")
    if (f.pw.length < 6) e.pw = t("Yangi parol kamida 6 ta belgidan iborat bo'lsin")
    else if (f.pw !== f.pw2) e.pw2 = t('Parollar mos kelmadi')
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.superAdmin.password = f.pw
    })
    setF({ cur: '', pw: '', pw2: '' })
    toast(t("Parol o'zgartirildi"))
  }
  return (
    <Section icon={<KeyRound size={20} />} title={t("Parolni o'zgartirish")} subtitle={t("Super admin profili paroli")}>
      <div className="space-y-4">
        <PasswordInput label={t("Joriy parol")} value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} error={err.cur} autoComplete="current-password" />
        <PasswordInput label={t("Yangi parol")} value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} autoComplete="new-password" />
        <PasswordInput label={t("Yangi parolni takrorlang")} value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} error={err.pw2} autoComplete="new-password" />
        <Button onClick={save}>{t("Parolni saqlash")}</Button>
      </div>
    </Section>
  )
}

function ChangePhone() {
  const db = useDb()
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    if (phone.length !== 9) e.phone = t("Telefon raqamni to'liq kiriting")
    else if (phone === db.superAdmin.phone) e.phone = t('Bu sizning joriy raqamingiz')
    else if (phoneTaken(phone)) e.phone = t('Bu raqam boshqa foydalanuvchida')
    if (pw !== db.superAdmin.password) e.pw = t("Parol noto'g'ri")
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.superAdmin.phone = phone
    })
    setPhone('')
    setPw('')
    toast(t("Telefon raqam o'zgartirildi"))
  }
  return (
    <Section icon={<Phone size={20} />} title={t("Telefon raqamni o'zgartirish")} subtitle={t("Joriy raqam: {0}", { 0: displayPhone(db.superAdmin.phone) })}>
      <div className="space-y-4">
        <PhoneInput label={t("Yangi telefon raqam")} value={phone} onChange={setPhone} error={err.phone} />
        <PasswordInput label={t("Tasdiqlash uchun parol")} value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} autoComplete="current-password" />
        <Button onClick={save}>{t("Raqamni saqlash")}</Button>
      </div>
    </Section>
  )
}

const UNITS = [
  { value: '1', label: 'kun' },
  { value: '30', label: 'oy' },
  { value: '365', label: 'yil' },
]

function TariffModal({ open, tariff, onClose }: { open: boolean; tariff?: Tariff; onClose: () => void }) {
  const initUnit = tariff ? (tariff.durationDays % 365 === 0 ? 365 : tariff.durationDays % 30 === 0 ? 30 : 1) : 30
  const [name, setName] = useState(tariff?.name ?? '')
  const [price, setPrice] = useState(tariff ? String(tariff.price) : '')
  const [amount, setAmount] = useState(tariff ? String(tariff.durationDays / initUnit) : '1')
  const [unit, setUnit] = useState(String(initUnit))
  const [err, setErr] = useState<Record<string, string>>({})
  const save = () => {
    const e: Record<string, string> = {}
    const p = Number(price.replace(/\s/g, ''))
    const a = Number(amount)
    if (!name.trim()) e.name = t('Tarif nomini kiriting')
    if (!p || p < 0) e.price = t("Narxni to'g'ri kiriting")
    if (!a || a < 1 || !Number.isInteger(a)) e.amount = t("Muddatni to'g'ri kiriting")
    setErr(e)
    if (Object.keys(e).length) return
    const data = { name: name.trim(), price: p, durationDays: a * Number(unit) }
    updateDb((d) => {
      if (tariff) Object.assign(d.tariffs.find((tn) => tn.id === tariff.id)!, data)
      else d.tariffs.push({ id: uid(), ...data })
    })
    toast(tariff ? t("Tarif saqlandi") : t("Tarif qo'shildi"))
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={tariff ? t("Tarifni tahrirlash") : t("Yangi tarif qo'shish")}
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
        <Input label={t("Tarif nomi")} value={name} onChange={(e) => setName(e.target.value)} error={err.name} placeholder={t("Masalan: Biznes")} autoFocus />
        <Input label={t("Narxi (so'm)")} inputMode="numeric" value={price ? Number(price.replace(/\D/g, '')).toLocaleString('ru-RU') : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} error={err.price} placeholder="500 000" />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("Muddati")} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} error={err.amount} />
          <Select label={t("Birlik")} value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS.map((u) => ({ ...u, label: t(u.label) }))} />
        </div>
      </div>
    </Modal>
  )
}

function Tariffs() {
  const db = useDb()
  const [modal, setModal] = useState<{ open: boolean; tariff?: Tariff }>({ open: false })
  const usage = (id: string) => db.clients.filter((c) => c.subscriptions.at(-1)?.tariffId === id).length
  return (
    <Section
      icon={<Tags size={20} />}
      title={t("Tariflar")}
      subtitle={t("Mijozlar uchun obuna tariflari")}
      action={
        <Button size="sm" onClick={() => setModal({ open: true })}>
          {t("+ Tarif qo'shish")}
        </Button>
      }
    >
      {db.tariffs.length === 0 ? (
        <Empty title={t("Tariflar yo'q")} text={t("Mijoz qo'shishdan oldin kamida bitta tarif yarating")} />
      ) : (
        <div className="-m-6">
          <Table head={[t("Tarif nomi"), t("Narxi"), t("Muddati"), t("Mijozlar"), '']}>
            {db.tariffs.map((tn) => (
              <tr key={tn.id}>
                <td className="px-5 py-3.5 font-semibold text-slate-800">{tn.name}</td>
                <td className="px-5 py-3.5">{money(tn.price)}</td>
                <td className="px-5 py-3.5">{durationLabel(tn.durationDays)}</td>
                <td className="px-5 py-3.5 text-slate-500">{usage(tn.id)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <IconButton title={t("Tahrirlash")} onClick={() => setModal({ open: true, tariff: tn })}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      title={t("O'chirish")}
                      tone="danger"
                      onClick={() => {
                        if (!confirm(t("\"{0}\" tarifini o'chirasizmi? Mavjud obunalar o'zgarmaydi.", { 0: tn.name }))) return
                        updateDb((d) => {
                          d.tariffs = d.tariffs.filter((x) => x.id !== tn.id)
                        })
                        toast(t("Tarif o'chirildi"))
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
      {modal.open && <TariffModal open tariff={modal.tariff} onClose={() => setModal({ open: false })} />}
    </Section>
  )
}

export default function SuperSettings() {
  return (
    <div>
      <PageHeader title={t("Sozlamalar")} subtitle={t("Profil xavfsizligi va tariflar boshqaruvi")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChangePassword />
        <ChangePhone />
        <div className="xl:col-span-2">
          <Tariffs />
        </div>
      </div>
    </div>
  )
}
