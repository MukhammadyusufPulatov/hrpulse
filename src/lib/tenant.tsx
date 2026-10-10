import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { updateDb, useDb, useSession } from './db'
import type { Client, ID, Tenant } from './types'
import { uid } from './utils'
import { t } from '../lib/i18n'

interface Ctx {
  client: Client
  tenant: Tenant
  update: (fn: (tn: Tenant) => void) => void
  branch: ID | 'all'
  setBranch: (b: ID | 'all') => void
  readOnly: boolean
  /** Joriy foydalanuvchi: 'admin' yoki HR menejer id */
  me: ID
  meName: string
  isAdmin: boolean
  notify: (to: ID, text: string) => void
  inBranch: (b?: ID) => boolean
}

const TenantCtx = createContext<Ctx | null>(null)

export function TenantProvider({ clientId, readOnly = false, children }: { clientId: ID; readOnly?: boolean; children: ReactNode }) {
  const db = useDb()
  const session = useSession()
  const client = db.clients.find((c) => c.id === clientId)
  const tenant = db.tenants[clientId]
  // Ichki filiallar o'rniga har bir mijoz profili alohida filial (bir xil telefon raqamli profillar)
  const branch = 'all' as const

  const value = useMemo<Ctx | null>(() => {
    if (!client || !tenant) return null
    const me = session?.role === 'hr' ? session.managerId : 'admin'
    const meName = me === 'admin' ? client.contactName : tenant.managers.find((m) => m.id === me)?.name ?? 'HR'
    const update = (fn: (tn: Tenant) => void) => {
      if (readOnly) return
      updateDb((d) => fn(d.tenants[clientId]))
    }
    return {
      client,
      tenant,
      update,
      branch,
      setBranch: () => {},
      readOnly,
      me,
      meName,
      isAdmin: me === 'admin',
      notify: (to, text) => update((tn) => tn.notices.unshift({ id: uid(), to, text, at: new Date().toISOString(), read: false })),
      inBranch: () => true,
    }
  }, [client, tenant, readOnly, session, clientId])

  if (!value) return <div className="p-10 text-center text-slate-500">{t("Mijoz topilmadi")}</div>
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>
}

export function useTenant() {
  const c = useContext(TenantCtx)
  if (!c) throw new Error('useTenant must be used inside TenantProvider')
  return c
}

/** Nom bo'yicha qidiruv uchun yordamchi */
export function nameOf(list: { id: ID; name: string }[], id?: ID, fallback = '—') {
  return list.find((x) => x.id === id)?.name ?? fallback
}
