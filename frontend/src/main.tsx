import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/600.css'
import '@fontsource/noto-sans-devanagari/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ToastProvider } from './contexts/ToastContext'
import './index.css'
import './pages/logistics/logistics.css'
import './pages/bulk/bulk.css'
import { mandiBenchmarkService } from './services/mandiBenchmarkService'

// Live AGMARKNET benchmarks feed every price in the app, so they load before the first
// screen; a slow or absent backend resolves within the timeout and the seeded fallback
// (labelled as such) carries the demo until the background refresh lands.
void mandiBenchmarkService.prime().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider><App /></ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
