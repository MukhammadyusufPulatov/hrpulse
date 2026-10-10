import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, MapPin, Upload } from 'lucide-react'
import { Badge, Button, Empty, Input, PhoneInput, Textarea } from '../../components/ui'
import { canLogin, updateDb, useDb } from '../../lib/db'
import { SUPER_BRAND, useBrand } from '../../lib/theme'
import { nameOf } from '../../lib/tenant'
import type { Answer } from '../../lib/types'
import { cn, fileToDataUrl, uid } from '../../lib/utils'

const MAX_FILE = 1.5 * 1024 * 1024

export default function Apply() {
  const { sub, vacancyId, channelId } = useParams()
  const db = useDb()
  const client = db.clients.find((c) => c.subdomain === sub)
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  const t = client && db.tenants[client.id]
  const v = t?.vacancies.find((x) => x.id === vacancyId)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<Record<string, { value: string; fileName?: string }>>({})
  const [err, setErr] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!client || !t || !v || !v.active || canLogin(client))
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty title="Vakansiya topilmadi" text="Bu vakansiya yopilgan yoki mavjud emas" />
      </div>
    )

  if (sent)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Arizangiz qabul qilindi</h1>
          <p className="mt-2 text-slate-500">HR menejerimiz sizga tez orada aloqaga chiqadi.</p>
          <Link to={`/c/${client.subdomain}`} className="mt-6 inline-block text-sm font-semibold text-brand">
            Boshqa vakansiyalar
          </Link>
        </div>
      </div>
    )

  const setA = (id: string, value: string, fileName?: string) => setAnswers((a) => ({ ...a, [id]: { value, fileName } }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = 'Ism-familiyangizni kiriting'
    if (phone.length !== 9) er.phone = "Telefon raqamni to'liq kiriting"
    v.questions.forEach((q) => {
      if (q.required && !answers[q.id]?.value) er[q.id] = 'Majburiy savol'
    })
    setErr(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const now = new Date().toISOString()
    const list: Answer[] = v.questions.map((q) => ({ question: q.text, type: q.type, value: answers[q.id]?.value ?? '', fileName: answers[q.id]?.fileName }))
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
        stageId: tt.stages[0]?.id ?? '',
        extra: [],
        answers: list,
        comments: [],
        createdAt: now,
        stageChangedAt: now,
      })
      tt.notices.unshift({ id: uid(), to: 'all', text: `Yangi ariza: ${name.trim()} — "${v.title}"${channel ? ` (${channel.name})` : ''}`, at: now, read: false })
    })
    setBusy(false)
    setSent(true)
  }

  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand px-6 pb-20 pt-10 text-white">
        <div className="mx-auto max-w-2xl">
          <Link to={`/c/${client.subdomain}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
            <ArrowLeft size={16} /> {client.companyName}
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{v.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/85">
            <span className="flex items-center gap-1">
              <MapPin size={15} /> {nameOf(t.branches, v.branchId)}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{v.type === 'full_time' ? 'Full-time' : 'Part-time'}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-12 max-w-2xl space-y-4 px-4 pb-16">
        {(v.talents || v.requirements) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Imkoniyatlar', v.talents, 'Kompaniyamiz ajoyib sharoitlar taklif etadi.'],
              ['Talablar', v.requirements, 'Maxsus talablar belgilanmagan.'],
            ].map(([title, text, fallback]) => (
              <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900">{title}</h3>
                <ul className="mt-3 space-y-2">
                  {(lines(text).length ? lines(text) : [fallback]).map((l, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <Check size={16} className="mt-0.5 shrink-0 text-brand" /> {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-extrabold text-slate-900">Anketani to'ldiring</h2>
          <p className="mt-1 text-sm text-slate-500">Ma'lumotlaringizni kiriting, biz albatta ko'rib chiqamiz.</p>
          <div className="mt-6 space-y-5">
            <Input label="To'liq ism-familiyangiz *" value={name} onChange={(e) => setName(e.target.value)} error={err.name} placeholder="Masalan: Azizbek Olimov" />
            <PhoneInput label="Telefon raqamingiz *" value={phone} onChange={setPhone} error={err.phone} />
            {v.questions.map((q) => {
              const label = q.text + (q.required ? ' *' : '')
              const val = answers[q.id]?.value ?? ''
              if (q.type === 'text') return <Textarea key={q.id} label={label} value={val} onChange={(e) => setA(q.id, e.target.value)} error={err[q.id]} className="[&_textarea]:min-h-[60px]" />
              if (q.type === 'select')
                return (
                  <div key={q.id}>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button type="button" key={o} onClick={() => setA(q.id, o)} className={cn('rounded-xl border px-4 py-2 text-sm font-medium cursor-pointer', val === o ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-600')}>
                          {o}
                        </button>
                      ))}
                    </div>
                    {err[q.id] && <span className="mt-1 block text-xs text-red-500">{err[q.id]}</span>}
                  </div>
                )
              if (q.type === 'multi') {
                const sel = val ? val.split(', ') : []
                return (
                  <div key={q.id}>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button
                          type="button"
                          key={o}
                          onClick={() => setA(q.id, (sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]).join(', '))}
                          className={cn('rounded-xl border px-4 py-2 text-sm font-medium cursor-pointer', sel.includes(o) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-600')}
                        >
                          {sel.includes(o) && '✓ '}
                          {o}
                        </button>
                      ))}
                    </div>
                    {err[q.id] && <span className="mt-1 block text-xs text-red-500">{err[q.id]}</span>}
                  </div>
                )
              }
              // photo / file
              return (
                <div key={q.id}>
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 text-sm text-slate-500 hover:border-brand hover:text-brand">
                    {q.type === 'photo' && val ? <img src={val} className="h-24 w-24 rounded-xl object-cover" alt="" /> : <Upload size={22} />}
                    {answers[q.id]?.fileName ?? (q.type === 'photo' ? 'Rasm yuklash uchun bosing' : 'Fayl yuklash uchun bosing (1.5 MB gacha)')}
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
                  {err[q.id] && <span className="mt-1 block text-xs text-red-500">{err[q.id]}</span>}
                </div>
              )
            })}
          </div>
          <Button type="submit" size="lg" className="mt-8 w-full" disabled={busy}>
            Ariza yuborish
          </Button>
        </form>
        <p className="text-center text-xs text-slate-400">
          <Badge>HR PULSE</Badge>
        </p>
      </main>
    </div>
  )
}
