import { useSyncExternalStore } from 'react'
import type { Client, DB, Session, Stage, Subscription, SystemStage, Tariff, Tenant } from './types'
import { DAY, addDays, uid } from './utils'
import { t as tr } from './i18n'

/*
 * Ma'lumotlar brauzerning localStorage'ida saqlanadi.
 * Haqiqiy serverga (Firebase / Supabase / REST API) o'tkazishda faqat shu fayl almashtiriladi:
 * barcha sahifalar getDb / updateDb / useDb orqali ishlaydi.
 */

const KEY = 'hrpulse_db_v1'
const SESSION_KEY = 'hrpulse_session'

export function defaultTenant(): Tenant {
  const st = (name: string, color: string, extra: object = {}) => ({ id: uid(), name, color, ...extra })
  return {
    branches: [{ id: uid(), name: 'Bosh filial' }],
    departments: [],
    channels: ['Instagram', 'Telegram', 'OLX', 'HeadHunter', 'Tavsiya'].map((name) => ({ id: uid(), name })),
    stages: [
      st('Yangi nomzod', '#f97316', { system: 'new', description: 'Barcha yangi arizalar shu yerga tushadi' }),
      st("Telefonni ko'tarmadi", '#f59e0b'),
      st("Filtrdan o'tdi", '#22c55e'),
      st('Suhbatga keladi', '#3b82f6'),
      st('1-suhbatga keldi', '#8b5cf6'),
      st('Zaxira', '#64748b'),
      st('Onboarding jarayonida', '#10b981', { system: 'onboarding', toOnboarding: true, description: "Nomzod Onboarding bo'limiga o'tkaziladi" }),
    ],
    onboardingSteps: [
      st('Dastlabki etap', '#3b82f6', { system: 'initial', description: 'Rekruitingdan kelgan nomzodlar' }),
      st("Hujjatlar yig'ish", '#8b5cf6'),
      st('Treningda', '#f59e0b'),
      st('Sinov muddati', '#f97316'),
      st('Ishga olindi', '#10b981', { system: 'hired', description: "Xodimlar bo'limiga o'tkaziladi" }),
    ],
    vacancies: [],
    candidates: [],
    employees: [],
    tasks: [],
    documents: [],
    managers: [],
    notices: [],
  }
}

/**
 * Tizim bosqichlarini joyida ushlab turadi:
 * Rekruiting: "Yangi nomzod" — birinchi, "Onboarding jarayonida" — oxirgi.
 * Onboarding: "Dastlabki etap" — birinchi, "Ishga olindi" — oxirgi.
 */
export function normalizePipelines(t: Tenant) {
  const def = defaultTenant()
  const fix = (list: Stage[], first: SystemStage, last: SystemStage, defs: Stage[]) => {
    let f = list.find((s) => s.system === first)
    let l = list.find((s) => s.system === last)
    if (!f) f = { ...defs.find((s) => s.system === first)!, id: uid() }
    if (!l) l = { ...defs.find((s) => s.system === last)!, id: uid() }
    const middle = list.filter((s) => s !== f && s !== l && !s.system)
    return [f, ...middle, l]
  }
  t.stages = fix(t.stages, 'new', 'onboarding', def.stages)
  t.onboardingSteps = fix(t.onboardingSteps, 'initial', 'hired', def.onboardingSteps)
  // Eski toOnboarding bosqichlaridagi nomzodlar
  const ids = new Set([...t.stages, ...t.onboardingSteps].map((s) => s.id))
  t.candidates.forEach((c) => {
    if (!ids.has(c.stageId)) c.stageId = c.pipeline === 'recruiting' ? t.stages[0].id : t.onboardingSteps[0].id
  })
}

/** Profil ichidagi barcha ma'lumotlarni yagona (asosiy) filialga bog'laydi */
function collapseBranches(t: Tenant) {
  const main = t.branches[0] ?? { id: uid(), name: 'Asosiy' }
  t.branches = [main]
  t.candidates.forEach((c) => (c.branchId = main.id))
  t.employees.forEach((e) => (e.branchId = main.id))
  t.vacancies.forEach((v) => (v.branchId = main.id))
}

/** Bir xil telefon raqamli profillar — bitta mijozning filiallari */
export function filialsOf(c: Client, clients: Client[]) {
  return clients.filter((x) => x.phone === c.phone)
}

/** Eski versiyadagi ma'lumotlarni yangi tuzilmaga o'tkazish */
function migrate(db: DB): DB {
  if (db.version < 2) {
    for (const t of Object.values(db.tenants)) {
      const first = t.stages[0]
      if (first && !first.system) Object.assign(first, { system: 'new', name: 'Yangi nomzod', description: 'Barcha yangi arizalar shu yerga tushadi' })
      const onb = t.stages.find((s) => s.toOnboarding && !s.system)
      if (onb) Object.assign(onb, { system: 'onboarding', name: 'Onboarding jarayonida' })
      const o1 = t.onboardingSteps[0]
      if (o1 && /dastlab/i.test(o1.name)) o1.system = 'initial'
      const last = t.onboardingSteps.at(-1)
      if (last && /ishga|boshladi/i.test(last.name)) Object.assign(last, { system: 'hired', name: 'Ishga olindi' })
      normalizePipelines(t)
    }
    db.version = 2
  }
  if (db.version < 3) {
    // Ichki filiallar olib tashlandi: har bir profil = bitta filial
    for (const t of Object.values(db.tenants)) collapseBranches(t)
    db.version = 3
  }
  return db
}

function sub(t: Tariff, start: string): Subscription {
  return { id: uid(), tariffId: t.id, tariffName: t.name, price: t.price, start, end: addDays(start, t.durationDays) }
}

function seed(): DB {
  const tariffs: Tariff[] = [
    { id: uid(), name: 'Start', price: 300_000, durationDays: 30 },
    { id: uid(), name: 'Biznes', price: 800_000, durationDays: 90 },
    { id: uid(), name: 'Premium', price: 2_900_000, durationDays: 365 },
  ]
  const now = Date.now()
  const ago = (d: number) => new Date(now - d * DAY).toISOString()

  // Demo mijoz — platformani ko'rsatish uchun
  const demoId = uid()
  const demo: Client = {
    id: demoId,
    companyName: 'Demo Akademiya',
    contactName: 'Aziz Karimov',
    phone: '901234567',
    password: 'demo123',
    subdomain: 'demo',
    primaryColor: '#f97316',
    instagram: 'https://instagram.com/',
    createdAt: ago(200),
    subscriptions: [sub(tariffs[1], ago(200)), sub(tariffs[1], ago(110)), sub(tariffs[1], ago(20))],
  }
  const t = defaultTenant()
  t.branches = [{ id: uid(), name: 'Asosiy' }]
  t.departments = ["O'quv bo'limi", 'Sotuv', 'Marketing', 'Administratsiya'].map((name) => ({ id: uid(), name }))
  const [b1] = t.branches
  const b2 = b1
  const [dEdu, dSales, dMkt, dAdm] = t.departments
  t.vacancies = [
    {
      id: uid(), title: 'Ingliz tili o\'qituvchisi', branchId: b1.id, departmentId: dEdu.id, type: 'full_time',
      talents: "Raqobatbardosh maosh\nMalaka oshirish kurslari\nQulay ish muhiti",
      requirements: 'IELTS 7.0+\nKamida 1 yillik tajriba\nMuloqotga kirishuvchanlik',
      questions: [
        { id: uid(), text: 'IELTS balingiz?', type: 'text', options: [], required: true },
        { id: uid(), text: 'Qaysi vaqtda ishlay olasiz?', type: 'select', options: ['Ertalab', 'Tushdan keyin', 'Kechqurun'], required: true },
      ],
      active: true, createdAt: ago(40),
    },
    {
      id: uid(), title: 'Sotuv menejeri', branchId: b2.id, departmentId: dSales.id, type: 'full_time',
      talents: 'Oylik + KPI bonus\nKarera o\'sishi', requirements: 'Sotuvda tajriba\nRus tilini bilish',
      questions: [], active: true, createdAt: ago(25),
    },
    {
      id: uid(), title: 'SMM mutaxassis', branchId: b1.id, departmentId: dMkt.id, type: 'part_time',
      talents: 'Masofaviy ishlash imkoniyati', requirements: 'Portfolio\nCanva / Figma',
      questions: [], active: false, createdAt: ago(60),
    },
  ]
  const names = [
    ['Dilnoza Rahimova', '901112233'], ['Jasur Toshmatov', '935554433'], ['Malika Yusupova', '977778899'],
    ['Sardor Aliyev', '998887766'], ['Nodira Sobirova', '911234455'], ['Bekzod Ergashev', '933216547'],
    ['Shahzoda Qodirova', '946541230'], ['Otabek Nazarov', '900001122'], ['Kamola Islomova', '881239876'],
    ['Ulug\'bek Saidov', '950123456'],
  ]
  t.candidates = names.map(([name, phone], i) => {
    const onboarding = i >= 8
    const stage = onboarding ? t.onboardingSteps[i - 8] : t.stages[i % 6]
    const vac = t.vacancies[i % 3]
    return {
      id: uid(), name, phone, branchId: vac.branchId, vacancyId: vac.id, channelId: t.channels[i % 5].id,
      pipeline: onboarding ? 'onboarding' : 'recruiting', stageId: stage.id, extra: [], answers: [], comments: [],
      createdAt: ago(30 - i * 2), stageChangedAt: ago(10 - i),
    }
  })
  const emp = (name: string, phone: string, branchId: string, dep: string, position: string, birth: string, hired: number, langs: string[], cert?: string) => ({
    id: uid(), name, phone, branchId, departmentId: dep, position, birthDate: birth, languages: langs, certificate: cert,
    hiredAt: ago(hired), appliedAt: ago(hired + 9 + (hired % 7)), channelId: t.channels[hired % 5].id, extra: [],
  })
  const d = new Date()
  const bd = (offsetDays: number, year: number) => {
    const x = new Date(d.getTime() + offsetDays * DAY)
    return `${year}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }
  t.employees = [
    emp('Aziza Mirzayeva', '901230011', b1.id, dEdu.id, 'Ingliz tili o\'qituvchisi', bd(0, 1996), 180, ["O'zbek", 'Ingliz', 'Rus'], 'IELTS 8.0'),
    emp('Rustam Xolmatov', '935671234', b2.id, dSales.id, 'Sotuv menejeri', bd(5, 1993), 120, ["O'zbek", 'Rus']),
    emp('Gulnora Tursunova', '977001122', b1.id, dAdm.id, 'Administrator', bd(12, 1999), 90, ["O'zbek", 'Rus', 'Ingliz']),
    emp('Javohir Umarov', '909998877', b2.id, dMkt.id, 'Marketolog', bd(40, 1997), 45, ["O'zbek", 'Ingliz'], 'Google Ads sertifikati'),
    emp('Feruza Hamidova', '943332211', b1.id, dEdu.id, 'Matematika o\'qituvchisi', bd(-20, 1994), 300, ["O'zbek", 'Rus']),
  ]
  const m1 = { id: uid(), name: 'Zarina Ahmedova', phone: '991112233', password: 'hr123', createdAt: ago(150) }
  t.managers = [m1]
  t.tasks = [
    { id: uid(), title: 'Yangi nomzodlarga qo\'ng\'iroq qilish', description: 'Yangi nomzod bosqichidagi barcha nomzodlar bilan bog\'laning', assigneeId: m1.id, deadline: addDays(new Date(), 2).slice(0, 10), status: 'pending', createdAt: ago(1) },
    { id: uid(), title: 'Instagram uchun vakansiya posti', description: '', assigneeId: m1.id, deadline: addDays(new Date(), -3).slice(0, 10), status: 'done', createdAt: ago(6) },
  ]
  t.documents = [
    { id: uid(), name: 'Mehnat shartnomasi namunasi', kind: 'link', url: 'https://docs.google.com', createdAt: ago(50) },
    { id: uid(), name: 'Ichki tartib qoidalari', kind: 'link', url: 'https://docs.google.com', createdAt: ago(30) },
  ]

  // Ikkinchi filial: xuddi shu telefon raqamga ochilgan alohida profil
  const filialId = uid()
  const filial: Client = {
    ...demo,
    id: filialId,
    companyName: 'Demo Akademiya — Yunusobod',
    subdomain: 'demo-yunusobod',
    createdAt: ago(60),
    subscriptions: [sub(tariffs[1], ago(60)), sub(tariffs[1], ago(1))],
  }
  const t2 = defaultTenant()
  t2.departments = [{ id: uid(), name: "O'quv bo'limi" }]

  return {
    version: 3,
    superAdmin: { phone: '930871205', password: '1422dev', name: 'Super Admin' },
    tariffs,
    clients: [demo, filial],
    tenants: { [demoId]: t, [filialId]: t2 },
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = migrate(JSON.parse(raw))
      localStorage.setItem(KEY, JSON.stringify(db))
      return db
    }
  } catch {
    /* buzilgan ma'lumot — qaytadan yaratamiz */
  }
  const db = seed()
  localStorage.setItem(KEY, JSON.stringify(db))
  return db
}

let state: DB = load()
const listeners = new Set<() => void>()

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Boshqa oynada (masalan, ariza sahifasida) o'zgarish bo'lsa — sinxronlash
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) {
    state = JSON.parse(e.newValue)
    listeners.forEach((l) => l())
  }
})

export const getDb = () => state

export function updateDb(fn: (draft: DB) => void) {
  const draft = structuredClone(state)
  fn(draft)
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    alert("Brauzer xotirasi to'ldi. Katta fayl va rasmlarni o'chirib ko'ring.")
    return
  }
  state = draft
  listeners.forEach((l) => l())
}

export const useDb = () => useSyncExternalStore(subscribe, getDb)

export function resetDb() {
  localStorage.removeItem(KEY)
  state = load()
  listeners.forEach((l) => l())
}

// ---------- Sessiya ----------
let session: Session | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
})()
const sessionListeners = new Set<() => void>()

export function setSession(s: Session | null) {
  session = s
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
  sessionListeners.forEach((l) => l())
}

export const useSession = () =>
  useSyncExternalStore(
    (l) => {
      sessionListeners.add(l)
      return () => sessionListeners.delete(l)
    },
    () => session,
  )

// ---------- Obuna yordamchilari ----------
export type SubStatus = 'active' | 'expiring' | 'expired' | 'none'
export const EXPIRING_DAYS = 7

export function currentSub(c: Client): Subscription | undefined {
  const now = new Date().toISOString()
  return (
    c.subscriptions.find((s) => s.start <= now && s.end >= now) ??
    [...c.subscriptions].sort((a, b) => (a.end < b.end ? 1 : -1))[0]
  )
}

export function subEnd(c: Client) {
  return c.subscriptions.reduce((m, s) => (s.end > m ? s.end : m), '')
}

export function daysLeft(c: Client) {
  const end = subEnd(c)
  if (!end) return -1
  return Math.ceil((+new Date(end) - Date.now()) / DAY)
}

export function subStatus(c: Client): SubStatus {
  if (!c.subscriptions.length) return 'none'
  const d = daysLeft(c)
  if (d < 0) return 'expired'
  if (d <= EXPIRING_DAYS) return 'expiring'
  return 'active'
}

/** Mijozning platforma bilan ishlagan kunlari (birinchi obunadan bugungacha yoki oxirgi obuna tugaguncha) */
export function lifetimeDays(c: Client) {
  if (!c.subscriptions.length) return 0
  const first = c.subscriptions.reduce((m, s) => (s.start < m ? s.start : m), c.subscriptions[0].start)
  const last = Math.min(Date.now(), +new Date(subEnd(c)))
  return Math.max(0, (last - +new Date(first)) / DAY)
}

export const revenue = (c: Client) => c.subscriptions.reduce((s, x) => s + x.price, 0)

export function canLogin(c: Client): string | null {
  if (c.blocked) return tr("Profil vaqtincha bloklangan. Administrator bilan bog'laning.")
  if (subStatus(c) === 'expired' || subStatus(c) === 'none') return tr("Obuna muddati tugagan. Administrator bilan bog'laning.")
  return null
}
