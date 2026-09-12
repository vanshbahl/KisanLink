import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppShell } from './layouts/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BulkDashboard } from './pages/BulkDashboard'
import { BulkSupplyPage } from './pages/BulkSupplyPage'
import { BulkOrderDetailPage, BulkOrdersPage, BulkProfilePage, BulkRequestDetailPage, BulkRequestsPage, BulkSupplyDetailPage } from './pages/BulkPhase2'
import { ConsumerExplorePage } from './pages/ConsumerExplorePage'
import { ConsumerHome } from './pages/ConsumerHome'
import { ConsumerCartPage, ConsumerCheckoutPage, ConsumerHowItWorksPage, ConsumerOrderDetailPage, ConsumerOrdersPage, ConsumerProfilePage, ConsumerSavedPage } from './pages/ConsumerPhase2'
import { FarmerCropDetail } from './pages/farmer/FarmerCropDetail'
import { FarmerDeal } from './pages/farmer/FarmerDeal'
import { FarmerFasal } from './pages/farmer/FarmerFasal'
import { FarmerHome } from './pages/farmer/FarmerHome'
import { FarmerOrderDetail } from './pages/farmer/FarmerOrderDetail'
import { FarmerOrders } from './pages/farmer/FarmerOrders'
import { FarmerPaisa } from './pages/farmer/FarmerPaisa'
import { FarmerProfile } from './pages/farmer/FarmerProfile'
import { FarmerSell } from './pages/farmer/FarmerSell'
import { ListingDetailPage } from './pages/ListingDetailPage'
import { MarketMakerPage } from './pages/MarketMakerPage'
import { LogisticsDashboard, LogisticsDeliveriesPage, LogisticsDeliveryDetailPage, LogisticsPickupsPage, LogisticsPickupDetailPage, LogisticsProfilePage, LogisticsRoutesPage, LogisticsVehiclesPage } from './pages/LogisticsExperience'
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

/** /farmer/produce/:id -> /farmer/fasal/:id, preserving the crop that was linked to. */
function LegacyProduceRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/farmer/fasal/${id}` : '/farmer/fasal'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><WelcomePage /></PublicOnly>} />
      <Route path="/auth" element={<PublicOnly><AuthPage /></PublicOnly>} />
      <Route path="/verify" element={<PublicOnly><OtpPage /></PublicOnly>} />

      <Route element={<ProtectedShell />}>
        <Route path="farmer">
          <Route index element={<RoleGuard role="farmer"><FarmerHome /></RoleGuard>} />
          <Route path="fasal" element={<RoleGuard role="farmer"><FarmerFasal /></RoleGuard>} />
          <Route path="fasal/:id" element={<RoleGuard role="farmer"><FarmerCropDetail /></RoleGuard>} />
          <Route path="sell" element={<RoleGuard role="farmer"><FarmerSell /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="farmer"><FarmerOrders /></RoleGuard>} />
          <Route path="orders/:id" element={<RoleGuard role="farmer"><FarmerOrderDetail /></RoleGuard>} />
          <Route path="paisa" element={<RoleGuard role="farmer"><FarmerPaisa /></RoleGuard>} />
          <Route path="deal" element={<RoleGuard role="farmer"><FarmerDeal /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="farmer"><FarmerProfile /></RoleGuard>} />

          {/*
            The farmer IA moved from produce/earnings/insights/pickups/market to
            fasal/paisa/deal. These paths are still written into shared prototype state —
            seeded notifications point at /farmer/pickups and /farmer/market, and the Market
            Maker's "this market created" links point at /farmer/earnings — so they redirect
            rather than 404.
          */}
          <Route path="produce" element={<Navigate to="/farmer/fasal" replace />} />
          <Route path="produce/:id" element={<LegacyProduceRedirect />} />
          <Route path="earnings" element={<Navigate to="/farmer/paisa" replace />} />
          <Route path="insights" element={<Navigate to="/farmer/deal" replace />} />
          <Route path="pickups" element={<Navigate to="/farmer/orders" replace />} />
          <Route path="market" element={<Navigate to="/farmer/deal" replace />} />
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
          <Route path="market" element={<RoleGuard role="consumer"><MarketMakerPage /></RoleGuard>} />
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
          <Route path="market" element={<RoleGuard role="bulk"><MarketMakerPage /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="bulk"><BulkProfilePage /></RoleGuard>} />
        </Route>

        <Route path="logistics">
          <Route index element={<RoleGuard role="logistics"><LogisticsDashboard /></RoleGuard>} />
          <Route path="pickups" element={<RoleGuard role="logistics"><LogisticsPickupsPage /></RoleGuard>} />
          <Route path="pickups/:id" element={<RoleGuard role="logistics"><LogisticsPickupDetailPage /></RoleGuard>} />
          <Route path="deliveries" element={<RoleGuard role="logistics"><LogisticsDeliveriesPage /></RoleGuard>} />
          <Route path="deliveries/:id" element={<RoleGuard role="logistics"><LogisticsDeliveryDetailPage /></RoleGuard>} />
          <Route path="routes" element={<RoleGuard role="logistics"><LogisticsRoutesPage /></RoleGuard>} />
          <Route path="vehicles" element={<RoleGuard role="logistics"><LogisticsVehiclesPage /></RoleGuard>} />
          <Route path="market" element={<RoleGuard role="logistics"><MarketMakerPage /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="logistics"><LogisticsProfilePage /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
