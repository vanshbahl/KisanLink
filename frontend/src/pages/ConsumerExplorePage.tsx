import { Navigate } from 'react-router-dom'

/**
 * Explore is no longer a separate destination — the marketplace lives on Consumer Home.
 * The route is kept so existing links and bookmarks land on the marketplace section
 * instead of 404-ing.
 */
export function ConsumerExplorePage() {
  return <Navigate to="/consumer#marketplace" replace />
}
