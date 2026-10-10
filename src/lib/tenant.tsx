import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { updateDb, useDb, useSession } from './db'
import type { Client, ID, Tenant } from './types'
import { uid } from './utils'

interface Ctx {
  client: Client
  tenant: Tenant
  update: (fn: (t: Tenant) => void) => void
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
  const storageKey = 'hrpulse_branch_' + clientId
  const [branch, setBranchState] = useState<ID | 'all'>(() => localStorage.getItem(storageKey) || 'all')

  useEffect(() => {
    if (branch !== 'all' && tenant && !tenant.branches.some((b) => b.id === branch)) setBranchState('all')
  }, [tenant, branch])

  const value = useMemo<Ctx | null>(() => {
    if (!client || !tenant) return null
    const me = session?.role === 'hr' ? session.managerId : 'admin'
    const meName = me === 'admin' ? client.contactName : tenant.managers.find((m) => m.id === me)?.name ?? 'HR'
    const update = (fn: (t: Tenant) => void) => {
      if (readOnly) return
      updateDb((d) => fn(d.tenants[clientId]))
    }
    return {
      client,
      tenant,
      update,
      branch,
      setBranch: (b) => {
        localStorage.setItem(storageKey, b)
        setBranchState(b)
      },
      readOnly,
      me,
      meName,
      isAdmin: me === 'admin',
      notify: (to, text) => update((t) => t.notices.unshift({ id: uid(), to, text, at: new Date().toISOString(), read: false })),
      inBranch: (b) => branch === 'all' || b === branch,
    }
  }, [client, tenant, branch, readOnly, session, clientId, storageKey])

  if (!value) return <div className="p-10 text-center text-slate-500">Mijoz topilmadi</div>
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
