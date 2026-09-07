import { useCallback, useEffect, useState } from 'react'

/**
 * `live: true` re-runs the loader whenever shared prototype state is written, so a screen that
 * reads cross-role data reflects an action taken elsewhere without a manual reload. It is
 * opt-in: existing callers keep their load-once behaviour.
 */
export function useAsyncData<T>(loader: () => Promise<T>, dependencies: unknown[] = [], options: { live?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    if (!options.live) return
    const onChange = () => setNonce((value) => value + 1)
    window.addEventListener('kisanlink-state', onChange)
    return () => window.removeEventListener('kisanlink-state', onChange)
  }, [options.live])

  useEffect(() => {
    let active = true
    // A background refresh keeps the rendered data on screen instead of flashing a skeleton.
    if (nonce === 0) setLoading(true)
    setError(null)
    loader()
      .then((result) => active && setData(result))
      .catch(() => active && setError('Something went wrong. Please try again.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // Dependencies are provided intentionally by each caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, nonce])

  return { data, loading, error, refresh }
}
