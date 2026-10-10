export type ID = string

export interface Tariff {
  id: ID
  name: string
  price: number
  durationDays: number
}

export interface Subscription {
  id: ID
  tariffId: ID
  tariffName: string
  price: number
  start: string // ISO
  end: string // ISO
}

export interface Client {
  id: ID
  companyName: string
  contactName: string
  phone: string // 9 digits, without +998
  password: string
  subdomain: string
  primaryColor: string
  createdAt: string
  blocked?: boolean
  subscriptions: Subscription[]
}

export interface Named {
  id: ID
  name: string
}

export interface Stage {
  id: ID
  name: string
  color: string
  description?: string
  /** Shu bosqichga o'tkazilgan nomzod onboardingga yo'naltiriladi */
  toOnboarding?: boolean
}

export interface KeyValue {
  label: string
  value: string
}

export interface Comment {
  id: ID
  text: string
  author: string
  at: string
}

export interface Answer {
  question: string
  type: QuestionType
  value: string // text or data URL / comma separated
  fileName?: string
}

export interface Candidate {
  id: ID
  name: string
  phone: string
  email?: string
  photo?: string
  branchId: ID
  vacancyId?: ID
  channelId?: ID
  pipeline: 'recruiting' | 'onboarding'
  stageId: ID
  extra: KeyValue[]
  answers: Answer[]
  comments: Comment[]
  createdAt: string
  stageChangedAt: string
}

export interface Employee {
  id: ID
  name: string
  phone: string
  email?: string
  photo?: string
  branchId: ID
  departmentId?: ID
  position?: string
  birthDate?: string // YYYY-MM-DD
  languages: string[]
  certificate?: string
  hiredAt: string
  /** nomzod tizimga tushgan sana (Time-to-hire uchun) */
  appliedAt?: string
  channelId?: ID
  congratulatedYear?: number
  extra: KeyValue[]
}

export type QuestionType = 'text' | 'photo' | 'file' | 'select' | 'multi'

export interface Question {
  id: ID
  text: string
  type: QuestionType
  options: string[]
  required: boolean
}

export interface Vacancy {
  id: ID
  title: string
  branchId: ID
  departmentId?: ID
  type: 'full_time' | 'part_time'
  talents: string
  requirements: string
  questions: Question[]
  active: boolean
  createdAt: string
}

export interface Task {
  id: ID
  title: string
  description: string
  assigneeId: ID // HR manager id or 'admin'
  deadline: string // YYYY-MM-DD
  status: 'pending' | 'done' | 'failed'
  reason?: string
  createdAt: string
}

export interface DocItem {
  id: ID
  name: string
  kind: 'link' | 'file'
  url: string
  fileName?: string
  createdAt: string
}

export interface HrManager {
  id: ID
  name: string
  phone: string
  password: string
  createdAt: string
}

export interface Notice {
  id: ID
  to: ID // 'admin' | managerId | 'all'
  text: string
  at: string
  read: boolean
}

export interface Tenant {
  branches: Named[]
  departments: Named[]
  channels: Named[]
  stages: Stage[]
  onboardingSteps: Stage[]
  vacancies: Vacancy[]
  candidates: Candidate[]
  employees: Employee[]
  tasks: Task[]
  documents: DocItem[]
  managers: HrManager[]
  notices: Notice[]
}

export interface DB {
  version: number
  superAdmin: { phone: string; password: string; name: string }
  tariffs: Tariff[]
  clients: Client[]
  tenants: Record<ID, Tenant>
}

export type Session =
  | { role: 'super' }
  | { role: 'admin'; clientId: ID }
  | { role: 'hr'; clientId: ID; managerId: ID }
