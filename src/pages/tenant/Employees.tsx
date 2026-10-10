import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Award, Camera, Download, FileSpreadsheet, Pencil, Phone, Plus, Trash2, Upload, User, Users } from 'lucide-react'
import { Avatar, Button, Card, Empty, IconButton, Input, Modal, PageHeader, PhoneInput, SearchInput, Select, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Employee, KeyValue, Tenant } from '../../lib/types'
import { LANGUAGES, displayPhone, downloadCSV, fileToDataUrl, fmtDate, normalizePhone, todayISO, uid } from '../../lib/utils'
import { t } from '../../lib/i18n'

function PhotoSquare({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => ref.current?.click()} className="relative cursor-pointer">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <User size={44} strokeWidth={1.5} />}
        </div>
        <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-white">
          <Camera size={17} />
        </span>
      </button>
      <span className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">{t("Xodim rasmi")}</span>
      {value && (
        <button type="button" className="mt-1 text-xs text-red-500 cursor-pointer" onClick={() => onChange(undefined)}>
          {t("O'chirish")}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onChange(await fileToDataUrl(f))
          e.target.value = ''
        }}
      />
    </div>
  )
}

function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">{t("Tillar")}</span>
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm cursor-pointer">
        {value.length ? value.map((l) => <span key={l} className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">{t(l)}</span>) : <span className="italic text-slate-400">{t("Tillarni tanlang...")}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg animate-pop">
            {LANGUAGES.map((l) => (
              <label key={l} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" className="accent-[var(--brand)]" checked={value.includes(l)} onChange={() => onChange(value.includes(l) ? value.filter((x) => x !== l) : [...value, l])} />
                {t(l)}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Xodim qo'shish / tahrirlash formasi. Onboarding'dan "Ishga olindi"ga o'tganda ham ishlatiladi. */
export function EmployeeForm({ employee, prefill, title, onClose, onSaved }: { employee?: Employee; prefill?: Partial<Employee>; title?: string; onClose: () => void; onSaved?: () => void }) {
  const { tenant, update, branch } = useTenant()
  const base = employee ?? prefill ?? {}
  const [f, setF] = useState({
    name: base.name ?? '',
    phone: base.phone ?? '',
    email: base.email ?? '',
    photo: base.photo,
    branchId: base.branchId ?? (branch !== 'all' ? branch : tenant.branches[0]?.id ?? ''),
    departmentId: base.departmentId ?? '',
    position: base.position ?? '',
    birthDate: base.birthDate ?? '',
    certificate: base.certificate ?? '',
    hiredAt: (base.hiredAt ?? todayISO()).slice(0, 10),
  })
  const [langs, setLangs] = useState<string[]>(base.languages ?? [])
  const [extra, setExtra] = useState<KeyValue[]>(base.extra ?? [])
  const [err, setErr] = useState<Record<string, string>>({})

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = t('Ism va familiyani kiriting')
    if (f.phone.length !== 9) e.phone = t("Telefon raqam to'liq emas")
    setErr(e)
    if (Object.keys(e).length) return
    const data = {
      ...f,
      name: f.name.trim(),
      email: f.email || undefined,
      departmentId: f.departmentId || undefined,
      birthDate: f.birthDate || undefined,
      certificate: f.certificate || undefined,
      hiredAt: new Date(f.hiredAt).toISOString(),
      languages: langs,
      extra: extra.filter((x) => x.label.trim() || x.value.trim()),
    }
    update((tn) => {
      if (employee) Object.assign(tn.employees.find((x) => x.id === employee.id)!, data)
      else tn.employees.push({ id: uid(), appliedAt: prefill?.appliedAt, channelId: prefill?.channelId, ...data })
    })
    toast(employee ? t("Saqlandi") : t("Xodim qo'shildi"))
    onSaved?.()
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title ?? (employee ? t("Xodimni tahrirlash") : t("Yangi xodim qo'shish"))}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button onClick={save}>{t("Saqlash")}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <PhotoSquare value={f.photo} onChange={(photo) => setF({ ...f, photo })} />
        <Input label={t("F.I.SH")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} placeholder={t("Ism va Familiya")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneInput label={t("Telefon")} value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
          <Select label={t("Bo'lim")} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} placeholder={t("Tanlang")} options={tenant.departments.map((b) => ({ value: b.id, label: b.name }))} />
          <Input label={t("Tug'ilgan sana")} type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
          <LanguagePicker value={langs} onChange={setLangs} />
          <Input label={t("Lavozim")} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} placeholder={t("Masalan: Support")} />
          <Input label={t("Sertifikat darajasi")} value={f.certificate} onChange={(e) => setF({ ...f, certificate: e.target.value })} placeholder={t("IELTS 7.5, CEFR B2...")} />
          {tenant.branches.length > 1 && <Select label={t("Filial")} value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))} />}
          <Input label={t("Ishga kirgan sana")} type="date" value={f.hiredAt} onChange={(e) => setF({ ...f, hiredAt: e.target.value })} />
          <Input label={t("Email")} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={t("email@misol.uz")} />
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("Qo'shimcha maydonlar (custom field)")}</span>
            <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => setExtra([...extra, { label: '', value: '' }])}>
              {t("Maydon qo'shish")}
            </Button>
          </div>
          {extra.length === 0 && <p className="mt-2 text-xs text-slate-400">{t("Masalan: Pasport seriyasi, Manzil, Telegram...")}</p>}
          <div className="mt-3 space-y-2">
            {extra.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className="h-10 w-2/5 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder={t("Maydon nomi")} value={x.label} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder={t("Qiymati")} value={x.value} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
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

// ---------------- Excel import ----------------
const COLS = ['F.I.SH', 'Telefon', "Bo'lim", 'Lavozim', "Tug'ilgan sana", 'Tillar', 'Sertifikat', 'Email', 'Ishga kirgan sana']

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([COLS, ['Aliyev Vali', '901234567', 'Marketing', 'SMM mutaxassis', '1998-05-21', "O'zbek, Rus", 'IELTS 7.0', 'vali@misol.uz', '2025-01-15']])
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(14, c.length + 4) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Xodimlar')
  XLSX.writeFile(wb, 'xodimlar-shablon.xlsx')
}

function toISODate(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : undefined
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return undefined
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const { update } = useTenant()
  const ref = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  const read = async (file: File) => {
    setError('')
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const valid = data.filter((r) => String(r['F.I.SH'] ?? '').trim())
      if (!valid.length) return setError(t("Faylda xodimlar topilmadi. Shablondagi ustun nomlarini o'zgartirmang."))
      setRows(valid)
      setFileName(file.name)
    } catch {
      setError(t("Faylni o'qib bo'lmadi. .xlsx yoki .csv formatidagi fayl yuklang."))
    }
  }

  const doImport = () => {
    if (!rows) return
    let added = 0
    update((tn: Tenant) => {
      const find = (list: 'departments', name: string) => {
        if (!name) return undefined
        let x = tn[list].find((d) => d.name.toLowerCase() === name.toLowerCase())
        if (!x) tn[list].push((x = { id: uid(), name }))
        return x.id
      }
      for (const r of rows) {
        const s = (k: string) => String(r[k] ?? '').trim()
        tn.employees.push({
          id: uid(),
          name: s('F.I.SH'),
          phone: normalizePhone(s('Telefon')),
          email: s('Email') || undefined,
          departmentId: find('departments', s("Bo'lim")),
          position: s('Lavozim') || undefined,
          branchId: tn.branches[0]?.id ?? '',
          birthDate: toISODate(r["Tug'ilgan sana"]),
          languages: s('Tillar').split(/[,;]/).map((x) => x.trim()).filter(Boolean),
          certificate: s('Sertifikat') || undefined,
          hiredAt: new Date(toISODate(r['Ishga kirgan sana']) ?? todayISO()).toISOString(),
          extra: [],
        })
        added++
      }
    })
    toast(t("{0} ta xodim import qilindi", { 0: added }))
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Excel orqali import")}
      subtitle={t("Xodimlarni shablon bo'yicha to'ldirib, faylni yuklang")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button disabled={!rows} onClick={doImport}>
            {t('Import qilish')} {rows ? `(${rows.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-emerald-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <FileSpreadsheet size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-900">{t("1. Shablonni yuklab oling")}</p>
            <p className="text-xs text-emerald-700">{t('Ustunlar: {0}', { 0: COLS.join(', ') })}</p>
          </div>
          <Button size="sm" className="!bg-emerald-600" icon={<Download size={14} />} onClick={downloadTemplate}>
            {t("Shablonni yuklab olish")}
          </Button>
        </div>
        <p className="text-sm font-bold text-slate-800">{t("2. To'ldirilgan faylni yuklang")}</p>
        <button type="button" onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-sm text-slate-500 hover:border-brand hover:text-brand cursor-pointer">
          <Upload size={24} />
          {rows ? (
            <span>
              <b className="text-slate-800">{fileName}</b> — {t('{0} ta xodim topildi', { 0: rows.length })}
            </span>
          ) : (
            t("Excel faylni tanlash uchun bosing (.xlsx, .csv)")
          )}
        </button>
        <input
          ref={ref}
          type="file"
          hidden
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) read(f)
            e.target.value = ''
          }}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {rows && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 text-sm">
            {rows.slice(0, 50).map((r, i) => (
              <div key={i} className="flex justify-between border-b border-slate-50 px-3 py-2 last:border-0">
                <span className="font-medium">{String(r['F.I.SH'])}</span>
                <span className="text-slate-400">{String(r["Bo'lim"] ?? '')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

const selCls = 'h-11 cursor-pointer rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand'

export default function Employees() {
  const { tenant, update, inBranch } = useTenant()
  const [q, setQ] = useState('')
  const [dep, setDep] = useState('')
  const [lang, setLang] = useState('')
  const [form, setForm] = useState<{ e?: Employee } | null>(null)
  const [imp, setImp] = useState(false)

  const all = tenant.employees.filter((e) => inBranch(e.branchId))
  const list = all.filter(
    (e) =>
      (!dep || e.departmentId === dep) &&
      (!lang || e.languages.includes(lang)) &&
      (!q || `${e.name} ${e.phone} ${e.position ?? ''} ${e.certificate ?? ''} ${e.extra.map((x) => x.value).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  )

  const exportCSV = () =>
    downloadCSV('xodimlar', [
      [t("Ism-familiya"), t("Telefon"), 'Email', t("Lavozim"), t("Bo'lim"), t("Tug'ilgan sana"), t("Tillar"), t("Sertifikat"), t("Ishga kirgan")],
      ...list.map((e) => [e.name, '+998' + e.phone, e.email, e.position, nameOf(tenant.departments, e.departmentId, ''), fmtDate(e.birthDate), e.languages.join(', '), e.certificate, fmtDate(e.hiredAt)]),
    ])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Xodimlar")}</h1>
            <span className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
              {t("Jami xodimlar")} <span className="h-3 w-px bg-brand/30" /> <span className="text-sm">{all.length}</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("Kompaniya xodimlarining yagona bazasi")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="lg" icon={<FileSpreadsheet size={17} className="text-emerald-600" />} onClick={() => setImp(true)}>
            {t("Import Excel")}
          </Button>
          <Button variant="secondary" size="lg" icon={<Download size={17} className="text-brand" />} onClick={exportCSV}>
            {t("Excel yuklab olish")}
          </Button>
          <Button size="lg" icon={<Plus size={17} />} className="shadow-lg shadow-brand/25" onClick={() => setForm({})}>
            {t("Xodim qo'shish")}
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <SearchInput value={q} onChange={setQ} placeholder={t("Qidirish...")} className="[&_input]:h-11 [&_input]:border-slate-100 [&_input]:bg-slate-50" />
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={selCls}>
            <option value="">{t("Barcha tillar")}</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {t(l)}
              </option>
            ))}
          </select>
          <select value={dep} onChange={(e) => setDep(e.target.value)} className={selCls}>
            <option value="">{t("Barcha bo'limlar")}</option>
            {tenant.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <Empty icon={<Users size={26} />} title={t("Xodimlar topilmadi")} action={<Button onClick={() => setForm({})}>{t("+ Xodim qo'shish")}</Button>} />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[2.2fr_1.3fr_1.6fr_1.4fr_90px] px-6 pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>{t("Xodim")}</span>
                <span>{t("Faoliyat")}</span>
                <span>{t("Bilim va ko'nikma")}</span>
                <span>{t("Bog'lanish")}</span>
                <span className="text-right">{t("Amal")}</span>
              </div>
              <div className="space-y-2.5">
                {list.map((e) => (
                  <div key={e.id} className="grid grid-cols-[2.2fr_1.3fr_1.6fr_1.4fr_90px] items-center rounded-2xl border border-slate-100 px-6 py-4 transition hover:border-slate-200 hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} photo={e.photo} size={48} square />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{e.name}</p>
                        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">{nameOf(tenant.departments, e.departmentId, e.position || '—')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Award size={16} className="shrink-0 text-brand" />
                      <span className="truncate">{e.certificate || '-'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.languages.length ? (
                        e.languages.map((l) => (
                          <span key={l} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                            {t('{0} tili', { 0: t(l) })}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">{t("Kiritilmagan")}</span>
                      )}
                    </div>
                    <a href={`tel:+998${e.phone}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand">
                      <Phone size={14} className="text-slate-400" /> {displayPhone(e.phone)}
                    </a>
                    <div className="flex justify-end gap-1">
                      <IconButton title={t("Tahrirlash")} onClick={() => setForm({ e })}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        title={t("O'chirish")}
                        tone="danger"
                        onClick={() => {
                          if (!confirm(t("{0}ni xodimlar ro'yxatidan o'chirasizmi?", { 0: e.name }))) return
                          update((tn) => (tn.employees = tn.employees.filter((x) => x.id !== e.id)))
                          toast(t("Xodim o'chirildi"))
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
      {form && <EmployeeForm employee={form.e} onClose={() => setForm(null)} />}
      {imp && <ImportModal onClose={() => setImp(false)} />}
    </div>
  )
}
