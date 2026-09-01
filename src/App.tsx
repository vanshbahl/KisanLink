import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppShell } from './layouts/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BulkDashboard } from './pages/BulkDashboard'
import { BulkSupplyPage } from './pages/BulkSupplyPage'
import { ConsumerExplorePage } from './pages/ConsumerExplorePage'
import { ConsumerHome } from './pages/ConsumerHome'
import { FarmerDashboard } from './pages/FarmerDashboard'
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
          <Route path="produce/details" element={<RoleGuard role="farmer"><PlaceholderPage eyebrow="Produce management" title="Listing controls are being prepared" description="Editing quantities, pausing a listing, and updating harvest details will connect to the live marketplace in Phase 2." features={['Update available quantity', 'Pause or resume produce', 'Track buyer interest']} /></RoleGuard>} />
          <Route path="sell" element={<RoleGuard role="farmer"><PlaceholderPage eyebrow="Farmer selling flow" title="Your 60-second listing flow is next" description="The step-by-step sell experience will guide farmers through crop, quantity, harvest date, price, and optional photos—one simple question at a time." features={['Choose crop with large visual buttons', 'Set quantity and expected price', 'Preview fair-price guidance before publishing']} /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="farmer"><PlaceholderPage eyebrow="Orders preview" title="Order management comes in Phase 2" description="The home dashboard uses realistic preview counts. Acceptance, pickup coordination, and order states will become interactive with the connected marketplace." features={['Review new buyer orders', 'Accept or decline clearly', 'See pickup time and payout']} tone="amber" /></RoleGuard>} />
          <Route path="earnings" element={<RoleGuard role="farmer"><PlaceholderPage eyebrow="Transparent payouts" title="Your earnings ledger is taking shape" description="Phase 2 will connect each completed order to a clear farmer payout and payment status." features={['Monthly earnings summary', 'Order-by-order payout details', 'No hidden deductions']} tone="soil" /></RoleGuard>} />
          <Route path="insights" element={<RoleGuard role="farmer"><PlaceholderPage eyebrow="Demand intelligence preview" title="Know what buyers need before you sell" description="Today’s dashboard price card is mocked. Regional demand signals and explainable recommendations arrive in a later intelligence phase." features={['Nearby crop demand', 'Indicative fair-price ranges', 'Simple Hindi recommendations']} /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="farmer"><ProfilePage /></RoleGuard>} />
        </Route>

        <Route path="consumer">
          <Route index element={<RoleGuard role="consumer"><ConsumerHome /></RoleGuard>} />
          <Route path="explore" element={<RoleGuard role="consumer"><ConsumerExplorePage /></RoleGuard>} />
          <Route path="listing/:id" element={<RoleGuard role="consumer"><ListingDetailPage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="consumer"><PlaceholderPage eyebrow="Orders & delivery" title="Checkout is coming in Phase 2" description="The marketplace is ready to explore today. Cart, checkout, payments, and live delivery states will connect in the next phase." features={['Secure checkout', 'Farm-to-door delivery status', 'Simple order history']} tone="amber" /></RoleGuard>} />
          <Route path="saved" element={<RoleGuard role="consumer"><PlaceholderPage eyebrow="Saved favourites" title="Keep your favourite farms close" description="Saved farms and produce collections will arrive alongside the connected marketplace in Phase 2." features={['Save produce for later', 'Follow trusted farms', 'See when fresh batches arrive']} /></RoleGuard>} />
          <Route path="how-it-works" element={<RoleGuard role="consumer"><PlaceholderPage eyebrow="The direct journey" title="Fewer handoffs. More value." description="KisanLink coordinates farmers, transparent pricing, and shared pickup so produce travels a shorter, more accountable path." features={['Verified farm origin', 'Visible price breakdown', 'Coordinated farm pickup']} /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="consumer"><ProfilePage /></RoleGuard>} />
        </Route>

        <Route path="bulk">
          <Route index element={<RoleGuard role="bulk"><BulkDashboard /></RoleGuard>} />
          <Route path="supply" element={<RoleGuard role="bulk"><BulkSupplyPage /></RoleGuard>} />
          <Route path="supply/:id" element={<RoleGuard role="bulk"><PlaceholderPage eyebrow="Aggregated supply preview" title="Supply planning arrives in Phase 2" description="This supply card is built from deterministic nearby-farm data. Reservations and farmer aggregation are intentionally not active yet." features={['Review contributing farmers', 'Compare landed pricing', 'Reserve the required quantity']} /></RoleGuard>} />
          <Route path="requests" element={<RoleGuard role="bulk"><PlaceholderPage eyebrow="Reverse marketplace" title="Post procurement requirements next" description="Soon FreshKart can publish crop, grade, quantity, delivery window, and ceiling price for nearby farmers to fulfil." features={['Define quantity and quality', 'Receive nearby supply plans', 'Compare transparent landed costs']} tone="amber" /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard role="bulk"><PlaceholderPage eyebrow="Procurement orders" title="One place for every supply commitment" description="Order lifecycle, delivery sign-off, and procurement history are intentionally reserved for the connected Phase 2 experience." features={['Track accepted supply', 'Review delivery windows', 'Confirm received quantities']} tone="soil" /></RoleGuard>} />
          <Route path="profile" element={<RoleGuard role="bulk"><ProfilePage /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
