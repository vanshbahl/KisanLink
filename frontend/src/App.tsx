import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppShell } from './layouts/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BulkDashboard } from './pages/BulkDashboard'
import { BulkSupplyPage } from './pages/BulkSupplyPage'
import { ConsumerExplorePage } from './pages/ConsumerExplorePage'
import { ConsumerHome } from './pages/ConsumerHome'
import { FarmerDashboard } from './pages/FarmerDashboard'
import { FarmerEarningsPage, FarmerInsightsPage, FarmerOrderDetailPage, FarmerOrdersPage, FarmerPickupsPage, FarmerProduceDetailPage, FarmerProfilePage, SellProducePage } from './pages/FarmerExperience'
import { FarmerProducePage } from './pages/FarmerProducePage'
import { ListingDetailPage } from './pages/ListingDetailPage'
import { OtpPage } from './pages/OtpPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { WelcomePage } from './pages/WelcomePage'
import type { Role } from './types'
import { roleHome } from './utils/routes'

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  return session ? <Navigate to={roleHome(session.role)} replace /> : children
}

function ProtectedShell() {
  const { session } = useAuth()
  return session ? <AppShell /> : <Navigate to="/auth" replace />
}

function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/auth" replace />
  return session.role === role ? children : <Navigate to={roleHome(session.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><WelcomePage /></PublicOnly>} />
      <Route path="/auth" element={<PublicOnly><AuthPage /></PublicOnly>} />
      <Route path="/verify" element={<PublicOnly><OtpPage /></PublicOnly>} />

      <Route element={<ProtectedShell />}>
        <Route path="farmer">
          <Route index element={<RoleGuard role="farmer"><FarmerDashboard /></RoleGuard>} />
          <Route path="produce" element={<RoleGuard role="farmer"><FarmerProducePage /></RoleGuard>} />
          <Route path="produce/:id" element={<RoleGuard role="farmer"><FarmerProduceDetailPage /></RoleGuard>} />
          <Route path="sell" element={<RoleGuard role="farmer"><SellProducePage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="farmer"><FarmerOrdersPage /></RoleGuard>} />
          <Route path="orders/:id" element={<RoleGuard role="farmer"><FarmerOrderDetailPage /></RoleGuard>} />
          <Route path="earnings" element={<RoleGuard role="farmer"><FarmerEarningsPage /></RoleGuard>} />
          <Route path="insights" element={<RoleGuard role="farmer"><FarmerInsightsPage /></RoleGuard>} />
          <Route path="pickups" element={<RoleGuard role="farmer"><FarmerPickupsPage /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="farmer"><FarmerProfilePage /></RoleGuard>} />
        </Route>

        <Route path="consumer">
          <Route index element={<RoleGuard role="consumer"><ConsumerHome /></RoleGuard>} />
          <Route path="explore" element={<RoleGuard role="consumer"><ConsumerExplorePage /></RoleGuard>} />
          <Route path="listing/:id" element={<RoleGuard role="consumer"><ListingDetailPage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="consumer"><PlaceholderPage copyId="consumerOrders" tone="amber" /></RoleGuard>} />
          <Route path="saved" element={<RoleGuard role="consumer"><PlaceholderPage copyId="saved" /></RoleGuard>} />
          <Route path="how-it-works" element={<RoleGuard role="consumer"><PlaceholderPage copyId="howItWorks" /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="consumer"><ProfilePage /></RoleGuard>} />
        </Route>

        <Route path="bulk">
          <Route index element={<RoleGuard role="bulk"><BulkDashboard /></RoleGuard>} />
          <Route path="supply" element={<RoleGuard role="bulk"><BulkSupplyPage /></RoleGuard>} />
          <Route path="supply/:id" element={<RoleGuard role="bulk"><PlaceholderPage copyId="bulkSupply" /></RoleGuard>} />
          <Route path="requests" element={<RoleGuard role="bulk"><PlaceholderPage copyId="bulkRequests" tone="amber" /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="bulk"><PlaceholderPage copyId="bulkOrders" tone="soil" /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="bulk"><ProfilePage /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
