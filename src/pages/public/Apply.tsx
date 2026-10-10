import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, CheckCircle2, ChevronDown, ChevronRight, Instagram, Send, Sparkles, Upload, ListChecks } from 'lucide-react'
import { Empty } from '../../components/ui'
import { canLogin, updateDb, useDb } from '../../lib/db'
import { SUPER_BRAND, useBrand } from '../../lib/theme'
import type { Answer, Question } from '../../lib/types'
import { cn, fileToDataUrl, formatPhone, normalizePhone, uid } from '../../lib/utils'

const MAX_FILE = 1.5 * 1024 * 1024
const fieldCls = 'h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10'

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
      {text}
      {required && <span className="text-red-500"> *</span>}
    </span>
  )
}

export default function Apply() {
  const { sub, vacancyId, channelId } = useParams()
  const db = useDb()
  const client = db.clients.find((c) => c.subdomain === sub)
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  const t = client && db.tenants[client.id]
  const v = t?.vacancies.find((x) => x.id === vacancyId)

  const [step, setStep] = useState<'info' | 'form' | 'done'>('info')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<Record<string, { value: string; fileName?: string }>>({})
  const [err, setErr] = useState<Record<string, string>>({})

  if (!client || !t || !v || !v.active || canLogin(client))
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty title="Vakansiya topilmadi" text="Bu vakansiya yopilgan yoki mavjud emas" />
      </div>
    )

  const go = (s: typeof step) => {
    setStep(s)
    window.scrollTo({ top: 0 })
  }

  if (step === 'done')
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={44} className="text-emerald-500" />
          </div>
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Arizangiz qabul qilindi</h1>
          <p className="mt-4 text-lg text-slate-500">HR menejerimiz sizga tez orada aloqaga chiqadi.</p>
          {client.instagram && (
            <a
              href={client.instagram}
              target="_blank"
              rel="noreferrer"
              className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 px-8 py-4 font-bold text-white shadow-xl shadow-pink-500/25 transition hover:-translate-y-0.5"
            >
              <Instagram size={20} /> Instagramda kuzatib boring
            </a>
          )}
          <div className="mt-6">
            <Link to={`/c/${client.subdomain}/jobs`} className="text-sm font-semibold text-slate-400 hover:text-slate-700">
              Boshqa vakansiyalar
            </Link>
          </div>
        </div>
      </div>
    )

  const lines = (s: string) => s.split('\n').map((x) => x.replace(/^[-•*\s]+/, '').trim()).filter(Boolean)

  if (step === 'info')
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-4xl px-6 py-14">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">Vakansiya</span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{v.title}</h1>
          <p className="mt-3 text-slate-500">{client.companyName} jamoasining bir qismiga aylaning.</p>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {[
              { title: 'Imkoniyatlar', icon: <Sparkles size={15} />, items: lines(v.talents), fallback: 'Kompaniyamiz ajoyib sharoitlar va mustahkam kelajak taklif etadi.', on: true },
              { title: 'Talablar', icon: <ListChecks size={15} />, items: lines(v.requirements), fallback: 'Nomzod uchun maxsus talablar belgilanmagan.', on: false },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="mb-5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  <span className="text-brand">{col.icon}</span> {col.title}
                </h3>
                <ul className="space-y-4">
                  {(col.items.length ? col.items : [col.fallback]).map((l, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                      <span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold', col.on ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-400')}>✓</span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button onClick={() => go('form')} className="mt-14 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 font-bold text-white shadow-xl shadow-brand/30 transition hover:-translate-y-0.5 cursor-pointer">
            Ariza yuborish <ChevronRight size={18} />
          </button>
        </main>
      </div>
    )

  // ------------- Anketa -------------
  const setA = (id: string, value: string, fileName?: string) => setAnswers((a) => ({ ...a, [id]: { value, fileName } }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = 'Ism-familiyangizni kiriting'
    if (phone.length !== 9) er.phone = "Telefon raqamni to'liq kiriting"
    v.questions.forEach((q) => {
      const val = answers[q.id]?.value ?? ''
      if (q.required && !val) er[q.id] = 'Majburiy savol'
      else if (q.type === 'phone' && val && val.length !== 9) er[q.id] = "Telefon raqam to'liq emas"
    })
    setErr(er)
    if (Object.keys(er).length) {
      document.getElementById(Object.keys(er)[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const now = new Date().toISOString()
    const list: Answer[] = v.questions.map((q) => {
      const a = answers[q.id]
      return { question: q.text, type: q.type, value: q.type === 'phone' && a?.value ? '+998 ' + formatPhone(a.value) : a?.value ?? '', fileName: a?.fileName }
    })
    const photo = v.questions.find((q) => q.type === 'photo' && answers[q.id]?.value)
    const channel = t.channels.find((c) => c.id === channelId)
    updateDb((d) => {
      const tt = d.tenants[client.id]
      tt.candidates.push({
        id: uid(),
        name: name.trim(),
        phone,
        photo: photo ? answers[photo.id].value : undefined,
        branchId: v.branchId,
        vacancyId: v.id,
        channelId: channel?.id,
        pipeline: 'recruiting',
        stageId: tt.stages.find((s) => s.system === 'new')?.id ?? tt.stages[0]?.id ?? '',
        extra: [],
        answers: list,
        comments: [],
        createdAt: now,
        stageChangedAt: now,
      })
      tt.notices.unshift({ id: uid(), to: 'all', text: `Yangi ariza: ${name.trim()} — "${v.title}"${channel ? ` (${channel.name})` : ''}`, at: now, read: false })
    })
    go('done')
  }

  const renderQ = (q: Question) => {
    const val = answers[q.id]?.value ?? ''
    const error = err[q.id]
    let input: React.ReactNode
    switch (q.type) {
      case 'phone':
        input = (
          <div className={cn(fieldCls, 'flex items-center gap-2 px-0')}>
            <span className="pl-4 text-sm font-semibold text-slate-500">+998</span>
            <input inputMode="tel" className="h-full flex-1 bg-transparent pr-4 outline-none" placeholder="90 123 45 67" value={formatPhone(val)} onChange={(e) => setA(q.id, normalizePhone(e.target.value))} />
          </div>
        )
        break
      case 'date':
        input = <input type="date" className={fieldCls} value={val} onChange={(e) => setA(q.id, e.target.value)} />
        break
      case 'select':
        input = (
          <div className="relative">
            <select className={cn(fieldCls, 'cursor-pointer appearance-none pr-10 font-semibold')} value={val} onChange={(e) => setA(q.id, e.target.value)}>
              <option value="">Tanlang...</option>
              {q.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        )
        break
      case 'multi': {
        const sel = val ? val.split(', ') : []
        input = (
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setA(q.id, (sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]).join(', '))}
                className={cn('rounded-xl border px-4 py-2.5 text-sm font-medium transition cursor-pointer', sel.includes(o) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-100 bg-slate-50 text-slate-600')}
              >
                {sel.includes(o) && '✓ '}
                {o}
              </button>
            ))}
          </div>
        )
        break
      }
      case 'photo':
      case 'file':
        input = (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-400 transition hover:border-brand hover:text-brand">
            {q.type === 'photo' && val ? <img src={val} className="h-24 w-24 rounded-2xl object-cover" alt="" /> : q.type === 'photo' ? <Camera size={22} /> : <Upload size={22} />}
            <span className="font-semibold">{answers[q.id]?.fileName ?? 'Yuklash uchun bosing'}</span>
            <input
              type="file"
              hidden
              accept={q.type === 'photo' ? 'image/*' : '.pdf,.doc,.docx,image/*'}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > MAX_FILE && q.type === 'file') return setErr((x) => ({ ...x, [q.id]: 'Fayl hajmi 1.5 MB dan oshmasin' }))
                setErr((x) => ({ ...x, [q.id]: '' }))
                setA(q.id, await fileToDataUrl(f, q.type === 'photo' ? 400 : 1600), f.name)
              }}
            />
          </label>
        )
        break
      default:
        input = <input className={fieldCls} value={val} onChange={(e) => setA(q.id, e.target.value)} />
    }
    return (
      <div key={q.id} id={q.id}>
        <Label text={q.text} required={q.required} />
        {input}
        {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-xl px-6 py-12">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">{v.title}</span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">Anketani to'ldiring</h1>
        <p className="mt-2 text-sm text-slate-500">Ma'lumotlaringizni kiriting, biz albatta ko'rib chiqamiz.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div id="name">
            <Label text="To'liq ism-familiyangiz" required />
            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Azizbek Olimov" />
            {err.name && <span className="mt-1.5 block text-xs text-red-500">{err.name}</span>}
          </div>
          <div id="phone">
            <Label text="Telefon raqamingiz" required />
            <div className={cn(fieldCls, 'flex items-center gap-2 px-0')}>
              <span className="pl-4 text-sm font-semibold text-slate-500">+998</span>
              <input inputMode="tel" className="h-full flex-1 bg-transparent pr-4 outline-none" placeholder="90 123 45 67" value={formatPhone(phone)} onChange={(e) => setPhone(normalizePhone(e.target.value))} />
            </div>
            {err.phone && <span className="mt-1.5 block text-xs text-red-500">{err.phone}</span>}
          </div>
          {v.questions.map(renderQ)}
          <button type="submit" className="!mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white shadow-xl shadow-brand/30 transition hover:opacity-95 cursor-pointer">
            Yuborish <Send size={17} />
          </button>
          <button type="button" onClick={() => go('info')} className="block w-full text-center text-sm font-semibold text-slate-400 hover:text-slate-700 cursor-pointer">
            Ortga qaytish
          </button>
        </form>
      </main>
    </div>
  )
}
