import { useState } from 'react'
import { Briefcase, Check, Copy, ExternalLink, Link2, MapPin, Pencil, Plus, PlusCircle, Trash2, Users, X } from 'lucide-react'
import { Button, Card, Empty, IconButton, Input, Modal, PageHeader, SearchInput, Select, Tabs, Textarea, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Question, QuestionType, Vacancy } from '../../lib/types'
import { appUrl, cn, copyText, uid } from '../../lib/utils'

export const QTYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Matn' },
  { value: 'phone', label: 'Telefon raqami' },
  { value: 'date', label: 'Sana' },
  { value: 'photo', label: 'Rasm (Photo)' },
  { value: 'file', label: 'Fayl (Resume)' },
  { value: 'select', label: 'Tanlov (Dropdown)' },
  { value: 'multi', label: "Ko'p tanlovli" },
]

function VacancyForm({ vacancy, onClose }: { vacancy?: Vacancy; onClose: () => void }) {
  const { tenant, update, branch } = useTenant()
  const [f, setF] = useState({
    title: vacancy?.title ?? '',
    branchId: vacancy?.branchId ?? (branch !== 'all' ? branch : tenant.branches[0]?.id ?? ''),
    departmentId: vacancy?.departmentId ?? '',
    type: vacancy?.type ?? ('full_time' as Vacancy['type']),
    talents: vacancy?.talents ?? '',
    requirements: vacancy?.requirements ?? '',
  })
  const [questions, setQuestions] = useState<Question[]>(vacancy?.questions ?? [])
  const [err, setErr] = useState('')
  const setQ = (id: string, patch: Partial<Question>) => setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const save = () => {
    if (!f.title.trim()) return setErr('Vakansiya nomini kiriting')
    const empty = questions.find((q) => q.text.trim() && (q.type === 'select' || q.type === 'multi') && !q.options.some((o) => o.trim()))
    if (empty) return toast(`"${empty.text}" savoliga variantlar qo'shing`, 'error')
    const qs = questions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }))
    update((t) => {
      const data = { ...f, title: f.title.trim(), departmentId: f.departmentId || undefined, questions: qs }
      if (vacancy) Object.assign(t.vacancies.find((v) => v.id === vacancy.id)!, data)
      else t.vacancies.unshift({ id: uid(), ...data, active: true, createdAt: new Date().toISOString() })
    })
    toast(vacancy ? 'Vakansiya saqlandi' : "Vakansiya qo'shildi")
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={vacancy ? 'Vakansiyani tahrirlash' : 'Yangi vakansiya'}
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
        <Input label="Vakansiya nomi" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err} placeholder="Masalan: Ingliz tili muallimi" autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Bo'lim" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} placeholder="Bo'limni tanlang..." options={tenant.departments.map((b) => ({ value: b.id, label: b.name }))} />
          <Select
            label="Ish turi"
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value as Vacancy['type'] })}
            options={[
              { value: 'full_time', label: 'Full-time' },
              { value: 'part_time', label: 'Part-time' },
            ]}
          />
          {tenant.branches.length > 1 && <Select label="Filial" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))} />}
        </div>
        {tenant.departments.length === 0 && <p className="-mt-2 text-xs text-slate-400">Bo'limlarni Sozlamalar bo'limida qo'shishingiz mumkin (masalan: Marketing).</p>}
        <Textarea label="Imkoniyatlar (kompaniya beradigan imkoniyatlar)" value={f.talents} onChange={(e) => setF({ ...f, talents: e.target.value })} placeholder={'Har birini yangi qatordan yozing:\nRaqobatbardosh maosh\nMalaka oshirish kurslari'} className="[&_textarea]:min-h-[120px]" />
        <Textarea label="Talablar" value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} placeholder={'Har birini yangi qatordan yozing:\n2 yillik tajriba\nIELTS 7.0+'} className="[&_textarea]:min-h-[120px]" />

        <div className="pt-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Nomzodga beriladigan savollar</span>
            <button type="button" className="flex items-center gap-1.5 text-sm font-bold text-brand cursor-pointer" onClick={() => setQuestions([...questions, { id: uid(), text: '', type: 'text', options: [], required: true }])}>
              <PlusCircle size={16} /> Savol qo'shish
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-400">Ism-familiya va telefon raqam har doim so'raladi. Qolgan savollarni o'zingiz qo'shasiz.</p>
          {questions.length === 0 && <p className="rounded-2xl bg-slate-50 py-6 text-center text-sm text-slate-400">Hozircha savollar yo'q</p>}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="relative rounded-2xl bg-slate-50 p-4">
                <button type="button" className="absolute right-3 top-3 text-slate-300 hover:text-red-500 cursor-pointer" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))} aria-label="O'chirish">
                  <X size={16} />
                </button>
                <div className="flex flex-wrap items-center gap-3 pr-6">
                  <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                  <select className="h-9 cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-brand" value={q.type} onChange={(e) => setQ(q.id, { type: e.target.value as QuestionType })}>
                    {QTYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <input type="checkbox" checked={q.required} onChange={(e) => setQ(q.id, { required: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
                    Majburiy javob
                  </label>
                </div>
                <input className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-brand" placeholder="Savolni kiriting..." value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} />
                {(q.type === 'select' || q.type === 'multi') && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Variantlar</p>
                    {q.options.map((o, j) => (
                      <div key={j} className="flex gap-2">
                        <input className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand" value={o} placeholder={`Variant ${j + 1}`} onChange={(e) => setQ(q.id, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
                        <IconButton tone="danger" onClick={() => setQ(q.id, { options: q.options.filter((_, k) => k !== j) })}>
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    ))}
                    <button type="button" className="text-xs font-bold text-brand cursor-pointer" onClick={() => setQ(q.id, { options: [...q.options, ''] })}>
                      + Variant qo'shish
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function LinkModal({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  const { tenant, client } = useTenant()
  const [picked, setPicked] = useState<string | null>(null)
  const urlFor = (chId: string) => appUrl(`/apply/${client.subdomain}/${vacancy.id}/${chId}`)
  const pick = async (chId: string) => {
    setPicked(chId)
    if (await copyText(urlFor(chId))) toast('Link nusxalandi!')
  }
  const channels = [...tenant.channels, { id: 'direct', name: "To'g'ridan-to'g'ri (manbasiz)" }]
  return (
    <Modal open onClose={onClose} title="Link olish" subtitle={`"${vacancy.title}" — qaysi manba uchun link kerak?`}>
      {tenant.channels.length === 0 && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Manbalar qo'shilmagan. Sozlamalar bo'limidan Instagram, Telegram kabi manbalarni qo'shing.</p>}
      <div className="space-y-2">
        {channels.map((ch) => {
          const active = picked === ch.id
          return (
            <div key={ch.id} className={cn('rounded-2xl border transition', active ? 'border-brand bg-brand/5' : 'border-slate-200')}>
              <button onClick={() => pick(ch.id)} className="flex w-full items-center gap-3 p-3.5 text-left cursor-pointer">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500')}>{active ? <Check size={18} /> : <Link2 size={18} />}</span>
                <span className="flex-1 font-semibold text-slate-800">{ch.name}</span>
                <span className="text-xs font-semibold text-brand">{active ? 'Nusxalandi' : 'Link yaratish'}</span>
              </button>
              {active && (
                <div className="flex items-center gap-2 border-t border-brand/20 px-3.5 py-3">
                  <input readOnly value={urlFor(ch.id)} className="h-9 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none" onFocus={(e) => e.target.select()} />
                  <IconButton title="Nusxalash" onClick={() => pick(ch.id)}>
                    <Copy size={15} />
                  </IconButton>
                  <IconButton title="Ochish" onClick={() => window.open(urlFor(ch.id), '_blank')}>
                    <ExternalLink size={15} />
                  </IconButton>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn('flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer', on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}
      title={on ? "Noaktiv qilish" : 'Aktiv qilish'}
    >
      {on ? 'Aktiv' : 'Aktiv emas'}
      <span className={cn('relative h-5 w-9 rounded-full transition', on ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export default function Vacancies() {
  const { tenant, update, inBranch } = useTenant()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'active' | 'inactive'>('all')
  const [form, setForm] = useState<{ v?: Vacancy } | null>(null)
  const [link, setLink] = useState<Vacancy | null>(null)
  const scoped = tenant.vacancies.filter((v) => inBranch(v.branchId))
  const list = scoped.filter((v) => (tab === 'all' || (tab === 'active') === v.active) && v.title.toLowerCase().includes(q.toLowerCase()))
  const firstLine = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean).join('; ')

  return (
    <div>
      <PageHeader
        title="Vakansiyalar"
        subtitle="E'lonlar va nomzodlar uchun formalar boshqaruvi"
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Vakansiyani qidirish..." className="w-full sm:w-72 [&_input]:h-11" />
            <Button size="lg" icon={<Plus size={17} />} className="shadow-lg shadow-brand/25" onClick={() => setForm({})}>
              Vakansiya qo'shish
            </Button>
          </>
        }
      />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: `Barchasi (${scoped.length})` },
            { value: 'active', label: `Aktiv (${scoped.filter((v) => v.active).length})` },
            { value: 'inactive', label: `Aktiv emas (${scoped.filter((v) => !v.active).length})` },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <Card className="rounded-3xl">
          <Empty icon={<Briefcase size={26} />} title="Vakansiya topilmadi" text={q ? "Qidiruv so'roviga mos vakansiya yo'q" : undefined} action={!q && <Button onClick={() => setForm({})}>+ Vakansiya qo'shish</Button>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((v) => {
            const count = tenant.candidates.filter((c) => c.vacancyId === v.id).length
            return (
              <Card key={v.id} className={cn('flex flex-col gap-5 rounded-3xl p-5 transition lg:flex-row lg:items-center sm:p-6', !v.active && 'bg-slate-50/60')}>
                <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', v.active ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-400')}>
                  <Briefcase size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn('text-xl font-bold tracking-tight', v.active ? 'text-slate-900' : 'text-slate-500')}>{v.title}</h3>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{v.type === 'full_time' ? 'Full-time' : 'Part-time'}</span>
                    {v.departmentId && <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">{nameOf(tenant.departments, v.departmentId)}</span>}
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">{firstLine(v.requirements) || firstLine(v.talents) || "Tavsif qo'shilmagan"}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                    {tenant.branches.length > 1 && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {nameOf(tenant.branches, v.branchId)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {count} ta nomzod
                    </span>
                    <span>{v.questions.length} ta savol</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Toggle on={v.active} onChange={() => update((t) => (t.vacancies.find((x) => x.id === v.id)!.active = !v.active))} />
                  <Button variant="secondary" icon={<Link2 size={16} />} onClick={() => setLink(v)} disabled={!v.active}>
                    Link olish
                  </Button>
                  <IconButton title="Link" className="h-10 w-10 bg-slate-50" onClick={() => v.active && setLink(v)}>
                    <Link2 size={17} />
                  </IconButton>
                  <IconButton title="Tahrirlash" className="h-10 w-10 bg-slate-50" onClick={() => setForm({ v })}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    title="O'chirish"
                    tone="danger"
                    className="h-10 w-10 bg-red-50 text-red-400"
                    onClick={() => {
                      if (confirm(`"${v.title}" vakansiyasini o'chirasizmi?`)) update((t) => (t.vacancies = t.vacancies.filter((x) => x.id !== v.id)))
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {form && <VacancyForm vacancy={form.v} onClose={() => setForm(null)} />}
      {link && <LinkModal vacancy={link} onClose={() => setLink(null)} />}
    </div>
  )
}
