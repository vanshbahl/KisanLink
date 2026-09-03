import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppShell } from './layouts/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BulkDashboard } from './pages/BulkDashboard'
import { BulkSupplyPage } from './pages/BulkSupplyPage'
import { BulkOrderDetailPage, BulkOrdersPage, BulkProfilePage, BulkRequestDetailPage, BulkRequestsPage, BulkSupplyDetailPage } from './pages/BulkPhase2'
import { ConsumerExplorePage } from './pages/ConsumerExplorePage'
import { ConsumerHome } from './pages/ConsumerHome'
import { ConsumerCartPage, ConsumerCheckoutPage, ConsumerHowItWorksPage, ConsumerOrderDetailPage, ConsumerOrdersPage, ConsumerProfilePage, ConsumerSavedPage } from './pages/ConsumerPhase2'
import { FarmerDashboard } from './pages/FarmerDashboard'
import { FarmerEarningsPage, FarmerInsightsPage, FarmerOrderDetailPage, FarmerOrdersPage, FarmerPickupsPage, FarmerProduceDetailPage, FarmerProfilePage, SellProducePage } from './pages/FarmerExperience'
import { FarmerProducePage } from './pages/FarmerProducePage'
import { ListingDetailPage } from './pages/ListingDetailPage'
import { OtpPage } from './pages/OtpPage'
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
          <Route path="cart" element={<RoleGuard role="consumer"><ConsumerCartPage /></RoleGuard>} />
          <Route path="checkout" element={<RoleGuard role="consumer"><ConsumerCheckoutPage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="consumer"><ConsumerOrdersPage /></RoleGuard>} />
          <Route path="orders/:id" element={<RoleGuard role="consumer"><ConsumerOrderDetailPage /></RoleGuard>} />
          <Route path="saved" element={<RoleGuard role="consumer"><ConsumerSavedPage /></RoleGuard>} />
          <Route path="how-it-works" element={<RoleGuard role="consumer"><ConsumerHowItWorksPage /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="consumer"><ConsumerProfilePage /></RoleGuard>} />
        </Route>

        <Route path="bulk">
          <Route index element={<RoleGuard role="bulk"><BulkDashboard /></RoleGuard>} />
          <Route path="supply" element={<RoleGuard role="bulk"><BulkSupplyPage /></RoleGuard>} />
          <Route path="supply/:id" element={<RoleGuard role="bulk"><BulkSupplyDetailPage /></RoleGuard>} />
          <Route path="requests" element={<RoleGuard role="bulk"><BulkRequestsPage /></RoleGuard>} />
          <Route path="requests/:id" element={<RoleGuard role="bulk"><BulkRequestDetailPage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="bulk"><BulkOrdersPage /></RoleGuard>} />
          <Route path="orders/:id" element={<RoleGuard role="bulk"><BulkOrderDetailPage /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="bulk"><BulkProfilePage /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
