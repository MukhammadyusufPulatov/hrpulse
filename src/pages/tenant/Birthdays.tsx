import { Cake, CalendarDays, Clock, Gift, PartyPopper, User } from 'lucide-react'
import { Button, Card, Empty, PageHeader } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import { DAY } from '../../lib/utils'
import { t } from '../../lib/i18n'

export const MONTHS_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

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
  const noDate = tenant.employees.filter((e) => !e.birthDate && inBranch(e.branchId)).length

  const congrats = (id: string) =>
    update((tn) => {
      const x = tn.employees.find((y) => y.id === id)!
      x.congratulatedYear = x.congratulatedYear === year ? undefined : year
    })

  return (
    <div>
      <PageHeader title={t("Tug'ilgan kunlar")} subtitle={t("Xodimlarning eng yaqin tug'ilgan kunlari")} />
      {list.length === 0 ? (
        <Card className="rounded-3xl">
          <Empty icon={<Cake size={26} />} title={t("Tug'ilgan kunlar yo'q")} text={t("Xodimlar bo'limida tug'ilgan sanalarni kiriting")} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map(({ e, days, age }) => {
            const [y, m, d] = e.birthDate!.split('-').map(Number)
            const today = days === 0
            const done = e.congratulatedYear === year
            return (
              <Card key={e.id} className={`flex flex-wrap items-center gap-5 rounded-3xl p-5 sm:p-6 ${today ? 'border-pink-200 bg-gradient-to-r from-pink-50 to-white' : ''}`}>
                {e.photo ? (
                  <img src={e.photo} alt="" className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:h-24 sm:w-24">
                    <User size={34} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{e.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-bold uppercase tracking-widest text-slate-400">
                      {d} {t(MONTHS_FULL[m - 1])}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <CalendarDays size={15} className="text-brand" /> {y}, {d} {t(MONTHS_FULL[m - 1])}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="text-slate-500">{t("{0} yoshga to'ladi", { 0: age })}</span>
                  </div>
                </div>
                {today ? (
                  done ? (
                    <Button variant="soft" size="lg" icon={<PartyPopper size={17} />} onClick={() => congrats(e.id)}>
                      {t("Tabriklandi")}
                    </Button>
                  ) : (
                    <Button size="lg" className="!bg-pink-500 shadow-lg !shadow-pink-500/25" icon={<Gift size={17} />} onClick={() => congrats(e.id)}>
                      {t("Tabriklash")}
                    </Button>
                  )
                ) : (
                  <span className="flex h-12 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-5 text-sm font-semibold text-slate-400">
                    <Clock size={16} /> {t("Kutilmoqda · {0} kun", { 0: days })}
                  </span>
                )}
              </Card>
            )
          })}
        </div>
      )}
      {noDate > 0 && <p className="mt-6 text-center text-sm text-slate-400">{t("{0} ta xodimning tug'ilgan sanasi kiritilmagan", { 0: noDate })}</p>}
    </div>
  )
}
