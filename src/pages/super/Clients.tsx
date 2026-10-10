import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, Users } from 'lucide-react'
import { Avatar, Button, Card, Empty, PageHeader, SearchInput } from '../../components/ui'
import { currentSub, filialsOf, subEnd, useDb } from '../../lib/db'
import { displayPhone, fmtDate } from '../../lib/utils'
import { ClientFormModal } from './ClientModals'
import { StatusBadge } from './Subscriptions'
import { t } from '../../lib/i18n'

export default function Clients() {
  const db = useDb()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const list = db.clients.filter((c) => !q || `${c.companyName} ${c.contactName} ${c.subdomain}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageHeader
        title={t("Mijozlar")}
        subtitle={t("Jami {0} ta mijoz. Mijozning dashboardini ko'rish uchun ustiga bosing.", { 0: db.clients.length })}
        actions={
          <>
            <SearchInput value={q} onChange={setQ} className="w-full sm:w-64" />
            <Button onClick={() => setAdding(true)}>{t("+ Mijoz qo'shish")}</Button>
          </>
        }
      />
      {list.length === 0 ? (
        <Card>
          <Empty icon={<Building2 size={26} />} title={t("Mijozlar yo'q")} action={<Button onClick={() => setAdding(true)}>{t("+ Mijoz qo'shish")}</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const tn = db.tenants[c.id]
            return (
              <Card key={c.id} className="cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => nav(`/super/clients/${c.id}`)}>
                <div className="h-1.5" style={{ background: c.primaryColor }} />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.companyName} color={c.primaryColor} size={46} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{c.companyName}</p>
                      <p className="truncate text-sm text-slate-500">
                        {c.subdomain}.hrpulse.uz
                        {filialsOf(c, db.clients).length > 1 && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-600">{t("{0} filial", { 0: filialsOf(c, db.clients).length })}</span>}
                      </p>
                    </div>
                    <StatusBadge c={c} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users size={13} /> {t("Xodimlar")}
                      </p>
                      <p className="mt-1 text-lg font-bold">{tn?.employees.length ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Briefcase size={13} /> {t("Nomzodlar")}
                      </p>
                      <p className="mt-1 text-lg font-bold">{tn?.candidates.length ?? 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-500">
                    <p>
                      <span className="text-slate-400">{t("Mas'ul:")}</span> {c.contactName} · {displayPhone(c.phone)}
                    </p>
                    <p>
                      <span className="text-slate-400">{t("Tarif:")}</span> {currentSub(c)?.tariffName ?? '—'} · {t("{0} gacha", { 0: fmtDate(subEnd(c)) })}
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
