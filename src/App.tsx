import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { Toaster } from './components/ui'
import { SuperLayout, TenantLayout } from './components/Layout'
import { canLogin, setSession, useDb, useSession } from './lib/db'
import { TenantProvider } from './lib/tenant'
import { SUPER_BRAND, useBrand } from './lib/theme'
import Login, { TenantLogin } from './pages/Login'
import SuperDashboard from './pages/super/Dashboard'
import Clients from './pages/super/Clients'
import ClientView from './pages/super/ClientView'
import Subscriptions from './pages/super/Subscriptions'
import SuperSettings from './pages/super/Settings'
import TenantDashboard from './pages/tenant/Dashboard'
import Recruiting from './pages/tenant/Recruiting'
import Onboarding from './pages/tenant/Onboarding'
import Employees from './pages/tenant/Employees'
import Reports from './pages/tenant/Reports'
import Birthdays from './pages/tenant/Birthdays'
import Documents from './pages/tenant/Documents'
import Vacancies from './pages/tenant/Vacancies'
import TenantSettings from './pages/tenant/Settings'
import Landing from './pages/public/Landing'
import Apply from './pages/public/Apply'
import { t } from './lib/i18n'

function Home() {
  const s = useSession()
  // demo.hrpulse.uz kabi subdomain orqali ochilganda — mijozning login sahifasi
  const sub = window.location.hostname.match(/^([a-z0-9-]+)\.hrpulse\.uz$/)?.[1]
  if (!s) return <Navigate to={sub && sub !== 'www' ? `/c/${sub}` : '/login'} replace />
  return <Navigate to={s.role === 'super' ? '/super/dashboard' : '/app/dashboard'} replace />
}

function SuperGuard() {
  const s = useSession()
  useBrand(SUPER_BRAND)
  if (s?.role !== 'super') return <Navigate to="/login" replace />
  return (
    <SuperLayout>
      <Outlet />
    </SuperLayout>
  )
}

function TenantGuard() {
  const s = useSession()
  const db = useDb()
  const clientId = s && s.role !== 'super' ? s.clientId : null
  const client = db.clients.find((c) => c.id === clientId)
  const manager = s?.role === 'hr' ? db.tenants[s.clientId]?.managers.find((m) => m.id === s.managerId) : null
  const blocked = !client || canLogin(client) || (s?.role === 'hr' && !manager)
  useEffect(() => {
    // Obuna tugasa yoki mijoz o'chirilsa — sessiyani yopamiz
    if (s && s.role !== 'super' && blocked) setSession(null)
  }, [s, blocked])
  useBrand(client?.primaryColor ?? SUPER_BRAND)
  if (!s || s.role === 'super' || blocked) return <Navigate to="/login" replace />
  return (
    <TenantProvider clientId={client.id}>
      <TenantLayout>
        <Outlet />
      </TenantLayout>
    </TenantProvider>
  )
}

function AdminOnly({ children }: { children: ReactNode }) {
  const s = useSession()
  return s?.role === 'admin' ? <>{children}</> : <Navigate to="/app/dashboard" replace />
}

function SuperClientView() {
  const { id } = useParams()
  return <ClientView key={id} id={id!} />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route path="/super" element={<SuperGuard />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuperDashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<SuperClientView />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="settings" element={<SuperSettings />} />
        </Route>

        <Route path="/app" element={<TenantGuard />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="recruiting" element={<Recruiting />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="employees" element={<Employees />} />
          <Route path="reports" element={<Reports />} />
          <Route path="birthdays" element={<Birthdays />} />
          <Route path="documents" element={<Documents />} />
          <Route path="vacancies" element={<Vacancies />} />
          <Route
            path="settings"
            element={
              <AdminOnly>
                <TenantSettings />
              </AdminOnly>
            }
          />
        </Route>

        <Route path="/c/:sub" element={<TenantLogin />} />
        <Route path="/c/:sub/jobs" element={<Landing />} />
        <Route path="/apply/:sub/:vacancyId/:channelId?" element={<Apply />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
