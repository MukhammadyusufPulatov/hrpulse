import { useState } from 'react'
import { Download, Eye, Pencil, Phone, Trash2, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, Empty, IconButton, Input, Modal, PageHeader, PhoneInput, PhotoInput, SearchInput, Select, Table, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Employee, KeyValue } from '../../lib/types'
import { LANGUAGES, cn, displayPhone, downloadCSV, fmtDate, todayISO, uid } from '../../lib/utils'

function EmployeeForm({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { tenant, update, branch } = useTenant()
  const [f, setF] = useState({
    name: employee?.name ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    photo: employee?.photo,
    branchId: employee?.branchId ?? (branch !== 'all' ? branch : tenant.branches[0]?.id ?? ''),
    departmentId: employee?.departmentId ?? '',
    position: employee?.position ?? '',
    birthDate: employee?.birthDate ?? '',
    certificate: employee?.certificate ?? '',
    hiredAt: (employee?.hiredAt ?? todayISO()).slice(0, 10),
  })
  const [langs, setLangs] = useState<string[]>(employee?.languages ?? [])
  const [extra, setExtra] = useState<KeyValue[]>(employee?.extra ?? [])
  const [err, setErr] = useState<Record<string, string>>({})

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Ism va familiyani kiriting'
    if (f.phone.length !== 9) e.phone = "Telefon raqam to'liq emas"
    setErr(e)
    if (Object.keys(e).length) return
    const data = {
      ...f,
      name: f.name.trim(),
      departmentId: f.departmentId || undefined,
      birthDate: f.birthDate || undefined,
      hiredAt: new Date(f.hiredAt).toISOString(),
      languages: langs,
      extra: extra.filter((x) => x.label.trim() || x.value.trim()),
    }
    update((t) => {
      if (employee) Object.assign(t.employees.find((x) => x.id === employee.id)!, data)
      else t.employees.push({ id: uid(), ...data })
    })
    toast(employee ? 'Saqlandi' : "Xodim qo'shildi")
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={employee ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save}>Saqlash</Button>
        </>
      }
    >
      <div className="space-y-5">
        <PhotoInput value={f.photo} name={f.name} onChange={(photo) => setF({ ...f, photo })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Ism va Familiya" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
          <PhoneInput label="Telefon raqami" value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
          <Input label="Pochta manzili" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input label="Lavozim" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />
          <Select label="Filial" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))} />
          <Select label="Bo'lim" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} placeholder="Tanlang" options={tenant.departments.map((b) => ({ value: b.id, label: b.name }))} />
          <Input label="Tug'ilgan sana" type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
          <Input label="Ishga kirgan sana" type="date" value={f.hiredAt} onChange={(e) => setF({ ...f, hiredAt: e.target.value })} />
          <Input label="Sertifikat darajasi" value={f.certificate} onChange={(e) => setF({ ...f, certificate: e.target.value })} placeholder="IELTS 7.5, va h.k." className="sm:col-span-2" />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Tillar</span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button key={l} type="button" onClick={() => setLangs(langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l])} className={cn('rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer', langs.includes(l) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-500')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Qo'shimcha ma'lumotlar</span>
            <Button size="sm" variant="ghost" onClick={() => setExtra([...extra, { label: '', value: '' }])}>
              + Qo'shish
            </Button>
          </div>
          <div className="space-y-2">
            {extra.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className="h-10 w-2/5 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder="Sarlavha" value={x.label} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder="Qiymat" value={x.value} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
                <IconButton tone="danger" className="h-10 w-10" onClick={() => setExtra(extra.filter((_, j) => j !== i))}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EmployeeView({ e, onClose }: { e: Employee; onClose: () => void }) {
  const { tenant } = useTenant()
  const rows: [string, React.ReactNode][] = [
    ['Telefon raqami', displayPhone(e.phone)],
    ['Pochta manzili', e.email || 'Kiritilmagan'],
    ['Filial', nameOf(tenant.branches, e.branchId)],
    ["Bo'lim", nameOf(tenant.departments, e.departmentId)],
    ["Tug'ilgan kuni", fmtDate(e.birthDate)],
    ['Ishga kirgan', fmtDate(e.hiredAt)],
    ['Bilgan tillari', e.languages.join(', ') || 'Kiritilmagan'],
    ['Sertifikat', e.certificate || 'Kiritilmagan'],
    ...e.extra.map((x) => [x.label, x.value] as [string, string]),
  ]
  return (
    <Modal open onClose={onClose} title="Xodim ma'lumotlari">
      <div className="flex items-center gap-4">
        <Avatar name={e.name} photo={e.photo} size={64} />
        <div>
          <p className="text-lg font-bold">{e.name}</p>
          <p className="text-sm text-slate-500">{e.position || '—'}</p>
        </div>
      </div>
      <div className="mt-5 divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
            <span className="text-slate-400">{k}</span>
            <span className="text-right font-medium text-slate-700">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default function Employees() {
  const { tenant, update, inBranch } = useTenant()
  const [q, setQ] = useState('')
  const [dep, setDep] = useState('')
  const [form, setForm] = useState<{ e?: Employee } | null>(null)
  const [view, setView] = useState<Employee | null>(null)

  const list = tenant.employees.filter((e) => inBranch(e.branchId) && (!dep || e.departmentId === dep) && (!q || `${e.name} ${e.phone} ${e.position ?? ''}`.toLowerCase().includes(q.toLowerCase())))

  const exportCSV = () =>
    downloadCSV('xodimlar', [
      ['Ism-familiya', 'Telefon', 'Email', 'Lavozim', "Bo'lim", 'Filial', "Tug'ilgan sana", 'Tillar', 'Sertifikat', 'Ishga kirgan'],
      ...list.map((e) => [e.name, '+998' + e.phone, e.email, e.position, nameOf(tenant.departments, e.departmentId, ''), nameOf(tenant.branches, e.branchId, ''), fmtDate(e.birthDate), e.languages.join(', '), e.certificate, fmtDate(e.hiredAt)]),
    ])

  return (
    <div>
      <PageHeader
        title="Jami xodimlar"
        subtitle="Kompaniya xodimlarining yagona bazasi"
        actions={
          <>
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportCSV}>
              Excel yuklab olish
            </Button>
            <Button onClick={() => setForm({})}>+ Xodim qo'shish</Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Qidirish..." className="sm:w-72" />
          <select value={dep} onChange={(e) => setDep(e.target.value)} className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand">
            <option value="">Barcha bo'limlar</option>
            {tenant.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400 sm:ml-auto">
            Jami: <b className="text-slate-700">{list.length}</b>
          </span>
        </div>
        {list.length === 0 ? (
          <Empty icon={<Users size={26} />} title="Xodimlar topilmadi" action={<Button onClick={() => setForm({})}>+ Xodim qo'shish</Button>} />
        ) : (
          <Table head={['Xodim', 'Faoliyat', "Bilim va Ko'nikma", "Bog'lanish", 'Amal']}>
            {list.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={e.name} photo={e.photo} size={38} />
                    <div>
                      <p className="font-semibold text-slate-800">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.position || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-700">{nameOf(tenant.departments, e.departmentId)}</p>
                  <p className="text-xs text-slate-400">
                    {nameOf(tenant.branches, e.branchId)} · {fmtDate(e.hiredAt)} dan
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {e.languages.map((l) => (
                      <Badge key={l}>{l}</Badge>
                    ))}
                    {e.certificate && <Badge tone="brand">{e.certificate}</Badge>}
                    {!e.languages.length && !e.certificate && <span className="text-xs text-slate-400">Kiritilmagan</span>}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <a href={`tel:+998${e.phone}`} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-brand">
                    <Phone size={14} /> {displayPhone(e.phone)}
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1">
                    <IconButton title="Ko'rish" onClick={() => setView(e)}>
                      <Eye size={16} />
                    </IconButton>
                    <IconButton title="Tahrirlash" onClick={() => setForm({ e })}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      title="O'chirish"
                      tone="danger"
                      onClick={() => {
                        if (!confirm(`${e.name}ni xodimlar ro'yxatidan o'chirasizmi?`)) return
                        update((t) => (t.employees = t.employees.filter((x) => x.id !== e.id)))
                        toast("Xodim o'chirildi")
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {form && <EmployeeForm employee={form.e} onClose={() => setForm(null)} />}
      {view && <EmployeeView e={view} onClose={() => setView(null)} />}
    </div>
  )
}
