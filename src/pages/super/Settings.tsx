import { useState } from 'react'
import { KeyRound, Pencil, Phone, Tags, Trash2 } from 'lucide-react'
import { Button, Card, Empty, IconButton, Input, Modal, PageHeader, PasswordInput, PhoneInput, Select, Table, toast } from '../../components/ui'
import { getDb, updateDb, useDb } from '../../lib/db'
import type { Tariff } from '../../lib/types'
import { displayPhone, durationLabel, money, uid } from '../../lib/utils'
import { phoneTaken } from './ClientModals'

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
    if (f.cur !== getDb().superAdmin.password) e.cur = "Joriy parol noto'g'ri"
    if (f.pw.length < 6) e.pw = "Yangi parol kamida 6 ta belgidan iborat bo'lsin"
    else if (f.pw !== f.pw2) e.pw2 = 'Parollar mos kelmadi'
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.superAdmin.password = f.pw
    })
    setF({ cur: '', pw: '', pw2: '' })
    toast("Parol o'zgartirildi")
  }
  return (
    <Section icon={<KeyRound size={20} />} title="Parolni o'zgartirish" subtitle="Super admin profili paroli">
      <div className="space-y-4">
        <PasswordInput label="Joriy parol" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} error={err.cur} autoComplete="current-password" />
        <PasswordInput label="Yangi parol" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} autoComplete="new-password" />
        <PasswordInput label="Yangi parolni takrorlang" value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} error={err.pw2} autoComplete="new-password" />
        <Button onClick={save}>Parolni saqlash</Button>
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
    if (phone.length !== 9) e.phone = "Telefon raqamni to'liq kiriting"
    else if (phone === db.superAdmin.phone) e.phone = 'Bu sizning joriy raqamingiz'
    else if (phoneTaken(phone)) e.phone = 'Bu raqam boshqa foydalanuvchida'
    if (pw !== db.superAdmin.password) e.pw = "Parol noto'g'ri"
    setErr(e)
    if (Object.keys(e).length) return
    updateDb((d) => {
      d.superAdmin.phone = phone
    })
    setPhone('')
    setPw('')
    toast("Telefon raqam o'zgartirildi")
  }
  return (
    <Section icon={<Phone size={20} />} title="Telefon raqamni o'zgartirish" subtitle={`Joriy raqam: ${displayPhone(db.superAdmin.phone)}`}>
      <div className="space-y-4">
        <PhoneInput label="Yangi telefon raqam" value={phone} onChange={setPhone} error={err.phone} />
        <PasswordInput label="Tasdiqlash uchun parol" value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} autoComplete="current-password" />
        <Button onClick={save}>Raqamni saqlash</Button>
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
    if (!name.trim()) e.name = 'Tarif nomini kiriting'
    if (!p || p < 0) e.price = "Narxni to'g'ri kiriting"
    if (!a || a < 1 || !Number.isInteger(a)) e.amount = "Muddatni to'g'ri kiriting"
    setErr(e)
    if (Object.keys(e).length) return
    const data = { name: name.trim(), price: p, durationDays: a * Number(unit) }
    updateDb((d) => {
      if (tariff) Object.assign(d.tariffs.find((t) => t.id === tariff.id)!, data)
      else d.tariffs.push({ id: uid(), ...data })
    })
    toast(tariff ? 'Tarif saqlandi' : "Tarif qo'shildi")
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={tariff ? 'Tarifni tahrirlash' : "Yangi tarif qo'shish"}
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
        <Input label="Tarif nomi" value={name} onChange={(e) => setName(e.target.value)} error={err.name} placeholder="Masalan: Biznes" autoFocus />
        <Input label="Narxi (so'm)" inputMode="numeric" value={price ? Number(price.replace(/\D/g, '')).toLocaleString('ru-RU') : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} error={err.price} placeholder="500 000" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Muddati" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} error={err.amount} />
          <Select label="Birlik" value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS} />
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
      title="Tariflar"
      subtitle="Mijozlar uchun obuna tariflari"
      action={
        <Button size="sm" onClick={() => setModal({ open: true })}>
          + Tarif qo'shish
        </Button>
      }
    >
      {db.tariffs.length === 0 ? (
        <Empty title="Tariflar yo'q" text="Mijoz qo'shishdan oldin kamida bitta tarif yarating" />
      ) : (
        <div className="-m-6">
          <Table head={['Tarif nomi', 'Narxi', 'Muddati', 'Mijozlar', '']}>
            {db.tariffs.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3.5 font-semibold text-slate-800">{t.name}</td>
                <td className="px-5 py-3.5">{money(t.price)}</td>
                <td className="px-5 py-3.5">{durationLabel(t.durationDays)}</td>
                <td className="px-5 py-3.5 text-slate-500">{usage(t.id)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Tahrirlash" onClick={() => setModal({ open: true, tariff: t })}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      title="O'chirish"
                      tone="danger"
                      onClick={() => {
                        if (!confirm(`"${t.name}" tarifini o'chirasizmi? Mavjud obunalar o'zgarmaydi.`)) return
                        updateDb((d) => {
                          d.tariffs = d.tariffs.filter((x) => x.id !== t.id)
                        })
                        toast("Tarif o'chirildi")
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
      <PageHeader title="Sozlamalar" subtitle="Profil xavfsizligi va tariflar boshqaruvi" />
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
