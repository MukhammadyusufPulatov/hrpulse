import { useMemo, useState } from 'react'
import { Calendar, Clock, Download, GripVertical, Lock, MessageSquare, MoreVertical, Pencil, Phone, Plus, Search, Trash2, User, UserPlus } from 'lucide-react'
import { Button, ColorPicker, Drawer, Empty, IconButton, Input, Modal, PhoneInput, PhotoInput, Select, Textarea, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import { downloadResume } from '../../lib/resume'
import type { Candidate, KeyValue, Stage, Tenant } from '../../lib/types'
import { cn, displayPhone, fmtDate, fmtDateTime, uid } from '../../lib/utils'
import { EmployeeForm } from './Employees'
import { t } from '../../lib/i18n'

type Pipe = 'recruiting' | 'onboarding'
const STALE_HOURS = 24

const listOf = (tn: Tenant, pipe: Pipe) => (pipe === 'recruiting' ? tn.stages : tn.onboardingSteps)

/** Nomzod bo'yicha to'liq matnli qidiruv: ism, telefon, email, vakansiya, manba, javoblar, izohlar... */
function haystack(c: Candidate, tn: Tenant) {
  return [
    c.name,
    c.phone,
    '+998' + c.phone,
    c.email,
    tn.vacancies.find((v) => v.id === c.vacancyId)?.title,
    nameOf(tn.channels, c.channelId, ''),
    nameOf(tn.branches, c.branchId, ''),
    ...c.extra.flatMap((x) => [x.label, x.value]),
    ...c.answers.filter((a) => a.type !== 'photo' && a.type !== 'file').map((a) => a.value),
    ...c.comments.map((m) => m.text),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// ------------------------------------------------------------------
// Etap qo'shish / tahrirlash
// ------------------------------------------------------------------
function StageModal({ pipe, stage, onClose }: { pipe: Pipe; stage?: Stage; onClose: () => void }) {
  const { update } = useTenant()
  const [name, setName] = useState(stage?.name ?? '')
  const [description, setDescription] = useState(stage?.description ?? '')
  const [color, setColor] = useState(stage?.color ?? '#3b82f6')
  const save = () => {
    if (!name.trim()) return
    update((tn) => {
      const list = listOf(tn, pipe)
      if (stage) Object.assign(list.find((s) => s.id === stage.id)!, { name: name.trim(), description, color })
      else list.splice(list.length - 1, 0, { id: uid(), name: name.trim(), description, color }) // oxirgi tizim etapidan oldin
    })
    toast(stage ? t("Etap saqlandi") : t("Etap qo'shildi"))
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={stage ? t("Etapni tahrirlash") : t("Yangi etap qo'shish")}
      subtitle={stage ? undefined : t("Etapni keyin sarlavhasidan ushlab istalgan joyga surishingiz mumkin")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Bekor qilish")}
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            {t("Saqlash")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t("Etap nomi")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Masalan: 2-suhbat")} autoFocus />
        <Textarea label={t("Izoh (etap haqida)")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("Bu etapda nomzodlar qanday saralanadi?")} />
        <ColorPicker label={t("Rang tanlang")} value={color} onChange={setColor} />
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Nomzod qo'shish / tahrirlash
// ------------------------------------------------------------------
function CandidateFormModal({ pipe, candidate, defaultStage, onClose }: { pipe: Pipe; candidate?: Candidate; defaultStage?: string; onClose: () => void }) {
  const { tenant, update, branch, meName, notify, isAdmin } = useTenant()
  // Nomzodni to'g'ridan-to'g'ri tizim etapiga (onboardingga o'tkazish / ishga olish) qo'shib bo'lmaydi
  const stages = listOf(tenant, pipe).filter((s) => s.system !== 'onboarding' && s.system !== 'hired')
  const [f, setF] = useState({
    name: candidate?.name ?? '',
    phone: candidate?.phone ?? '',
    email: candidate?.email ?? '',
    photo: candidate?.photo,
    branchId: candidate?.branchId ?? (branch !== 'all' ? branch : tenant.branches[0]?.id ?? ''),
    vacancyId: candidate?.vacancyId ?? '',
    channelId: candidate?.channelId ?? '',
    stageId: candidate?.stageId ?? (stages.some((s) => s.id === defaultStage) ? defaultStage! : stages[0]?.id ?? ''),
  })
  const [extra, setExtra] = useState<KeyValue[]>(candidate?.extra ?? [])
  const [err, setErr] = useState<Record<string, string>>({})

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = t('Ismni kiriting')
    if (f.phone.length !== 9) e.phone = t("Telefon raqam to'liq emas")
    setErr(e)
    if (Object.keys(e).length) return
    const now = new Date().toISOString()
    const data = { ...f, name: f.name.trim(), extra: extra.filter((x) => x.label.trim() || x.value.trim()) }
    update((tn) => {
      if (candidate) {
        const c = tn.candidates.find((x) => x.id === candidate.id)!
        if (c.stageId !== data.stageId) c.stageChangedAt = now
        Object.assign(c, data)
      } else tn.candidates.push({ id: uid(), ...data, pipeline: pipe, answers: [], comments: [], createdAt: now, stageChangedAt: now })
    })
    if (!candidate && !isAdmin) notify('admin', t("{0} yangi nomzod qo'shdi: {1}", { 0: meName, 1: data.name }))
    toast(candidate ? t("Nomzod saqlandi") : t("Nomzod qo'shildi"))
    onClose()
  }

  const opt = (l: { id: string; name: string }[]) => l.map((x) => ({ value: x.id, label: t(x.name) }))
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={candidate ? t("Nomzodni tahrirlash") : t("Yangi nomzod qo'shish")}
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
        <PhotoInput value={f.photo} name={f.name} onChange={(photo) => setF({ ...f, photo })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("F.I.SH")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} placeholder={t("Nomzod ismi")} />
          <PhoneInput label={t("Telefon")} value={f.phone} onChange={(phone) => setF({ ...f, phone })} error={err.phone} />
          <Input label={t("Email")} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={t("email@misol.uz")} />
          {tenant.branches.length > 1 && <Select label={t("Filial")} value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })} options={opt(tenant.branches)} />}
          <Select label={t("Vakansiya")} value={f.vacancyId} onChange={(e) => setF({ ...f, vacancyId: e.target.value })} placeholder={t("Vakansiyani tanlang")} options={tenant.vacancies.map((v) => ({ value: v.id, label: v.title }))} />
          <Select label={t("Manba")} value={f.channelId} onChange={(e) => setF({ ...f, channelId: e.target.value })} placeholder={t("Manbani tanlang")} options={opt(tenant.channels)} />
          {!candidate || stages.some((s) => s.id === candidate.stageId) ? (
            <Select label={t("Etap")} value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })} options={opt(stages)} />
          ) : null}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t("Qo'shimcha ma'lumotlar")}</span>
            <Button size="sm" variant="ghost" onClick={() => setExtra([...extra, { label: '', value: '' }])}>
              {t("+ Qo'shish")}
            </Button>
          </div>
          <div className="space-y-2">
            {extra.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className="h-10 w-2/5 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder={t("Sarlavha")} value={x.label} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
                <input className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand" placeholder={t("Qiymat")} value={x.value} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
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
// Nomzod ma'lumotlari — yon oyna
// ------------------------------------------------------------------
function CandidateDrawer({ id, onClose, onEdit, onMove }: { id: string; onClose: () => void; onEdit: () => void; onMove: (c: Candidate, stageId: string) => void }) {
  const { tenant, client, update, meName, readOnly } = useTenant()
  const c = tenant.candidates.find((x) => x.id === id)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  if (!c) return null
  const stages = listOf(tenant, c.pipeline)
  const vac = tenant.vacancies.find((v) => v.id === c.vacancyId)

  const addComment = () => {
    if (!comment.trim()) return
    update((tn) => tn.candidates.find((y) => y.id === c.id)!.comments.push({ id: uid(), text: comment.trim(), author: meName, at: new Date().toISOString() }))
    setComment('')
  }
  const remove = () => {
    if (!confirm(t("{0} nomzodini o'chirasizmi?", { 0: c.name }))) return
    update((tn) => (tn.candidates = tn.candidates.filter((y) => y.id !== c.id)))
    toast(t("Nomzod o'chirildi"))
    onClose()
  }
  const download = async () => {
    setBusy(true)
    try {
      await downloadResume(c, tenant, client)
    } catch {
      toast(t("Rezyumeni yaratib bo'lmadi"), 'error')
    }
    setBusy(false)
  }

  const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <span className="text-slate-400">{k}</span>
      <span className="text-right font-medium text-slate-700">{v || '—'}</span>
    </div>
  )

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("Nomzod ma'lumotlari")}
      actions={
        <>
          <IconButton title={t("Rezyume sifatida yuklab olish (PDF)")} onClick={download} disabled={busy}>
            <Download size={18} className={busy ? 'animate-pulse' : ''} />
          </IconButton>
          {!readOnly && (
            <>
              <IconButton title={t("Tahrirlash")} onClick={onEdit}>
                <Pencil size={17} />
              </IconButton>
              <IconButton title={t("O'chirish")} tone="danger" onClick={remove}>
                <Trash2 size={17} />
              </IconButton>
            </>
          )}
        </>
      }
    >
      <div className="flex items-center gap-4">
        {c.photo ? <img src={c.photo} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-brand"><User size={32} /></div>}
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-slate-900">{c.name}</p>
          <a href={`tel:+998${c.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            <Phone size={14} /> {displayPhone(c.phone)}
          </a>
          <p className="mt-0.5 text-sm text-slate-500">{vac?.title ?? t("Vakansiyasiz")}</p>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Select label={t("Etap")} value={c.stageId} onChange={(e) => onMove(c, e.target.value)} options={stages.map((s) => ({ value: s.id, label: t(s.name) }))} />
          {tenant.branches.length > 1 && (
            <Select
              label={t("Filial")}
              value={c.branchId}
              onChange={(e) => {
                update((tn) => (tn.candidates.find((y) => y.id === c.id)!.branchId = e.target.value))
                toast(t("Nomzod boshqa filialga ko'chirildi"))
              }}
              options={tenant.branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
        </div>
      )}

      <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
        <Row k="Email" v={c.email} />
        <Row k={t("Manba")} v={nameOf(tenant.channels, c.channelId)} />
        <Row k={t("Ariza sanasi")} v={fmtDateTime(c.createdAt)} />
        {c.extra.map((x, i) => (
          <Row key={i} k={x.label} v={x.value} />
        ))}
      </div>

      {c.answers.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-bold text-slate-900">{t("Anketa javoblari")}</h4>
          <div className="space-y-2.5">
            {c.answers.map((a, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-400">{a.question}</p>
                {a.type === 'photo' && a.value ? (
                  <img src={a.value} alt="" className="mt-2 max-h-48 rounded-lg" />
                ) : a.type === 'file' && a.value ? (
                  <a href={a.value} download={a.fileName || 'fayl'} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    <Download size={14} /> {a.fileName || t("Faylni yuklab olish")}
                  </a>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.value || '—'}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <MessageSquare size={16} /> {t('Izohlar')} ({c.comments.length})
        </h4>
        <div className="space-y-2.5">
          {c.comments.length === 0 && <p className="text-sm text-slate-400">{t("Hali izoh yozilmagan. Har bog'langaningizda natijani shu yerga yozib qo'ying.")}</p>}
          {c.comments.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-100 p-3">
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
            <textarea
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder={t("Kommentariya yozing...")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addComment())}
            />
            <Button onClick={addComment} className="h-auto">
              {t("Yuborish")}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ------------------------------------------------------------------
// Nomzod kartochkasi
// ------------------------------------------------------------------
function CandidateCard({ c, pipe, stale, onOpen, draggable }: { c: Candidate; pipe: Pipe; stale: boolean; onOpen: () => void; draggable: boolean }) {
  const { tenant } = useTenant()
  const hours = Math.floor((Date.now() - +new Date(c.stageChangedAt)) / 3_600_000)
  const channel = tenant.channels.find((x) => x.id === c.channelId)?.name
  const d = new Date(c.stageChangedAt)
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-candidate', c.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onOpen}
      className="relative cursor-pointer rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      {stale && pipe === 'recruiting' && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5" title={t("Nomzod {0} soatdan beri shu etapda turibdi", { 0: hours })}>
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700">{t("🪰 Pashsha bosib ketdi")}</span>
          <span className="rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{t('{0} soat+', { 0: hours })}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        {c.photo ? (
          <img src={c.photo} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <User size={20} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{c.name}</p>
          <p className="text-xs font-medium text-slate-400">{displayPhone(c.phone)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {channel && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{channel}</span>}
        {c.vacancyId && <span className="max-w-full truncate rounded-lg bg-brand/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">{tenant.vacancies.find((v) => v.id === c.vacancyId)?.title}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-slate-400">
        <div className="flex gap-1.5">
          <span className="flex h-7 min-w-7 items-center justify-center gap-1 rounded-lg bg-slate-50 px-1.5 text-[11px] font-semibold">
            <MessageSquare size={13} />
            {c.comments.length > 0 && c.comments.length}
          </span>
          <span className="flex h-7 items-center justify-center gap-1 rounded-lg bg-slate-50 px-1.5 text-[11px] font-semibold" title={t("Ariza sanasi")}>
            <Calendar size={13} /> {fmtDate(c.createdAt).slice(0, 5)}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold" title={fmtDateTime(c.stageChangedAt)}>
          <Clock size={12} /> {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Kanban doskasi
// ------------------------------------------------------------------
export default function Pipeline({ pipe }: { pipe: Pipe }) {
  const { tenant, update, inBranch, readOnly } = useTenant()
  const stages = listOf(tenant, pipe)
  const [q, setQ] = useState('')
  const [vacancy, setVacancy] = useState('')
  const [channel, setChannel] = useState('')
  const [stageModal, setStageModal] = useState<{ stage?: Stage } | null>(null)
  const [form, setForm] = useState<{ candidate?: Candidate; stage?: string } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [hire, setHire] = useState<Candidate | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)

  const all = tenant.candidates.filter((c) => c.pipeline === pipe && inBranch(c.branchId))
  const cands = useMemo(() => {
    const tn = q.trim().toLowerCase()
    const digits = tn.replace(/\D/g, '')
    return all.filter((c) => {
      if (vacancy && c.vacancyId !== vacancy) return false
      if (channel && c.channelId !== channel) return false
      if (!tn) return true
      const h = haystack(c, tenant)
      return h.includes(tn) || (digits.length >= 3 && h.replace(/\s/g, '').includes(digits))
    })
  }, [all, vacancy, channel, q, tenant])

  /** Nomzodni boshqa etapga o'tkazish (tizim etaplari uchun maxsus amallar bilan) */
  const move = (c: Candidate, stageId: string) => {
    if (c.stageId === stageId) return
    const st = stages.find((s) => s.id === stageId)
    if (!st) return
    if (st.system === 'hired') {
      setDetail(null)
      return setHire(c)
    }
    update((tn) => {
      const x = tn.candidates.find((y) => y.id === c.id)!
      x.stageChangedAt = new Date().toISOString()
      if (st.system === 'onboarding') {
        x.pipeline = 'onboarding'
        x.stageId = tn.onboardingSteps[0].id
      } else x.stageId = stageId
    })
    if (st.system === 'onboarding') {
      toast(t("{0} Onboarding'ning \"Dastlabki etap\"iga o'tkazildi", { 0: c.name }))
      setDetail(null)
    }
  }

  /** Etaplar ketma-ketligini o'zgartirish (tizim etaplari joyida qoladi) */
  const reorder = (dragId: string, targetId: string) => {
    if (dragId === targetId) return
    update((tn) => {
      const list = listOf(tn, pipe)
      const from = list.findIndex((s) => s.id === dragId)
      if (from < 0 || list[from].system) return
      const [item] = list.splice(from, 1)
      let to = list.findIndex((s) => s.id === targetId)
      to = Math.min(Math.max(to, 1), list.length - 1) // birinchi va oxirgi tizim etaplari orasida
      list.splice(to, 0, item)
    })
  }

  const deleteStage = (s: Stage) => {
    if (tenant.candidates.some((c) => c.stageId === s.id)) return toast(t("Avval bu etapdagi nomzodlarni boshqa etapga o'tkazing"), 'error')
    if (!confirm(t("\"{0}\" etapini o'chirasizmi?", { 0: t(s.name) }))) return
    update((tn) => {
      if (pipe === 'recruiting') tn.stages = tn.stages.filter((x) => x.id !== s.id)
      else tn.onboardingSteps = tn.onboardingSteps.filter((x) => x.id !== s.id)
    })
  }

  const isRec = pipe === 'recruiting'
  const selCls = 'h-11 min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand'

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="xl:w-64 xl:shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{isRec ? t("Rekruiting") : t("Onboarding")}</h1>
          <p className="mt-1 text-sm text-slate-500">{isRec ? t("Nomzodlar oqimi va bosqichlar boshqaruvi") : t("Yangi xodimlarni moslashtirish jarayoni")}</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <span className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("Jami")} <span className="h-4 w-px bg-slate-200" /> <span className="text-lg text-brand">{all.length}</span>
          </span>
          <div className="relative min-w-[220px] flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder={t("Qidiruv (ism, telefon, javoblar, izohlar...)")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select value={vacancy} onChange={(e) => setVacancy(e.target.value)} className={cn(selCls, 'flex-1 sm:flex-none sm:w-52')}>
            <option value="">{t("Barcha vakansiyalar")}</option>
            {tenant.vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={cn(selCls, 'flex-1 sm:flex-none sm:w-48')}>
            <option value="">{t("Barcha manbalar")}</option>
            {tenant.channels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {!readOnly && (
            <>
              <Button variant="secondary" size="lg" icon={<Plus size={17} />} onClick={() => setStageModal({})}>
                {t("Etap qo'shish")}
              </Button>
              <Button size="lg" icon={<UserPlus size={17} />} className="shadow-lg shadow-brand/25" onClick={() => setForm({})}>
                {t("Nomzod qo'shish")}
              </Button>
            </>
          )}
        </div>
      </div>

      {(q || vacancy || channel) && (
        <p className="mb-3 text-sm text-slate-500">
          {t("Topildi:")} <b className="text-slate-800">{cands.length}</b> {t("ta nomzod")}
        </p>
      )}

      <div className="scroll-thin -mx-4 flex gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {stages.map((s) => {
          const list = cands.filter((c) => c.stageId === s.id).sort((a, b) => (a.stageChangedAt < b.stageChangedAt ? 1 : -1))
          const locked = !!s.system
          return (
            <div
              key={s.id}
              onDragOver={(e) => {
                if (readOnly) return
                e.preventDefault()
                if (e.dataTransfer.types.includes('application/x-stage')) setOverStage(s.id)
                else setOver(s.id)
              }}
              onDragLeave={() => (setOver(null), setOverStage(null))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                setOverStage(null)
                const stageId = e.dataTransfer.getData('application/x-stage')
                if (stageId) return reorder(stageId, s.id)
                const c = tenant.candidates.find((x) => x.id === e.dataTransfer.getData('application/x-candidate'))
                if (c) move(c, s.id)
              }}
              className={cn(
                'flex w-[320px] shrink-0 flex-col rounded-3xl transition',
                over === s.id && 'bg-brand/5 ring-2 ring-brand/30',
                overStage === s.id && 'ring-2 ring-dashed ring-slate-300',
                locked && s.system !== 'new' && s.system !== 'initial' && 'bg-emerald-50/40',
              )}
            >
              <div
                draggable={!readOnly && !locked}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-stage', s.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={cn('relative px-2 pb-3 pt-2', !readOnly && !locked && 'cursor-grab active:cursor-grabbing')}
              >
                <div className="flex items-center gap-2">
                  {!readOnly && !locked && <GripVertical size={15} className="-ml-1 text-slate-300" />}
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-[15px] font-bold text-slate-900">{t(s.name)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.color + '22', color: s.color }}>
                    {list.length}
                  </span>
                  <span className="flex-1" />
                  {locked ? (
                    <span title={t("Tizim etapi — o'chirib yoki tahrirlab bo'lmaydi")} className="text-slate-300">
                      <Lock size={14} />
                    </span>
                  ) : (
                    !readOnly && (
                      <IconButton className="h-7 w-7" onClick={() => setMenu(menu === s.id ? null : s.id)}>
                        <MoreVertical size={16} />
                      </IconButton>
                    )
                  )}
                </div>
                {s.description && <p className="mt-1 truncate pl-[18px] text-[11px] text-slate-400">{t(s.description)}</p>}
                {menu === s.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                    <div className="absolute right-2 top-10 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-pop" onClick={() => setMenu(null)}>
                      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => setForm({ stage: s.id })}>
                        <Plus size={14} /> {t("Nomzod qo'shish")}
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer" onClick={() => setStageModal({ stage: s })}>
                        <Pencil size={14} /> {t("Tahrirlash")}
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => deleteStage(s)}>
                        <Trash2 size={14} /> {t("O'chirish")}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="scroll-thin flex max-h-[calc(100vh-270px)] min-h-[160px] flex-col gap-3 overflow-y-auto px-1 pb-4 pt-1">
                {list.map((c) => (
                  <CandidateCard
                    key={c.id}
                    c={c}
                    pipe={pipe}
                    draggable={!readOnly}
                    stale={!locked || s.system === 'new' ? Date.now() - +new Date(c.stageChangedAt) > STALE_HOURS * 3_600_000 : false}
                    onOpen={() => setDetail(c.id)}
                  />
                ))}
                {list.length === 0 && (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                    {s.system === 'onboarding' ? t("Bu yerga tashlangan nomzod Onboarding'ga o'tadi") : s.system === 'hired' ? t("Bu yerga tashlangan nomzod xodimga aylanadi") : readOnly ? t("Bo'sh") : t("Nomzodni shu yerga torting")}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {all.length === 0 && !readOnly && (
        <Empty title={t("Hozircha nomzodlar yo'q")} text={isRec ? t("Vakansiya linkini tarqating yoki nomzodni qo'lda qo'shing") : t("Rekruitingdan \"Onboarding jarayonida\" etapiga o'tkazilgan nomzodlar shu yerda paydo bo'ladi")} />
      )}

      {stageModal && <StageModal pipe={pipe} stage={stageModal.stage} onClose={() => setStageModal(null)} />}
      {form && <CandidateFormModal pipe={pipe} candidate={form.candidate} defaultStage={form.stage} onClose={() => setForm(null)} />}
      {detail && (
        <CandidateDrawer
          id={detail}
          onClose={() => setDetail(null)}
          onMove={move}
          onEdit={() => {
            const c = tenant.candidates.find((x) => x.id === detail)
            setDetail(null)
            setForm({ candidate: c })
          }}
        />
      )}
      {hire && (
        <EmployeeForm
          title={t("Ishga olindi: {0}", { 0: hire.name })}
          prefill={{
            name: hire.name,
            phone: hire.phone,
            email: hire.email,
            photo: hire.photo,
            branchId: hire.branchId,
            departmentId: tenant.vacancies.find((v) => v.id === hire.vacancyId)?.departmentId,
            position: tenant.vacancies.find((v) => v.id === hire.vacancyId)?.title,
            appliedAt: hire.createdAt,
            channelId: hire.channelId,
            extra: hire.extra,
            languages: [],
          }}
          onClose={() => setHire(null)}
          onSaved={() => {
            update((tn) => (tn.candidates = tn.candidates.filter((c) => c.id !== hire.id)))
            toast(t("{0} aktiv xodimlar ro'yxatiga qo'shildi", { 0: hire.name }))
          }}
        />
      )}
    </div>
  )
}
