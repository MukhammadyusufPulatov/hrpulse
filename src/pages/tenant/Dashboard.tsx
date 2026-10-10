import { useNavigate } from 'react-router-dom'
import { Briefcase, Cake, FileSpreadsheet, PieChart as PieIcon, BarChart3, TrendingUp, UserPlus, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar, Badge, Button, Card, Empty, PageHeader } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import { cn, displayPhone, downloadCSV, fmtDate } from '../../lib/utils'
import { daysToBirthday } from './Birthdays'

/** So'nggi 7 kunda qo'shilganlar soni */
const recent = (dates: string[]) => dates.filter((d) => Date.now() - +new Date(d) < 7 * 86_400_000).length

function Metric({ title, value, trend, icon, color, onClick }: { title: string; value: number; trend: number; icon: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className={cn('rounded-3xl p-6', onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md')}>
      <div className="flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: color + '14', color }}>
          {icon}
        </div>
        <span
          title="So'nggi 7 kunda"
          className={cn('rounded-lg px-2 py-1 text-xs font-bold', trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500')}
        >
          {trend > 0 ? `+${trend}` : '0'}
        </span>
      </div>
      <p className="mt-6 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </Card>
  )
}

export function DashboardContent({ embedded = false }: { embedded?: boolean }) {
  const { tenant, inBranch, isAdmin, me } = useTenant()
  const nav = useNavigate()
  const go = (to: string) => (embedded ? undefined : () => nav(to))

  const cands = tenant.candidates.filter((c) => inBranch(c.branchId))
  const recruiting = cands.filter((c) => c.pipeline === 'recruiting')
  const onboarding = cands.filter((c) => c.pipeline === 'onboarding')
  const employees = tenant.employees.filter((e) => inBranch(e.branchId))
  const activeVac = tenant.vacancies.filter((v) => v.active && inBranch(v.branchId))

  const byStage = tenant.stages.map((s) => ({ name: s.name, value: recruiting.filter((c) => c.stageId === s.id).length, color: s.color }))
  const pieData = byStage.filter((x) => x.value > 0)
  const todayBd = employees.filter((e) => e.birthDate && daysToBirthday(e.birthDate) === 0)
  const tasks = tenant.tasks.filter((t) => t.status === 'pending' && (isAdmin || t.assigneeId === me)).slice(0, 5)

  return (
    <div className="space-y-6">
      {embedded && todayBd.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-pink-50 px-5 py-4 text-sm text-pink-700">
          <Cake size={20} />
          <span>
            Bugun <b>{todayBd.map((e) => e.name).join(', ')}</b>ning tug'ilgan kuni. Tabriklashni unutmang!
          </span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Aktiv vakansiyalar" value={activeVac.length} trend={recent(activeVac.map((v) => v.createdAt))} icon={<Briefcase size={22} />} color="#f97316" onClick={go('/app/vacancies')} />
        <Metric title="Xodimlar soni" value={employees.length} trend={recent(employees.map((e) => e.hiredAt))} icon={<Users size={22} />} color="#3b82f6" onClick={go('/app/employees')} />
        <Metric title="Onboardingdagi nomzodlar" value={onboarding.length} trend={recent(onboarding.map((c) => c.stageChangedAt))} icon={<UserPlus size={22} />} color="#22c55e" onClick={go('/app/onboarding')} />
        <Metric title="Rekruitingdagilar" value={recruiting.length} trend={recent(recruiting.map((c) => c.createdAt))} icon={<TrendingUp size={22} />} color="#a855f7" onClick={go('/app/recruiting')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <PieIcon size={18} className="text-orange-500" /> Statistika taqsimoti
          </h3>
          {pieData.length ? (
            <div className="mt-2 grid items-center gap-4 sm:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={6}>
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {byStage.map((d) => (
                  <div key={d.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="Nomzodlar yo'q" text="Rekruiting bo'limiga nomzod qo'shing yoki vakansiya linkini tarqating" />
          )}
        </Card>
        <Card className="rounded-3xl p-6">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <BarChart3 size={18} className="text-blue-500" /> Solishtirma grafik
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 9) + '…' : v)} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={28} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,.1)' }} />
                <Bar dataKey="value" name="Nomzodlar" radius={[10, 10, 0, 0]} barSize={36}>
                  {byStage.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {!embedded && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-900">So'nggi nomzodlar</h3>
              <Button size="sm" variant="ghost" onClick={() => nav('/app/recruiting')}>
                Barchasi
              </Button>
            </div>
            {cands.length === 0 ? (
              <Empty title="Nomzodlar yo'q" />
            ) : (
              <div className="divide-y divide-slate-100">
                {[...cands]
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .slice(0, 5)
                  .map((c) => {
                    const st = [...tenant.stages, ...tenant.onboardingSteps].find((s) => s.id === c.stageId)
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-6 py-3">
                        <Avatar name={c.name} photo={c.photo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {nameOf(tenant.vacancies.map((v) => ({ id: v.id, name: v.title })), c.vacancyId, 'Vakansiyasiz')} · {displayPhone(c.phone)}
                          </p>
                        </div>
                        {st && (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: st.color + '1a', color: st.color }}>
                            {st.name}
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-900">Bajarilishi kerak bo'lgan vazifalar</h3>
              <Button size="sm" variant="ghost" onClick={() => nav('/app/tasks')}>
                Barchasi
              </Button>
            </div>
            {tasks.length === 0 ? (
              <Empty title="Vazifalar yo'q" />
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((t) => {
                  const overdue = t.deadline < new Date().toISOString().slice(0, 10)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.title}</p>
                        <p className="text-xs text-slate-400">{t.assigneeId === 'admin' ? 'Admin' : nameOf(tenant.managers, t.assigneeId)}</p>
                      </div>
                      <Badge tone={overdue ? 'red' : 'slate'}>{fmtDate(t.deadline)}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

export default function TenantDashboard() {
  const { tenant, inBranch } = useTenant()
  const exportCSV = () => {
    const stages = [...tenant.stages, ...tenant.onboardingSteps]
    downloadCSV('nomzodlar', [
      ['Ism-familiya', 'Telefon', 'Vakansiya', 'Kanal', 'Filial', 'Bosqich', "Qo'shilgan sana"],
      ...tenant.candidates
        .filter((c) => inBranch(c.branchId))
        .map((c) => [
          c.name,
          '+998' + c.phone,
          tenant.vacancies.find((v) => v.id === c.vacancyId)?.title,
          nameOf(tenant.channels, c.channelId, ''),
          nameOf(tenant.branches, c.branchId, ''),
          nameOf(stages, c.stageId, ''),
          fmtDate(c.createdAt),
        ]),
    ])
  }
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Xush kelibsiz, bugun HR bo'limidagi ahvol:"
        actions={
          <Button className="!bg-emerald-600 shadow-lg !shadow-emerald-600/25" icon={<FileSpreadsheet size={17} />} onClick={exportCSV}>
            Export Excel
          </Button>
        }
      />
      <DashboardContent />
    </div>
  )
}
