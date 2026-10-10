import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, Users } from 'lucide-react'
import { Avatar, Button, Card, Empty, PageHeader, SearchInput } from '../../components/ui'
import { currentSub, subEnd, useDb } from '../../lib/db'
import { displayPhone, fmtDate } from '../../lib/utils'
import { ClientFormModal } from './ClientModals'
import { StatusBadge } from './Subscriptions'

export default function Clients() {
  const db = useDb()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const list = db.clients.filter((c) => !q || `${c.companyName} ${c.contactName} ${c.subdomain}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Mijozlar"
        subtitle={`Jami ${db.clients.length} ta mijoz. Mijozning dashboardini ko'rish uchun ustiga bosing.`}
        actions={
          <>
            <SearchInput value={q} onChange={setQ} className="w-full sm:w-64" />
            <Button onClick={() => setAdding(true)}>+ Mijoz qo'shish</Button>
          </>
        }
      />
      {list.length === 0 ? (
        <Card>
          <Empty icon={<Building2 size={26} />} title="Mijozlar yo'q" action={<Button onClick={() => setAdding(true)}>+ Mijoz qo'shish</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const t = db.tenants[c.id]
            return (
              <Card key={c.id} className="cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => nav(`/super/clients/${c.id}`)}>
                <div className="h-1.5" style={{ background: c.primaryColor }} />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.companyName} color={c.primaryColor} size={46} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{c.companyName}</p>
                      <p className="truncate text-sm text-slate-500">{c.subdomain}.hrpulse.uz</p>
                    </div>
                    <StatusBadge c={c} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users size={13} /> Xodimlar
                      </p>
                      <p className="mt-1 text-lg font-bold">{t?.employees.length ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Briefcase size={13} /> Nomzodlar
                      </p>
                      <p className="mt-1 text-lg font-bold">{t?.candidates.length ?? 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-500">
                    <p>
                      <span className="text-slate-400">Mas'ul:</span> {c.contactName} · {displayPhone(c.phone)}
                    </p>
                    <p>
                      <span className="text-slate-400">Tarif:</span> {currentSub(c)?.tariffName ?? '—'} · {fmtDate(subEnd(c))} gacha
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <ClientFormModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
