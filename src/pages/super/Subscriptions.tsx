import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, KeyRound, Lock, Pencil, RefreshCw, Trash2, Unlock } from 'lucide-react'
import { Avatar, Badge, Button, Card, Empty, IconButton, PageHeader, SearchInput, Table, Tabs, toast } from '../../components/ui'
import { currentSub, daysLeft, subEnd, subStatus, updateDb, useDb, type SubStatus } from '../../lib/db'
import type { Client } from '../../lib/types'
import { displayPhone, fmtDate, money } from '../../lib/utils'
import { ClientFormModal, RenewModal, SetPasswordModal } from './ClientModals'

export function StatusBadge({ c }: { c: Client }) {
  const s = subStatus(c)
  const d = daysLeft(c)
  if (c.blocked) return <Badge tone="slate">Bloklangan</Badge>
  if (s === 'active') return <Badge tone="green">Aktiv · {d} kun</Badge>
  if (s === 'expiring') return <Badge tone="orange">{d === 0 ? 'Bugun tugaydi' : `${d} kun qoldi`}</Badge>
  if (s === 'expired') return <Badge tone="red">Tugagan</Badge>
  return <Badge>Obuna yo'q</Badge>
}

export default function Subscriptions() {
  const db = useDb()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | SubStatus>((params.get('filter') as SubStatus) || 'all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Client | undefined>()
  const [pwFor, setPwFor] = useState<Client | null>(null)
  const [renewFor, setRenewFor] = useState<Client | null>(null)

  useEffect(() => {
    if (params.get('add')) setAdding(true)
    const r = params.get('renew')
    if (r) setRenewFor(db.clients.find((c) => c.id === r) ?? null)
    if (params.get('add') || r) setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = db.clients.filter((c) => {
    const s = subStatus(c)
    if (filter !== 'all' && s !== filter) return false
    const t = q.toLowerCase()
    return !t || [c.companyName, c.contactName, c.phone, c.subdomain].some((x) => x.toLowerCase().includes(t))
  })

  const remove = (c: Client) => {
    if (!confirm(`"${c.companyName}" mijozini va uning barcha ma'lumotlarini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`)) return
    updateDb((d) => {
      d.clients = d.clients.filter((x) => x.id !== c.id)
      delete d.tenants[c.id]
    })
    toast("Mijoz o'chirildi")
  }

  const toggleBlock = (c: Client) =>
    updateDb((d) => {
      const x = d.clients.find((y) => y.id === c.id)!
      x.blocked = !x.blocked
    })

  const count = (s: SubStatus) => db.clients.filter((c) => subStatus(c) === s).length

  return (
    <div>
      <PageHeader title="Obunalar" subtitle="Mijozlar, ularning tariflari va kirish ma'lumotlari" actions={<Button onClick={() => setAdding(true)}>+ Mijoz qo'shish</Button>} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="overflow-x-auto">
            <Tabs
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: `Barchasi (${db.clients.length})` },
                { value: 'active', label: `Aktiv (${count('active')})` },
                { value: 'expiring', label: `Tugayapti (${count('expiring')})` },
                { value: 'expired', label: `Tugagan (${count('expired')})` },
              ]}
            />
          </div>
          <SearchInput value={q} onChange={setQ} placeholder="Kompaniya, telefon, subdomain..." className="md:w-72" />
        </div>

        {list.length === 0 ? (
          <Empty title="Mijozlar topilmadi" text="Yangi mijoz qo'shish uchun yuqoridagi tugmani bosing" action={<Button onClick={() => setAdding(true)}>+ Mijoz qo'shish</Button>} />
        ) : (
          <Table head={['Kompaniya', "Mas'ul shaxs", 'Sub-domain sayti', 'Tarif', 'Muddati', 'Holati', '']}>
            {list.map((c) => {
              const s = currentSub(c)
              return (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <button onClick={() => nav(`/super/clients/${c.id}`)} className="flex items-center gap-3 text-left cursor-pointer">
                      <Avatar name={c.companyName} color={c.primaryColor} size={38} />
                      <div>
                        <p className="font-semibold text-slate-800 hover:text-brand">{c.companyName}</p>
                        <p className="text-xs text-slate-400">Qo'shilgan: {fmtDate(c.createdAt)}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700">{c.contactName}</p>
                    <p className="text-xs text-slate-400">{displayPhone(c.phone)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Link to={`/c/${c.subdomain}`} target="_blank" title="Mijozning kirish sahifasi" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                      {c.subdomain}.hrpulse.uz <ExternalLink size={13} />
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-700">{s?.tariffName ?? '—'}</p>
                    <p className="text-xs text-slate-400">{s ? money(s.price) : ''}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(subEnd(c))}</td>
                  <td className="px-5 py-4">
                    <StatusBadge c={c} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="soft" icon={<KeyRound size={14} />} onClick={() => setPwFor(c)}>
                        Parol o'rnatish
                      </Button>
                      <IconButton title="Obunani uzaytirish" onClick={() => setRenewFor(c)}>
                        <RefreshCw size={16} />
                      </IconButton>
                      <IconButton title="Tahrirlash" onClick={() => setEditing(c)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton title={c.blocked ? 'Blokdan chiqarish' : 'Bloklash'} onClick={() => toggleBlock(c)}>
                        {c.blocked ? <Unlock size={16} /> : <Lock size={16} />}
                      </IconButton>
                      <IconButton title="O'chirish" tone="danger" onClick={() => remove(c)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <ClientFormModal open={adding || !!editing} client={editing} onClose={() => (setAdding(false), setEditing(undefined))} />
      <SetPasswordModal client={pwFor} onClose={() => setPwFor(null)} />
      <RenewModal client={renewFor} onClose={() => setRenewFor(null)} />
    </div>
  )
}
