import { useEffect, useState } from 'react'
import { Server, Zap } from 'lucide-react'
import { apiClient } from '../services/apiClient'

export function GlobalModeIndicator() {
  const [isLive, setIsLive] = useState<boolean | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let mounted = true
    const check = () => {
      apiClient.checkBackendHealth().then((healthy) => {
        if (mounted) setIsLive(healthy)
      })
    }
    check()
    const interval = setInterval(check, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (isLive === null) return null

  return (
    <div
      className="global-mode-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
        color: isLive ? '#059669' : '#d97706',
        border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        cursor: 'pointer',
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => setShowTooltip((curr) => !curr)}
      title="Click for system mode details"
    >
      {isLive ? <Server size={13} /> : <Zap size={13} />}
      <span className="global-mode-label">{isLive ? 'Live Backend Connected' : 'Demo / Prototype Mode'}</span>
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '240px',
            padding: '0.65rem 0.85rem',
            background: '#111827',
            color: '#f9fafb',
            borderRadius: '8px',
            fontSize: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            lineHeight: 1.4,
          }}
        >
          <strong>{isLive ? 'Canonical Backend System' : 'Local Intelligence Fallback'}</strong>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.85 }}>
            {isLive
              ? 'FastAPI backend connected. Local fallbacks remain available if an endpoint times out.'
              : 'Operating on local deterministic prototype state. Connect backend server for live calculations.'}
          </p>
        </div>
      )}
    </div>
  )
}
