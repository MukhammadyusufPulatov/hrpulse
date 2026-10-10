import { useState } from 'react'
import { BarChart3, Clock, Filter, TrendingUp, UserCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Empty, PageHeader, Tabs } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import { DAY, MONTHS } from '../../lib/utils'

const PALETTE = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']
const tip = { borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }

type Period = 'day' | 'week' | 'month' | 'all'
const PERIOD_LABEL: Record<Period, string> = { day: 'Bugun', week: "So'nggi 7 kun", month: "So'nggi 30 kun", all: 'Butun davr' }

function startOf(p: Period) {
  const now = new Date()
  if (p === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (p === 'week') return Date.now() - 7 * DAY
  if (p === 'month') return Date.now() - 30 * DAY
  return 0
}

/** Grafik uchun vaqt oraliqlari: kunlik — 14 kun, haftalik — 12 hafta, oylik/barchasi — 12 oy */
function buckets(p: Period) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (p === 'day')
    return Array.from({ length: 14 }, (_, i) => {
      const s = today - (13 - i) * DAY
      const d = new Date(s)
      return { name: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`, from: s, to: s + DAY }
    })
  if (p === 'week')
    return Array.from({ length: 12 }, (_, i) => {
      const to = today + DAY - (11 - i) * 7 * DAY
      const d = new Date(to - 7 * DAY)
      return { name: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`, from: to - 7 * DAY, to }
    })
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const e = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1)
    return { name: MONTHS[d.getMonth()], from: d.getTime(), to: e.getTime() }
  })
}

export default function Reports() {
  const { tenant, inBranch } = useTenant()
  const [period, setPeriod] = useState<Period>('month')
  const from = startOf(period)
  const inP = (iso?: string) => !!iso && +new Date(iso) >= from

  const allCands = tenant.candidates.filter((c) => inBranch(c.branchId))
  const allHired = tenant.employees.filter((e) => inBranch(e.branchId) && e.appliedAt)

  // Davr ichida: kelgan arizalar (hozirgi nomzodlar + keyin ishga olinganlar) va ishga olinganlar
  const applied = [...allCands.map((c) => ({ at: c.createdAt, ch: c.channelId })), ...allHired.map((e) => ({ at: e.appliedAt!, ch: e.channelId }))].filter((x) => inP(x.at))
  const hired = allHired.filter((e) => inP(e.hiredAt))
  const tthOf = (list: typeof hired) => (list.length ? list.reduce((s, e) => s + (+new Date(e.hiredAt) - +new Date(e.appliedAt!)) / DAY, 0) / list.length : 0)
  const tth = tthOf(hired)
  const conversion = applied.length ? (hired.length / applied.length) * 100 : 0

  const channels = [...tenant.channels, { id: '', name: "Manbasiz" }]
  const byChannel = channels
    .map((ch) => {
      const h = hired.filter((e) => (e.channelId ?? '') === ch.id)
      const a = applied.filter((x) => (x.ch ?? '') === ch.id).length
      return { name: ch.name, count: a, hired: h.length, conv: a ? (h.length / a) * 100 : 0, tth: tthOf(h) }
    })
    .filter((x) => x.count > 0 || x.hired > 0)

  // Dinamika grafigi tanlangan davrdan qat'i nazar o'z oralig'ini ko'rsatadi
  const allApplied = [...allCands.map((c) => c.createdAt), ...allHired.map((e) => e.appliedAt!)]
  const within = (iso: string, b: { from: number; to: number }) => +new Date(iso) >= b.from && +new Date(iso) < b.to
  const series = buckets(period).map((b) => ({
    name: b.name,
    arizalar: allApplied.filter((at) => within(at, b)).length,
    ishga: allHired.filter((e) => within(e.hiredAt, b)).length,
  }))

  const Stat = ({ title, value, sub, icon, color }: { title: string; value: string | number; sub: string; icon: React.ReactNode; color: string }) => (
    <Card className="rounded-3xl p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: color + '14', color }}>
        {icon}
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </Card>
  )

  return (
    <div>
      <PageHeader
        title="Statistika"
        subtitle="Ishga olish tezligi va manbalar samaradorligi"
        actions={
          <Tabs
            value={period}
            onChange={setPeriod}
            items={[
              { value: 'day', label: 'Kunlik' },
              { value: 'week', label: 'Haftalik' },
              { value: 'month', label: 'Oylik' },
              { value: 'all', label: 'Barchasi' },
            ]}
          />
        }
      />
      <p className="-mt-3 mb-5 text-sm text-slate-400">Davr: <b className="text-slate-600">{PERIOD_LABEL[period]}</b></p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Time-to-hire (o'rtacha)" value={`${tth.toFixed(1)} kun`} sub="Ariza tushganidan ishga olingungacha" icon={<Clock size={22} />} color="#f97316" />
        <Stat title="Kelgan arizalar" value={applied.length} sub="Barcha manbalardan" icon={<Filter size={22} />} color="#3b82f6" />
        <Stat title="Ishga olinganlar" value={hired.length} sub="Nomzoddan xodimga" icon={<UserCheck size={22} />} color="#10b981" />
        <Stat title="Konversiya" value={`${conversion.toFixed(1)}%`} sub="Ariza → xodim" icon={<TrendingUp size={22} />} color="#8b5cf6" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="rounded-3xl p-6 xl:col-span-2">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <BarChart3 size={18} className="text-orange-500" /> Manbalar samaradorligi
          </h3>
          {byChannel.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + '…' : v)} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={30} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tip} />
                  <Bar dataKey="count" name="Arizalar" fill="#f97316" radius={[10, 10, 0, 0]} barSize={28} />
                  <Bar dataKey="hired" name="Ishga olingan" fill="#10b981" radius={[10, 10, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="Bu davrda ma'lumot yo'q" />
          )}
        </Card>
        <Card className="rounded-3xl p-6">
          <h3 className="font-bold text-slate-900">Nomzodlar manbalari</h3>
          {byChannel.length ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byChannel} dataKey="count" innerRadius={55} outerRadius={80} paddingAngle={4}>
                      {byChannel.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {byChannel.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty title="Ma'lumot yo'q" />
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden rounded-3xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">Manbalar bo'yicha batafsil</h3>
          <p className="text-sm text-slate-400">Qaysi manba eng ko'p va eng tez xodim olib keladi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3">Manba</th>
                <th className="px-6 py-3">Arizalar</th>
                <th className="px-6 py-3">Ishga olingan</th>
                <th className="px-6 py-3">Konversiya</th>
                <th className="px-6 py-3">Time-to-hire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byChannel.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Bu davrda ma'lumot yo'q
                  </td>
                </tr>
              )}
              {[...byChannel]
                .sort((a, b) => b.hired - a.hired || b.count - a.count)
                .map((c) => (
                  <tr key={c.name}>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-3.5">{c.count}</td>
                    <td className="px-6 py-3.5">{c.hired}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, c.conv)}%` }} />
                        </div>
                        {c.conv.toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-3.5">{c.hired ? `${c.tth.toFixed(1)} kun` : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 rounded-3xl p-6">
        <h3 className="font-bold text-slate-900">Dinamika</h3>
        <p className="text-sm text-slate-400">{period === 'day' ? "So'nggi 14 kun, kunlik" : period === 'week' ? "So'nggi 12 hafta, haftalik" : "So'nggi 12 oy, oylik"}</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={30} />
              <Tooltip contentStyle={tip} />
              <Line type="monotone" dataKey="arizalar" name="Arizalar" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ishga" name="Ishga olinganlar" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
