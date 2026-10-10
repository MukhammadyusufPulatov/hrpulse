import { useMemo, useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Download, FileText, MessageSquare, MoreHorizontal, Pencil, Phone, Plus, Trash2, UserCheck } from 'lucide-react'
import { Avatar, Badge, Button, ColorPicker, Empty, IconButton, Input, Modal, PageHeader, PhoneInput, PhotoInput, SearchInput, Select, Textarea, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Candidate, KeyValue, Stage } from '../../lib/types'
import { LANGUAGES, cn, displayPhone, fmtDate, fmtDateTime, timeAgo, todayISO, uid } from '../../lib/utils'

type Pipe = 'recruiting' | 'onboarding'

// ------------------------------------------------------------------
// Bosqich (etap) qo'shish / tahrirlash
// ------------------------------------------------------------------
function StageModal({ pipe, stage, onClose }: { pipe: Pipe; stage?: Stage; onClose: () => void }) {
  const { update } = useTenant()
  const [name, setName] = useState(stage?.name ?? '')
  const [description, setDescription] = useState(stage?.description ?? '')
  const [color, setColor] = useState(stage?.color ?? '#3b82f6')
  const [toOnb, setToOnb] = useState(!!stage?.toOnboarding)
  const save = () => {
    if (!name.trim()) return
    update((t) => {
      const list = pipe === 'recruiting' ? t.stages : t.onboardingSteps
      if (stage) Object.assign(list.find((s) => s.id === stage.id)!, { name: name.trim(), description, color, toOnboarding: toOnb || undefined })
      else list.push({ id: uid(), name: name.trim(), description, color, toOnboarding: toOnb || undefined })
    })
    toast(stage ? 'Saqlandi' : "Qo'shildi")
    onClose()
  }
  const label = pipe === 'recruiting' ? 'Etap' : 'Qadam'
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={stage ? `${label}ni tahrirlash` : `${label} qo'shish`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${label} nomi`} value={name} onChange={(e) => setName(e.target.value)} placeholder={pipe === 'recruiting' ? 'Masalan: 2-suhbat' : 'Masalan: Mentor biriktirish'} autoFocus />
        <Textarea label="Izoh" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bu bosqichda nomzodlar qanday saralanadi?" />
        <ColorPicker label="Rang tanlang" value={color} onChange={setColor} />
        {pipe === 'recruiting' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <input type="checkbox" checked={toOnb} onChange={(e) => setToOnb(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
            <span>
              <b className="block text-slate-700">Onboardingga yo'naltirish</b>
              <span className="text-slate-500">Shu bosqichga o'tkazilgan nomzod avtomatik Onboarding bo'limiga o'tadi</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Nomzod qo'shish / tahrirlash
// ------------------------------------------------------------------
export function CandidateFormModal({ pipe, candidate, defaultStage, onClose }: { pipe: Pipe; candidate?: Candidate; defaultStage?: string; onClose: () => void }) {
  const { tenant, update, branch, meName, notify, isAdmin } = useTenant()
  const stages = pipe === 'recruiting' ? tenant.stages : tenant.onboardingSteps
  const [f, setF] = useState({
    name: candidate?.name ?? '',
    phone: candidate?.phone ?? '',
    email: candidate?.email ?? '',
    photo: candidate?.photo,
    branchId: candidate?.branchId ?? (branch !== 'all' ? branch : tenant.branches[0]?.id ?? ''),
    vacancyId: candidate?.vacancyId ?? '',
    channelId: candidate?.channelId ?? '',
    stageId: candidate?.stageId ?? defaultStage ?? stages[0]?.id ?? '',
  })
  const [extra, setExtra] = useState<KeyValue[]>(candidate?.extra ?? [])
  const [err, setErr] = useState<Record<string, string>>({})

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Ismni kiriting'
    if (f.phone.length !== 9) e.phone = "Telefon raqam to'liq emas"
    if (!f.stageId) e.stageId = 'Bosqich tanlang'
    setErr(e)
    if (Object.keys(e).length) return
    const now = new Date().toISOString()
    const data = { ...f, name: f.name.trim(), extra: extra.filter((x) => x.label.trim() || x.value.trim()) }
    update((t) => {
      if (candidate) {
        const c = t.candidates.find((x) => x.id === candidate.id)!
        if (c.stageId !== data.stageId) c.stageChangedAt = now
        Object.assign(c, data)
      } else {
        t.candidates.push({ id: uid(), ...data, pipeline: pipe, answers: [], comments: [], createdAt: now, stageChangedAt: now })
      }
    })
    if (!candidate && !isAdmin) notify('admin', `${meName} yangi nomzod qo'shdi: ${data.name}`)
    toast(candidate ? 'Nomzod saqlandi' : "Nomzod qo'shildi")
    onClose()
  }

  const opt = (l: { id: string; name: string }[]) => l.map((x) => ({ value: x.id, label: x.name }))
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={candidate ? 'Nomzodni tahrirlash' : "Yangi nomzod qo'shish"}
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
          <Input label="F.I.SH" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} placeholder="Nomzod ismi" />
          <PhoneInput label="Telefon" value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="email@misol.uz" />
          <Select label="Filial" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={opt(tenant.branches)} />
          <Select label="Vakansiya" value={f.vacancyId} onChange={(e) => setF({ ...f, vacancyId: e.target.value })} placeholder="Vakansiyani tanlang" options={tenant.vacancies.map((v) => ({ value: v.id, label: v.title }))} />
          <Select label="Kanal (Source)" value={f.channelId} onChange={(e) => setF({ ...f, channelId: e.target.value })} placeholder="Kanalni tanlang" options={opt(tenant.channels)} />
          <Select label="Bosqich (Etap)" value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })} error={err.stageId} options={opt(stages)} className="sm:col-span-2" />
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

// ------------------------------------------------------------------
// Nomzodni xodimga aylantirish
// ------------------------------------------------------------------
function HireModal({ candidate, onClose, onDone }: { candidate: Candidate; onClose: () => void; onDone: () => void }) {
  const { tenant, update } = useTenant()
  const vac = tenant.vacancies.find((v) => v.id === candidate.vacancyId)
  const [f, setF] = useState({ departmentId: vac?.departmentId ?? '', position: vac?.title ?? '', birthDate: '', hiredAt: todayISO() })
  const [langs, setLangs] = useState<string[]>(["O'zbek"])
  const save = () => {
    update((t) => {
      t.employees.push({
        id: uid(),
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        photo: candidate.photo,
        branchId: candidate.branchId,
        departmentId: f.departmentId || undefined,
        position: f.position,
        birthDate: f.birthDate || undefined,
        languages: langs,
        hiredAt: new Date(f.hiredAt).toISOString(),
        appliedAt: candidate.createdAt,
        channelId: candidate.channelId,
        extra: candidate.extra,
      })
      t.candidates = t.candidates.filter((c) => c.id !== candidate.id)
    })
    toast(`${candidate.name} xodimlar ro'yxatiga qo'shildi`)
    onDone()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Xodimga aylantirish"
      subtitle={`${candidate.name} xodimlar bazasiga qo'shiladi`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button icon={<UserCheck size={16} />} onClick={save}>
            Ishga qabul qilish
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Lavozim" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />
        <Select label="Bo'lim" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} placeholder="Tanlang" options={tenant.departments.map((d) => ({ value: d.id, label: d.name }))} />
        <Input label="Tug'ilgan sana" type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
        <Input label="Ishga qabul qilingan sana" type="date" value={f.hiredAt} onChange={(e) => setF({ ...f, hiredAt: e.target.value })} />
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Bilgan tillari</span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button key={l} type="button" onClick={() => setLangs(langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l])} className={cn('rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer', langs.includes(l) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-500')}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Nomzod kartochkasi (batafsil)
// ------------------------------------------------------------------
function CandidateDetail({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: () => void }) {
  const { tenant, update, meName, readOnly } = useTenant()
  const c = tenant.candidates.find((x) => x.id === id)
  const [comment, setComment] = useState('')
  const [hire, setHire] = useState(false)
  if (!c) return null
  const stages = c.pipeline === 'recruiting' ? tenant.stages : tenant.onboardingSteps
  const vac = tenant.vacancies.find((v) => v.id === c.vacancyId)

  const moveStage = (stageId: string) => {
    const st = stages.find((s) => s.id === stageId)
    update((t) => {
      const x = t.candidates.find((y) => y.id === c.id)!
      x.stageChangedAt = new Date().toISOString()
      if (st?.toOnboarding && t.onboardingSteps[0]) {
        x.pipeline = 'onboarding'
        x.stageId = t.onboardingSteps[0].id
      } else x.stageId = stageId
    })
    if (st?.toOnboarding) {
      toast("Nomzod onboardingga o'tkazildi")
      onClose()
    }
  }
  const addComment = () => {
    if (!comment.trim()) return
    update((t) => t.candidates.find((y) => y.id === c.id)!.comments.push({ id: uid(), text: comment.trim(), author: meName, at: new Date().toISOString() }))
    setComment('')
  }
  const remove = () => {
    if (!confirm(`${c.name} nomzodini o'chirasizmi?`)) return
    update((t) => (t.candidates = t.candidates.filter((y) => y.id !== c.id)))
    toast("Nomzod o'chirildi")
    onClose()
  }

  const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-400">{k}</span>
      <span className="text-right font-medium text-slate-700">{v || '—'}</span>
    </div>
  )

  return (
    <>
      <Modal open onClose={onClose} size="xl" title="Nomzod ma'lumotlari">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex flex-col items-center rounded-2xl bg-slate-50 p-5 text-center">
              <Avatar name={c.name} photo={c.photo} size={84} />
              <p className="mt-3 text-lg font-bold text-slate-900">{c.name}</p>
              <a href={`tel:+998${c.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                <Phone size={14} /> {displayPhone(c.phone)}
              </a>
              {!readOnly && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={onEdit}>
                    Tahrirlash
                  </Button>
                  <Button size="sm" variant="secondary" className="text-red-500" icon={<Trash2 size={14} />} onClick={remove}>
                    O'chirish
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              <Row k="Email" v={c.email} />
              <Row k="Vakansiya" v={vac?.title} />
              <Row k="Kanal" v={nameOf(tenant.channels, c.channelId)} />
              <Row k="Qo'shilgan" v={fmtDate(c.createdAt)} />
              {c.extra.map((x, i) => (
                <Row key={i} k={x.label} v={x.value} />
              ))}
            </div>
            {!readOnly && (
              <div className="mt-4 space-y-3">
                <Select label="Bosqich" value={c.stageId} onChange={(e) => moveStage(e.target.value)} options={stages.map((s) => ({ value: s.id, label: s.name }))} />
                {tenant.branches.length > 1 && (
                  <Select
                    label="Filial (boshqa filialga ko'chirish)"
                    value={c.branchId}
                    onChange={(e) => {
                      update((t) => (t.candidates.find((y) => y.id === c.id)!.branchId = e.target.value))
                      toast("Nomzod boshqa filialga ko'chirildi")
                    }}
                    options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                )}
                {c.pipeline === 'onboarding' && (
                  <Button className="w-full" icon={<UserCheck size={16} />} onClick={() => setHire(true)}>
                    Xodimga aylantirish
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-3">
            {c.answers.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-bold text-slate-900">Anketa javoblari</h4>
                <div className="space-y-3">
                  {c.answers.map((a, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-semibold text-slate-400">{a.question}</p>
                      {a.type === 'photo' && a.value ? (
                        <img src={a.value} alt="" className="mt-2 max-h-48 rounded-lg" />
                      ) : a.type === 'file' && a.value ? (
                        <a href={a.value} download={a.fileName || 'fayl'} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                          <Download size={14} /> {a.fileName || 'Faylni yuklab olish'}
                        </a>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.value || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare size={16} /> Izohlar ({c.comments.length})
              </h4>
              <div className="space-y-3">
                {c.comments.length === 0 && <p className="text-sm text-slate-400">Hali izoh yozilmagan</p>}
                {c.comments.map((m) => (
                  <div key={m.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{m.author}</span>
                      <span className="text-slate-400">{fmtDateTime(m.at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{m.text}</p>
                  </div>
                ))}
              </div>
              {!readOnly && (
                <div className="mt-3 flex gap-2">
                  <input
                    className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand"
                    placeholder="Kommentariya yozing..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  />
                  <Button onClick={addComment}>Yuborish</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
      {hire && <HireModal candidate={c} onClose={() => setHire(false)} onDone={onClose} />}
    </>
  )
}

// ------------------------------------------------------------------
// Kanban doskasi
// ------------------------------------------------------------------
export default function Pipeline({ pipe }: { pipe: Pipe }) {
  const { tenant, update, inBranch, readOnly } = useTenant()
  const stages = pipe === 'recruiting' ? tenant.stages : tenant.onboardingSteps
  const [q, setQ] = useState('')
  const [vacancy, setVacancy] = useState('')
  const [channel, setChannel] = useState('')
  const [stageModal, setStageModal] = useState<{ stage?: Stage } | null>(null)
  const [form, setForm] = useState<{ candidate?: Candidate; stage?: string } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const cands = useMemo(
    () =>
      tenant.candidates.filter((c) => {
        if (c.pipeline !== pipe || !inBranch(c.branchId)) return false
        if (vacancy && c.vacancyId !== vacancy) return false
        if (channel && c.channelId !== channel) return false
        const t = q.toLowerCase()
        return !t || c.name.toLowerCase().includes(t) || c.phone.includes(t.replace(/\D/g, '') || '~')
      }),
    [tenant.candidates, pipe, inBranch, vacancy, channel, q],
  )

  const drop = (stageId: string, candId: string) => {
    const st = stages.find((s) => s.id === stageId)
    const c = tenant.candidates.find((x) => x.id === candId)
    if (!c || c.stageId === stageId) return
    update((t) => {
      const x = t.candidates.find((y) => y.id === candId)!
      x.stageChangedAt = new Date().toISOString()
      if (st?.toOnboarding && t.onboardingSteps[0]) {
        x.pipeline = 'onboarding'
        x.stageId = t.onboardingSteps[0].id
      } else x.stageId = stageId
    })
    if (st?.toOnboarding) toast(`${c.name} onboardingga o'tkazildi`)
  }

  const moveStage = (id: string, dir: -1 | 1) =>
    update((t) => {
      const list = pipe === 'recruiting' ? t.stages : t.onboardingSteps
      const i = list.findIndex((s) => s.id === id)
      const j = i + dir
      if (j < 0 || j >= list.length) return
      ;[list[i], list[j]] = [list[j], list[i]]
    })

  const deleteStage = (s: Stage) => {
    if (tenant.candidates.some((c) => c.stageId === s.id)) return toast("Avval bu bosqichdagi nomzodlarni ko'chiring", 'error')
    if (stages.length <= 1) return toast("Kamida bitta bosqich bo'lishi kerak", 'error')
    if (!confirm(`"${s.name}" bosqichini o'chirasizmi?`)) return
    update((t) => {
      if (pipe === 'recruiting') t.stages = t.stages.filter((x) => x.id !== s.id)
      else t.onboardingSteps = t.onboardingSteps.filter((x) => x.id !== s.id)
    })
  }

  const isRec = pipe === 'recruiting'
  return (
    <div>
      <PageHeader
        title={isRec ? 'Rekruiting' : 'Onboarding'}
        subtitle={isRec ? 'Nomzodlar oqimi va bosqichlar boshqaruvi' : 'Yangi xodimlarni moslashtirish jarayoni'}
        actions={
          !readOnly && (
            <>
              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setStageModal({})}>
                {isRec ? "Etap qo'shish" : "Qadam qo'shish"}
              </Button>
              <Button icon={<Plus size={16} />} onClick={() => setForm({})}>
                Nomzod qo'shish
              </Button>
            </>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Qidiruv (Ism, Tel)..." className="md:w-72" />
        <select value={vacancy} onChange={(e) => setVacancy(e.target.value)} className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand">
          <option value="">Barcha vakansiyalar</option>
          {tenant.vacancies.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand">
          <option value="">Barcha kanallar</option>
          {tenant.channels.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400 md:ml-auto">
          Jami: <b className="text-slate-700">{cands.length}</b>
        </span>
      </div>

      {stages.length === 0 ? (
        <Empty title="Bosqichlar mavjud emas" action={<Button onClick={() => setStageModal({})}>+ Qo'shish</Button>} />
      ) : (
        <div className="scroll-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          {stages.map((s, idx) => {
            const list = cands.filter((c) => c.stageId === s.id)
            return (
              <div
                key={s.id}
                onDragOver={(e) => {
                  if (readOnly) return
                  e.preventDefault()
                  setDragOver(s.id)
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(null)
                  drop(s.id, e.dataTransfer.getData('text/plain'))
                }}
                className={cn('flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 transition', dragOver === s.id && 'bg-brand/10 ring-2 ring-brand/30')}
              >
                <div className="relative px-3 pt-3">
                  <div className="h-1 rounded-full" style={{ background: s.color }} />
                  <div className="flex items-center gap-2 py-3">
                    <span className="flex-1 truncate text-sm font-bold text-slate-700" title={s.description || s.name}>
                      {s.name}
                    </span>
                    {s.toOnboarding && <ArrowLeftRight size={14} className="text-emerald-500" />}
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{list.length}</span>
                    {!readOnly && (
                      <IconButton className="h-7 w-7" onClick={() => setMenu(menu === s.id ? null : s.id)}>
                        <MoreHorizontal size={16} />
                      </IconButton>
                    )}
                  </div>
                  {menu === s.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                      <div className="absolute right-3 top-14 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-pop" onClick={() => setMenu(null)}>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => setForm({ stage: s.id })}>
                          <Plus size={14} /> Nomzod qo'shish
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => setStageModal({ stage: s })}>
                          <Pencil size={14} /> Tahrirlash
                        </button>
                        {idx > 0 && (
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => moveStage(s.id, -1)}>
                            <ChevronLeft size={14} /> Chapga surish
                          </button>
                        )}
                        {idx < stages.length - 1 && (
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => moveStage(s.id, 1)}>
                            <ChevronRight size={14} /> O'ngga surish
                          </button>
                        )}
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => deleteStage(s)}>
                          <Trash2 size={14} /> O'chirish
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="scroll-thin flex max-h-[calc(100vh-300px)] min-h-[120px] flex-col gap-2.5 overflow-y-auto px-3 pb-3">
                  {list.map((c) => (
                    <div
                      key={c.id}
                      draggable={!readOnly}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                      onClick={() => setDetail(c.id)}
                      className="cursor-pointer rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm transition hover:border-brand/40 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} photo={c.photo} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400">{displayPhone(c.phone)}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {c.vacancyId && <Badge tone="brand">{tenant.vacancies.find((v) => v.id === c.vacancyId)?.title ?? '—'}</Badge>}
                        {c.channelId && <Badge>{nameOf(tenant.channels, c.channelId)}</Badge>}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{timeAgo(c.stageChangedAt)}</span>
                        <span className="flex items-center gap-2">
                          {c.answers.length > 0 && <FileText size={12} />}
                          {c.comments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MessageSquare size={12} /> {c.comments.length}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <p className="py-6 text-center text-xs text-slate-400">{readOnly ? "Bo'sh" : 'Nomzodni shu yerga torting'}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {stageModal && <StageModal pipe={pipe} stage={stageModal.stage} onClose={() => setStageModal(null)} />}
      {form && <CandidateFormModal pipe={pipe} candidate={form.candidate} defaultStage={form.stage} onClose={() => setForm(null)} />}
      {detail && (
        <CandidateDetail
          id={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const c = tenant.candidates.find((x) => x.id === detail)
            setDetail(null)
            setForm({ candidate: c })
          }}
        />
      )}
    </div>
  )
}
