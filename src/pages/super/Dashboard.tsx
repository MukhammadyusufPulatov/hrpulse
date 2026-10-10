import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, CheckCircle2, Clock, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar, Badge, Button, Card, Empty, PageHeader, StatCard } from '../../components/ui'
import { EXPIRING_DAYS, currentSub, daysLeft, lifetimeDays, revenue, subEnd, subStatus, useDb } from '../../lib/db'
import { COLORS, MONTHS, fmtDate, money, shortMoney } from '../../lib/utils'

export default function SuperDashboard() {
  const db = useDb()
  const nav = useNavigate()
  const clients = db.clients
  const active = clients.filter((c) => ['active', 'expiring'].includes(subStatus(c)))
  const expiring = clients.filter((c) => subStatus(c) === 'expiring').sort((a, b) => daysLeft(a) - daysLeft(b))
  const expired = clients.filter((c) => subStatus(c) === 'expired')

  const withSubs = clients.filter((c) => c.subscriptions.length)
  const avgMonths = withSubs.length ? withSubs.reduce((s, c) => s + lifetimeDays(c), 0) / withSubs.length / 30 : 0
  const avgRevenue = withSubs.length ? withSubs.reduce((s, c) => s + revenue(c), 0) / withSubs.length : 0
  const totalRevenue = clients.reduce((s, c) => s + revenue(c), 0)

  // So'nggi 6 oy daromadi
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTHS[d.getMonth()], value: 0 }
  })
  clients.forEach((c) =>
    c.subscriptions.forEach((s) => {
      const d = new Date(s.start)
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
      if (m) m.value += s.price
    }),
  )

  // Tariflar bo'yicha taqsimot (aktiv mijozlar)
  const byTariff = Object.values(
    active.reduce<Record<string, { name: string; value: number }>>((acc, c) => {
      const s = currentSub(c)
      const k = s?.tariffName ?? '—'
      acc[k] = acc[k] ?? { name: k, value: 0 }
      acc[k].value++
      return acc
    }, {}),
  )

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platforma bo'yicha umumiy ko'rsatkichlar" actions={<Button onClick={() => nav('/super/subscriptions?add=1')}>+ Mijoz qo'shish</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Aktiv obunalar" value={active.length} sub={`Jami mijozlar: ${clients.length}`} icon={<CheckCircle2 size={22} />} tone="green" onClick={() => nav('/super/subscriptions')} />
        <StatCard title="Yaqinda tugaydi" value={expiring.length} sub={`${EXPIRING_DAYS} kun ichida · tugagan: ${expired.length}`} icon={<AlertTriangle size={22} />} tone="orange" onClick={() => nav('/super/subscriptions?filter=expiring')} />
        <StatCard title="LTV (o'rtacha muddat)" value={`${avgMonths.toFixed(1)} oy`} sub="Mijozning men bilan ishlagan o'rtacha vaqti" icon={<Clock size={22} />} tone="brand" />
        <StatCard title="LTV (o'rtacha daromad)" value={shortMoney(avgRevenue)} sub={`Jami tushum: ${money(totalRevenue)}`} icon={<Wallet size={22} />} tone="purple" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <h3 className="font-bold text-slate-900">Oylik tushum</h3>
          <p className="text-sm text-slate-400">So'nggi 6 oyda sotilgan obunalar</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={shortMoney} width={60} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }} />
                <Bar dataKey="value" name="Tushum" fill="var(--brand)" radius={[10, 10, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Tariflar bo'yicha</h3>
          <p className="text-sm text-slate-400">Aktiv obunalar taqsimoti</p>
          {byTariff.length ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byTariff} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4}>
                      {byTariff.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {byTariff.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {t.name}
                    </span>
                    <span className="font-bold">{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty title="Aktiv obuna yo'q" />
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Obunasi yaqinda tugaydiganlar</h3>
            <p className="text-sm text-slate-400">Mijozlar bilan bog'lanib, obunani uzaytiring</p>
          </div>
        </div>
        {expiring.length === 0 && expired.length === 0 ? (
          <Empty icon={<Building2 size={26} />} title="Hammasi joyida" text={`${EXPIRING_DAYS} kun ichida obunasi tugaydigan mijoz yo'q`} />
        ) : (
          <div className="divide-y divide-slate-100">
            {[...expiring, ...expired].map((c) => {
              const d = daysLeft(c)
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <Avatar name={c.companyName} color={c.primaryColor} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{c.companyName}</p>
                    <p className="text-xs text-slate-400">
                      {c.contactName} · {currentSub(c)?.tariffName} · {fmtDate(subEnd(c))} gacha
                    </p>
                  </div>
                  {d < 0 ? <Badge tone="red">Tugagan</Badge> : <Badge tone="orange">{d === 0 ? 'Bugun tugaydi' : `${d} kun qoldi`}</Badge>}
                  <Button size="sm" variant="soft" onClick={() => nav(`/super/subscriptions?renew=${c.id}`)}>
                    Uzaytirish
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
