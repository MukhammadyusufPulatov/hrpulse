import { useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Link2, Trash2, Upload } from 'lucide-react'
import { Button, Card, Empty, IconButton, Input, Modal, PageHeader, SearchInput, Tabs, toast } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import { fileToDataUrl, fmtDate, uid } from '../../lib/utils'

const MAX_FILE = 1.5 * 1024 * 1024

function DocForm({ onClose }: { onClose: () => void }) {
  const { update } = useTenant()
  const [kind, setKind] = useState<'link' | 'file'>('link')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<{ name: string; data: string } | null>(null)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const save = () => {
    if (!name.trim()) return setErr('Nomini kiriting')
    if (kind === 'link' && !/^https?:\/\//.test(url)) return setErr("Link https:// bilan boshlanishi kerak")
    if (kind === 'file' && !file) return setErr('Fayl tanlang')
    update((t) =>
      t.documents.unshift({ id: uid(), name: name.trim(), kind, url: kind === 'link' ? url : file!.data, fileName: file?.name, createdAt: new Date().toISOString() }),
    )
    toast("Hujjat qo'shildi")
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Hujjat qo'shish"
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
        <Tabs
          value={kind}
          onChange={setKind}
          items={[
            { value: 'link', label: 'Link' },
            { value: 'file', label: 'Fayl' },
          ]}
        />
        <Input label="Nomi" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Mehnat shartnomasi" autoFocus />
        {kind === 'link' ? (
          <Input label="Link URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        ) : (
          <div>
            <button type="button" onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-sm text-slate-500 hover:border-brand hover:text-brand cursor-pointer">
              <Upload size={22} />
              {file ? <b className="text-slate-700">{file.name}</b> : 'Fayl tanlash uchun bosing (1.5 MB gacha)'}
            </button>
            <input
              ref={ref}
              type="file"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > MAX_FILE) return setErr('Fayl hajmi 1.5 MB dan oshmasligi kerak')
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
  const list = tenant.documents.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHeader
        title="Hujjatlar"
        subtitle="HR uchun zaruriy hujjatlar va fayllar maskani"
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Fayllardan qidirish..." className="w-full sm:w-64" />
            <Button onClick={() => setForm(true)}>+ Qo'shish</Button>
          </>
        }
      />
      {list.length === 0 ? (
        <Card>
          <Empty icon={<FileText size={26} />} title="Hujjatlar yo'q" action={<Button onClick={() => setForm(true)}>+ Qo'shish</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((d) => (
            <Card key={d.id} className="group flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">{d.kind === 'link' ? <Link2 size={22} /> : <FileText size={22} />}</div>
                <IconButton
                  tone="danger"
                  onClick={() => {
                    if (confirm(`"${d.name}" hujjatini o'chirasizmi?`)) update((t) => (t.documents = t.documents.filter((x) => x.id !== d.id)))
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
              <p className="mt-4 font-bold text-slate-800">{d.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{d.kind === 'link' ? d.url : d.fileName}</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-xs text-slate-400">{fmtDate(d.createdAt)}</span>
                {d.kind === 'link' ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    Ochish <ExternalLink size={14} />
                  </a>
                ) : (
                  <a href={d.url} download={d.fileName} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    Yuklab olish <Download size={14} />
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
