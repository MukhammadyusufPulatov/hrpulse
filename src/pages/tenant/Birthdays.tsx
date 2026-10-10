import { Cake, Gift, PartyPopper } from 'lucide-react'
import { Avatar, Badge, Button, Card, Empty, PageHeader } from '../../components/ui'
import { nameOf, useTenant } from '../../lib/tenant'
import { DAY, MONTHS, displayPhone } from '../../lib/utils'

/** Keyingi tug'ilgan kungacha qolgan kunlar (0 = bugun) */
export function daysToBirthday(birth: string) {
  const [, m, d] = birth.split('-').map(Number)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), m - 1, d)
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d)
  return Math.round((+next - +today) / DAY)
}

/** Navbatdagi tug'ilgan kunida necha yoshga to'ladi */
function turningAge(birth: string) {
  const next = new Date(Date.now() + daysToBirthday(birth) * DAY)
  return next.getFullYear() - Number(birth.slice(0, 4))
}

export default function Birthdays() {
  const { tenant, update, inBranch } = useTenant()
  const year = new Date().getFullYear()
  const list = tenant.employees
    .filter((e) => e.birthDate && inBranch(e.branchId))
    .map((e) => ({ e, days: daysToBirthday(e.birthDate!), age: turningAge(e.birthDate!) }))
    .sort((a, b) => a.days - b.days)
  const today = list.filter((x) => x.days === 0)
  const upcoming = list.filter((x) => x.days > 0 && x.days <= 30)
  const later = list.filter((x) => x.days > 30)
  const noDate = tenant.employees.filter((e) => !e.birthDate && inBranch(e.branchId)).length

  const congrats = (id: string) =>
    update((t) => {
      const x = t.employees.find((y) => y.id === id)!
      x.congratulatedYear = x.congratulatedYear === year ? undefined : year
    })

  const Row = ({ x }: { x: (typeof list)[number] }) => {
    const [, m, d] = x.e.birthDate!.split('-').map(Number)
    const done = x.e.congratulatedYear === year
    return (
      <div className="flex flex-wrap items-center gap-4 px-6 py-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <span className="text-base font-extrabold leading-none">{d}</span>
          <span className="text-[10px] font-semibold uppercase">{MONTHS[m - 1]}</span>
        </div>
        <Avatar name={x.e.name} photo={x.e.photo} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{x.e.name}</p>
          <p className="text-xs text-slate-400">
            {x.e.position || nameOf(tenant.departments, x.e.departmentId)} · {displayPhone(x.e.phone)}
          </p>
        </div>
        {x.days === 0 ? <Badge tone="red">Bugun · {x.age} yosh</Badge> : <Badge tone={x.days <= 7 ? 'orange' : 'slate'}>{x.days} kundan keyin · {x.age} yosh</Badge>}
        {x.days === 0 &&
          (done ? (
            <Button size="sm" variant="soft" icon={<PartyPopper size={14} />} onClick={() => congrats(x.e.id)}>
              Tabriklandi
            </Button>
          ) : (
            <Button size="sm" icon={<Gift size={14} />} onClick={() => congrats(x.e.id)}>
              Tabriklash
            </Button>
          ))}
      </div>
    )
  }

  const Section = ({ title, items }: { title: string; items: typeof list }) =>
    items.length ? (
      <Card className="mb-6">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">
            {title} <span className="font-normal text-slate-400">({items.length})</span>
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((x) => (
            <Row key={x.e.id} x={x} />
          ))}
        </div>
      </Card>
    ) : null

  return (
    <div>
      <PageHeader title="Tug'ilgan kunlar" subtitle="Xodimlarning eng yaqin tug'ilgan kunlari" />
      {today.length > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 p-5 text-white shadow-lg shadow-pink-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Cake size={26} />
          </div>
          <div>
            <p className="text-lg font-bold">Bugun {today.map((x) => x.e.name).join(', ')}ning tug'ilgan kuni!</p>
            <p className="text-sm text-white/80">Tabriklashni unutmang 🎉</p>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <Card>
          <Empty icon={<Cake size={26} />} title="Yaqin orada tug'ilgan kunlar yo'q" text="Xodimlar bo'limida tug'ilgan sanalarni kiriting" />
        </Card>
      ) : (
        <>
          <Section title="Bugun" items={today} />
          <Section title="Yaqin 30 kun ichida" items={upcoming} />
          <Section title="Keyinroq" items={later} />
        </>
      )}
      {noDate > 0 && <p className="text-center text-sm text-slate-400">{noDate} ta xodimning tug'ilgan sanasi kiritilmagan</p>}
    </div>
  )
}
