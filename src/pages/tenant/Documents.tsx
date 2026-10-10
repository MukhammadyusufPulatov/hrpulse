import { useRef, useState } from 'react'
import { ArrowUpRight, Download, FileText, FolderPlus, Image as ImageIcon, Link2, Search, Trash2, Upload } from 'lucide-react'
import { Button, Card, Empty, IconButton, Input, Modal, PageHeader, toast } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import type { DocItem } from '../../lib/types'
import { cn, fileToDataUrl, fmtDate, uid } from '../../lib/utils'
import { t } from '../../lib/i18n'

const MAX_FILE = 1.5 * 1024 * 1024
type Kind = DocItem['kind']
const KIND_LABEL: Record<Kind, string> = { file: 'Fayl', image: 'Rasm', link: 'Link' }

function ext(name?: string) {
  return name?.split('.').pop()?.toUpperCase() ?? ''
}

function DocForm({ onClose }: { onClose: () => void }) {
  const { update } = useTenant()
  const [kind, setKind] = useState<Kind>('file')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<{ name: string; data: string } | null>(null)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const save = () => {
    if (!name.trim()) return setErr(t('Hujjat nomini kiriting'))
    if (kind === 'link' && !/^https?:\/\//.test(url.trim())) return setErr(t('Link https:// bilan boshlanishi kerak'))
    if (kind !== 'link' && !file) return setErr(kind === 'image' ? t("Rasm tanlang") : t("Fayl tanlang"))
    update((tn) => tn.documents.unshift({ id: uid(), name: name.trim(), kind, url: kind === 'link' ? url.trim() : file!.data, fileName: file?.name, createdAt: new Date().toISOString() }))
    toast(t("Hujjat qo'shildi"))
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("Yangi hujjat")}
      footer={
        <Button size="lg" className="w-full !bg-slate-900" onClick={save}>
          {t("Saqlash")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
          {(['file', 'image', 'link'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => (setKind(k), setFile(null), setErr(''))}
              className={cn('rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-widest transition cursor-pointer', kind === k ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              {t(KIND_LABEL[k])}
            </button>
          ))}
        </div>
        <Input label={t("Nomi")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Masalan: Mehnat shartnomasi")} autoFocus />
        {kind === 'link' ? (
          <Input label={t("Link URL")} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        ) : (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">{t("Tanlash")}</span>
            <button type="button" onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 hover:border-brand hover:text-brand cursor-pointer">
              {kind === 'image' && file ? <img src={file.data} alt="" className="max-h-32 rounded-xl" /> : <Upload size={22} />}
              {file ? <b className="text-slate-700">{file.name}</b> : kind === 'image' ? t('Rasm tanlash uchun bosing (1.5 MB gacha)') : t('Fayl tanlash uchun bosing (1.5 MB gacha)')}
            </button>
            <input
              ref={ref}
              type="file"
              hidden
              accept={kind === 'image' ? 'image/*' : undefined}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                if (f.size > MAX_FILE) return setErr(t('Fayl hajmi 1.5 MB dan oshmasligi kerak'))
                setErr('')
                setFile({ name: f.name, data: await fileToDataUrl(f, 1600) })
                if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
              }}
            />
          </div>
        )}
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
    </Modal>
  )
}

export default function Documents() {
  const { tenant, update } = useTenant()
  const [q, setQ] = useState('')
  const [form, setForm] = useState(false)
  const list = tenant.documents.filter((d) => `${d.name} ${d.fileName ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const icon = (k: Kind) => (k === 'link' ? <Link2 size={22} /> : k === 'image' ? <ImageIcon size={22} /> : <FileText size={22} />)

  return (
    <div>
      <PageHeader
        title={t("Hujjatlar")}
        subtitle={t("HR uchun zaruriy hujjatlar va fayllar maskani")}
        actions={
          <Button size="lg" className="!bg-slate-900 shadow-lg !shadow-slate-900/20" icon={<FolderPlus size={18} />} onClick={() => setForm(true)}>
            {t("Hujjat qo'shish")}
          </Button>
        }
      />
      <div className="relative mb-6 max-w-lg">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm shadow-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder={t("Fayllardan qidirish...")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <Card className="rounded-3xl">
          <Empty icon={<FileText size={26} />} title={q ? t("Hech narsa topilmadi") : t("Hujjatlar yo'q")} action={!q && <Button onClick={() => setForm(true)}>{t("Hujjat qo'shish")}</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((d) => (
            <Card key={d.id} className="group relative flex flex-col rounded-[2rem] p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">{icon(d.kind)}</div>
                <IconButton
                  tone="danger"
                  className="opacity-0 transition group-hover:opacity-100"
                  onClick={() => {
                    if (confirm(t("\"{0}\" hujjatini o'chirasizmi?", { 0: d.name }))) update((tn) => (tn.documents = tn.documents.filter((x) => x.id !== d.id)))
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
              <p className="mt-5 truncate text-lg font-bold text-slate-900" title={d.name}>
                {d.name}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {d.kind === 'link' ? t("Link") : ext(d.fileName) || t(KIND_LABEL[d.kind])} • {t(KIND_LABEL[d.kind])}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs font-semibold text-slate-300">{fmtDate(d.createdAt)}</span>
                {d.kind === 'link' ? (
                  <a href={d.url} target="_blank" rel="noreferrer" title={t("Ochish")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100">
                    <ArrowUpRight size={18} />
                  </a>
                ) : (
                  <a href={d.url} download={d.fileName} title={t("Yuklab olish")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100">
                    <Download size={18} />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {form && <DocForm onClose={() => setForm(false)} />}
    </div>
  )
}
