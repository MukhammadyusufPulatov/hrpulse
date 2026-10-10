import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, KeyRound, Pencil, RefreshCw } from 'lucide-react'
import { Avatar, Button, Card, Empty, Table } from '../../components/ui'
import { currentSub, lifetimeDays, revenue, subEnd, useDb } from '../../lib/db'
import { TenantProvider } from '../../lib/tenant'
import { displayPhone, fmtDate, money } from '../../lib/utils'
import { DashboardContent } from '../tenant/Dashboard'
import { ClientFormModal, RenewModal, SetPasswordModal } from './ClientModals'
import { StatusBadge } from './Subscriptions'

export default function ClientView({ id }: { id: string }) {
  const db = useDb()
  const nav = useNavigate()
  const c = db.clients.find((x) => x.id === id)
  const [edit, setEdit] = useState(false)
  const [pw, setPw] = useState(false)
  const [renew, setRenew] = useState(false)
  if (!c) return <Empty title="Mijoz topilmadi" action={<Button onClick={() => nav('/super/clients')}>Mijozlar ro'yxati</Button>} />
  const t = db.tenants[c.id]
  const s = currentSub(c)

  return (
    <div>
      <button onClick={() => nav('/super/clients')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        <ArrowLeft size={16} /> Mijozlar
      </button>

      <Card className="overflow-hidden">
        <div className="h-2" style={{ background: c.primaryColor }} />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-4">
            <Avatar name={c.companyName} color={c.primaryColor} size={60} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{c.companyName}</h1>
                <StatusBadge c={c} />
              </div>
              <Link to={`/c/${c.subdomain}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
                {c.subdomain}.hrpulse.uz <ExternalLink size={13} />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<KeyRound size={16} />} onClick={() => setPw(true)}>
              Parol o'rnatish
            </Button>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEdit(true)}>
              Tahrirlash
            </Button>
            <Button icon={<RefreshCw size={16} />} onClick={() => setRenew(true)}>
              Uzaytirish
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-5">
          {[
            ["Mas'ul shaxs", c.contactName],
            ['Telefon', displayPhone(c.phone)],
            ['Tarif', s ? `${s.tariffName} · ${money(s.price)}` : '—'],
            ['Obuna tugashi', fmtDate(subEnd(c))],
            ['Platformada', `${(lifetimeDays(c) / 30).toFixed(1)} oy · ${money(revenue(c))}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-6 py-4">
              <p className="text-xs font-medium text-slate-400">{k}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-4 mt-8 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Mijoz dashboardi</h2>
          <p className="text-sm text-slate-500">Mijozning HR ko'rsatkichlari (faqat ko'rish rejimi)</p>
        </div>
      </div>
      {t ? (
        <TenantProvider clientId={c.id} readOnly>
          <div style={{ ['--brand' as string]: c.primaryColor }}>
            <DashboardContent embedded />
          </div>
        </TenantProvider>
      ) : (
        <Empty title="Ma'lumot yo'q" />
      )}

      <Card className="mt-6">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">To'lovlar tarixi</h3>
        </div>
        <Table head={['Tarif', 'Summa', 'Boshlanish', 'Tugash']}>
          {[...c.subscriptions].reverse().map((x) => (
            <tr key={x.id}>
              <td className="px-5 py-3 font-semibold">{x.tariffName}</td>
              <td className="px-5 py-3">{money(x.price)}</td>
              <td className="px-5 py-3 text-slate-500">{fmtDate(x.start)}</td>
              <td className="px-5 py-3 text-slate-500">{fmtDate(x.end)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <ClientFormModal open={edit} client={c} onClose={() => setEdit(false)} />
      <SetPasswordModal client={pw ? c : null} onClose={() => setPw(false)} />
      <RenewModal client={renew ? c : null} onClose={() => setRenew(false)} />
    </div>
  )
}
