import { useEffect, useState } from 'react'
import { subscriptionApi } from '../services/api'

export function usePlanCatalog() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    subscriptionApi.plans()
      .then((data) => {
        if (active) setPlans(data?.plans ?? [])
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { plans, loading, error }
}
