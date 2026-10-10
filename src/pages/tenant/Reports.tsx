import { Clock, Filter, TrendingUp, UserCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Empty, PageHeader, StatCard } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import { DAY, MONTHS } from '../../lib/utils'

const PALETTE = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']
const tip = { borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }

export default function Reports() {
  const { tenant, inBranch } = useTenant()
  const cands = tenant.candidates.filter((c) => inBranch(c.branchId))
  const emps = tenant.employees.filter((e) => inBranch(e.branchId))

  const hired = emps.filter((e) => e.appliedAt)
  const tth = hired.length ? hired.reduce((s, e) => s + (+new Date(e.hiredAt) - +new Date(e.appliedAt!)) / DAY, 0) / hired.length : 0

  // Kanallar bo'yicha: nomzodlar + ishga olinganlar
  const byChannel = tenant.channels
    .map((ch) => ({
      name: ch.name,
      count: cands.filter((c) => c.channelId === ch.id).length + hired.filter((e) => e.channelId === ch.id).length,
      hired: hired.filter((e) => e.channelId === ch.id).length,
    }))
    .filter((x) => x.count > 0)

  const total = cands.length + hired.length
  const conversion = total ? (hired.length / total) * 100 : 0

  // So'nggi 6 oy: yangi nomzodlar va ishga olinganlar
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { y: d.getFullYear(), m: d.getMonth(), name: MONTHS[d.getMonth()], nomzodlar: 0, ishga: 0 }
  })
  const bump = (iso: string | undefined, k: 'nomzodlar' | 'ishga') => {
    if (!iso) return
    const d = new Date(iso)
    const x = months.find((m) => m.y === d.getFullYear() && m.m === d.getMonth())
    if (x) x[k]++
  }
  cands.forEach((c) => bump(c.createdAt, 'nomzodlar'))
  hired.forEach((e) => {
    bump(e.appliedAt, 'nomzodlar')
    bump(e.hiredAt, 'ishga')
  })

  // Voronka: har bir bosqichdagi nomzodlar
  const funnel = [...tenant.stages.map((s) => ({ ...s, pipe: 'recruiting' })), ...tenant.onboardingSteps.map((s) => ({ ...s, pipe: 'onboarding' }))]
    .filter((s) => !('toOnboarding' in s && s.toOnboarding))
    .map((s) => ({ name: s.name, color: s.color, value: cands.filter((c) => c.stageId === s.id).length }))
  const maxF = Math.max(1, ...funnel.map((f) => f.value))

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="HR samaradorligi va nomzodlar tahlili" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Time-To-Hire (o'rtacha)" value={`${tth.toFixed(1)} kun`} sub="Nomzod tushganidan ishga olingungacha" icon={<Clock size={22} />} tone="orange" />
        <StatCard title="Jami nomzodlar" value={total} sub="Barcha kanallardan" icon={<Filter size={22} />} tone="blue" />
        <StatCard title="Ishga olinganlar" value={hired.length} sub="Nomzoddan xodimga" icon={<UserCheck size={22} />} tone="green" />
        <StatCard title="Konversiya" value={`${conversion.toFixed(1)}%`} sub="Nomzod → xodim" icon={<TrendingUp size={22} />} tone="purple" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <h3 className="font-bold text-slate-900">Kanallar samaradorligi</h3>
          <p className="text-sm text-slate-400">Har bir kanaldan kelgan nomzodlar va ishga olinganlar</p>
          {byChannel.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={28} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tip} />
                  <Bar dataKey="count" name="Nomzodlar" fill="var(--brand)" radius={[10, 10, 0, 0]} barSize={30} />
                  <Bar dataKey="hired" name="Ishga olingan" fill="#10b981" radius={[10, 10, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="Ma'lumot yetarli emas" />
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Nomzodlar manbalari</h3>
          {byChannel.length ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byChannel} dataKey="count" innerRadius={55} outerRadius={80} paddingAngle={5}>
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
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold">
                      {c.count} <span className="font-normal text-slate-400">({((c.count / total) * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty title="Ma'lumot yo'q" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Oylik dinamika</h3>
          <p className="text-sm text-slate-400">So'nggi 6 oy</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={28} />
                <Tooltip contentStyle={tip} />
                <Line type="monotone" dataKey="nomzodlar" name="Yangi nomzodlar" stroke="var(--brand)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="ishga" name="Ishga olinganlar" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Nomzodlar voronkasi</h3>
          <p className="text-sm text-slate-400">Hozirgi holat bo'yicha bosqichlar</p>
          <div className="mt-5 space-y-3">
            {funnel.map((f) => (
              <div key={f.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{f.name}</span>
                  <span className="font-bold">{f.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(f.value / maxF) * 100}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
