import { useState } from 'react'
import { Briefcase, Copy, ExternalLink, Link2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Badge, Button, Card, Empty, IconButton, Input, Modal, PageHeader, SearchInput, Select, Textarea, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Question, QuestionType, Vacancy } from '../../lib/types'
import { appUrl, cn, copyText, uid } from '../../lib/utils'

const QTYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Matn' },
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
    const qs = questions.filter((q) => q.text.trim()).map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) }))
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
      title={vacancy ? 'Vakansiyani tahrirlash' : "Vakansiya qo'shish"}
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Filial" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))} />
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
        </div>
        <Textarea label="Imkoniyatlar (har birini yangi qatordan)" value={f.talents} onChange={(e) => setF({ ...f, talents: e.target.value })} placeholder="Nomzodga qanday imkoniyatlar beriladi..." />
        <Textarea label="Talablar (har birini yangi qatordan)" value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} placeholder="Nomzoddan nimalar talab qilinadi..." />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Anketa savollari</span>
            <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => setQuestions([...questions, { id: uid(), text: '', type: 'text', options: [], required: false }])}>
              Savol qo'shish
            </Button>
          </div>
          <p className="mb-3 text-xs text-slate-400">Ism-familiya va telefon raqam har doim so'raladi.</p>
          {questions.length === 0 && <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-400">Hozircha savollar yo'q</p>}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder={`${i + 1}. Savolni kiriting...`} value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} />
                  <select className="h-10 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" value={q.type} onChange={(e) => setQ(q.id, { type: e.target.value as QuestionType })}>
                    {QTYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <IconButton tone="danger" className="h-10 w-10" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                {(q.type === 'select' || q.type === 'multi') && (
                  <div className="mt-3 space-y-2 pl-1">
                    <p className="text-xs font-semibold text-slate-500">Variantlar</p>
                    {q.options.map((o, j) => (
                      <div key={j} className="flex gap-2">
                        <input className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand" value={o} placeholder={`Variant ${j + 1}`} onChange={(e) => setQ(q.id, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
                        <IconButton tone="danger" onClick={() => setQ(q.id, { options: q.options.filter((_, k) => k !== j) })}>
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    ))}
                    <button type="button" className="text-xs font-semibold text-brand cursor-pointer" onClick={() => setQ(q.id, { options: [...q.options, ''] })}>
                      + Variant qo'shish
                    </button>
                  </div>
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
                  <input type="checkbox" checked={q.required} onChange={(e) => setQ(q.id, { required: e.target.checked })} className="accent-[var(--brand)]" />
                  Majburiy javob
                </label>
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
  const base = appUrl(`/apply/${client.subdomain}/${vacancy.id}`)
  const copy = async (url: string) => {
    if (await copyText(url)) toast('Nusxalandi!')
  }
  return (
    <Modal open onClose={onClose} title="Link generate qilish" subtitle="Qaysi kanal uchun link kerakligini tanlang:">
      {tenant.channels.length === 0 && <p className="text-sm text-slate-500">Hech qanday kanal mavjud emas. Sozlamalardan qo'shing.</p>}
      <div className="space-y-2">
        {[...tenant.channels, { id: 'direct', name: "To'g'ridan-to'g'ri" }].map((ch) => {
          const url = `${base}/${ch.id}`
          return (
            <div key={ch.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{ch.name}</p>
                <p className="truncate text-xs text-slate-400">{url}</p>
              </div>
              <IconButton title="Ochish" onClick={() => window.open(url, '_blank')}>
                <ExternalLink size={16} />
              </IconButton>
              <Button size="sm" variant="soft" icon={<Copy size={14} />} onClick={() => copy(url)}>
                Nusxa
              </Button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export default function Vacancies() {
  const { tenant, update, inBranch } = useTenant()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ v?: Vacancy } | null>(null)
  const [link, setLink] = useState<Vacancy | null>(null)
  const list = tenant.vacancies.filter((v) => inBranch(v.branchId) && v.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Vakansiyalar"
        subtitle="E'lonlar va nomzodlar uchun formalar boshqaruvi"
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Vakansiyani qidirish..." className="w-full sm:w-64" />
            <Button onClick={() => setForm({})}>+ Vakansiya qo'shish</Button>
          </>
        }
      />
      {list.length === 0 ? (
        <Card>
          <Empty icon={<Briefcase size={26} />} title="Vakansiya topilmadi" text={q ? "Qidiruv so'roviga mos keladigan vakansiyalar mavjud emas" : undefined} action={!q && <Button onClick={() => setForm({})}>+ Vakansiya qo'shish</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const count = tenant.candidates.filter((c) => c.vacancyId === v.id).length
            return (
              <Card key={v.id} className={cn('flex flex-col p-5', !v.active && 'opacity-70')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Briefcase size={20} />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                    {v.active ? 'Aktiv' : 'Yopiq'}
                    <button
                      type="button"
                      onClick={() => update((t) => (t.vacancies.find((x) => x.id === v.id)!.active = !v.active))}
                      className={cn('relative h-5 w-9 rounded-full transition cursor-pointer', v.active ? 'bg-brand' : 'bg-slate-300')}
                    >
                      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', v.active ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                  </label>
                </div>
                <p className="mt-4 text-lg font-bold text-slate-900">{v.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{v.type === 'full_time' ? 'Full-time' : 'Part-time'}</Badge>
                  {v.departmentId && <Badge>{nameOf(tenant.departments, v.departmentId)}</Badge>}
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} /> {nameOf(tenant.branches, v.branchId)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users size={14} /> {count} ta nomzod · {v.questions.length} ta savol
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Button size="sm" className="flex-1" icon={<Link2 size={14} />} onClick={() => setLink(v)} disabled={!v.active}>
                    Link olish
                  </Button>
                  <IconButton title="Tahrirlash" onClick={() => setForm({ v })}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    title="O'chirish"
                    tone="danger"
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
