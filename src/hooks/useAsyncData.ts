import { useEffect, useState } from 'react'

export function useAsyncData<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then((result) => active && setData(result))
      .catch(() => active && setError('Something went wrong. Please try again.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // Dependencies are provided intentionally by each caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, loading, error }
}
