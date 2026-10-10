import { useState } from 'react'
import { Calendar, Check, ClipboardList, Trash2, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, Empty, IconButton, Input, Modal, PageHeader, Select, Tabs, Textarea, toast } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import type { Task } from '../../lib/types'
import { fmtDate, todayISO, uid } from '../../lib/utils'

function TaskForm({ onClose }: { onClose: () => void }) {
  const { tenant, update, notify, meName } = useTenant()
  const [f, setF] = useState({ title: '', assigneeId: tenant.managers[0]?.id ?? 'admin', deadline: todayISO(), description: '' })
  const [err, setErr] = useState('')
  const save = () => {
    if (!f.title.trim()) return setErr('Vazifa nomini kiriting')
    update((t) => t.tasks.unshift({ id: uid(), ...f, title: f.title.trim(), status: 'pending', createdAt: new Date().toISOString() }))
    if (f.assigneeId !== 'admin') notify(f.assigneeId, `Yangi vazifa! ${meName}: "${f.title.trim()}" (muddat: ${fmtDate(f.deadline)})`)
    toast("Vazifa qo'shildi")
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Yangi vazifa"
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
        <Input label="Task nomi" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err} placeholder="Task nomi..." autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Mas'ul HR menejer" value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })} options={[{ value: 'admin', label: 'Admin (o\'zim)' }, ...tenant.managers.map((m) => ({ value: m.id, label: m.name }))]} />
          <Input label="Deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        </div>
        <Textarea label="Izoh" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Vazifa haqida batafsil..." />
      </div>
    </Modal>
  )
}

export default function Tasks() {
  const { tenant, update, isAdmin, me, meName, notify } = useTenant()
  const [tab, setTab] = useState<Task['status']>('pending')
  const [form, setForm] = useState(false)
  const [failFor, setFailFor] = useState<Task | null>(null)
  const [reason, setReason] = useState('')

  const visible = tenant.tasks.filter((t) => isAdmin || t.assigneeId === me)
  const list = visible.filter((t) => t.status === tab)
  const count = (s: Task['status']) => visible.filter((t) => t.status === s).length
  const today = todayISO()

  const setStatus = (task: Task, status: Task['status'], why?: string) => {
    update((t) => {
      const x = t.tasks.find((y) => y.id === task.id)!
      x.status = status
      x.reason = why
    })
    if (!isAdmin) notify('admin', `${meName} vazifani ${status === 'done' ? 'bajardi' : 'bajarmadi'}: "${task.title}"${why ? ` — sabab: ${why}` : ''}`)
    toast(status === 'done' ? 'Bajarildi deb belgilandi' : 'Bajarilmadi deb belgilandi', status === 'done' ? 'success' : 'info')
  }

  return (
    <div>
      <PageHeader title="Tasklar" subtitle={isAdmin ? 'HR menejerlar uchun biriktirilgan vazifalar' : 'Sizga biriktirilgan vazifalar'} actions={isAdmin && <Button onClick={() => setForm(true)}>+ Vazifa qo'shish</Button>} />
      <div className="mb-5 overflow-x-auto">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'pending', label: `Kutilmoqda (${count('pending')})` },
            { value: 'done', label: `Bajarildi (${count('done')})` },
            { value: 'failed', label: `Bajarilmadi (${count('failed')})` },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <Card>
          <Empty icon={<ClipboardList size={26} />} title="Vazifalar yo'q" text={tab === 'pending' ? 'Hozircha bajarilishi kerak bo\'lgan vazifa yo\'q' : undefined} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const overdue = t.status === 'pending' && t.deadline < today
            const who = t.assigneeId === 'admin' ? 'Admin' : nameOf(tenant.managers, t.assigneeId, "O'chirilgan menejer")
            return (
              <Card key={t.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-slate-900">{t.title}</p>
                  {isAdmin && (
                    <IconButton
                      tone="danger"
                      onClick={() => {
                        if (confirm("Vazifani o'chirasizmi?")) update((x) => (x.tasks = x.tasks.filter((y) => y.id !== t.id)))
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  )}
                </div>
                {t.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{t.description}</p>}
                {t.reason && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    <b>Sabab:</b> {t.reason}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <div className="flex items-center gap-2">
                    <Avatar name={who} size={28} />
                    <span className="text-sm font-medium text-slate-600">{who}</span>
                  </div>
                  <Badge tone={overdue ? 'red' : 'slate'}>
                    <Calendar size={12} /> {fmtDate(t.deadline)}
                  </Badge>
                </div>
                {t.status === 'pending' && (isAdmin || t.assigneeId === me) && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" icon={<X size={14} />} onClick={() => (setFailFor(t), setReason(''))}>
                      Bajarmadim
                    </Button>
                    <Button size="sm" icon={<Check size={14} />} onClick={() => setStatus(t, 'done')}>
                      Bajardim
                    </Button>
                  </div>
                )}
                {t.status !== 'pending' && isAdmin && (
                  <Button size="sm" variant="ghost" className="mt-3" onClick={() => setStatus(t, 'pending')}>
                    Qayta ochish
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
      {form && <TaskForm onClose={() => setForm(false)} />}
      <Modal
        open={!!failFor}
        onClose={() => setFailFor(null)}
        size="sm"
        title="Sababini ko'rsating"
        subtitle="Nima uchun vazifa bajarilmadi?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFailFor(null)}>
              Bekor qilish
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                setStatus(failFor!, 'failed', reason.trim())
                setFailFor(null)
              }}
            >
              Tasdiqlash
            </Button>
          </>
        }
      >
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sabab..." autoFocus />
      </Modal>
    </div>
  )
}
