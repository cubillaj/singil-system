import { CheckCircle2, CreditCard, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { subscriptionApi } from '../services/api'
import { formatDate } from '../utils/format'
import { usePlanCatalog } from '../hooks/usePlanCatalog'

const planRank = {
  free: 0,
  pro: 1,
  business: 2,
}

function planButtonLabel({ isCurrent, isFree, isDowngrade, isLoading, planName }) {
  if (isCurrent) return 'Current plan'
  if (isDowngrade) return 'Downgrade unavailable'
  if (isFree) return 'Included'
  if (isLoading) return 'Opening checkout...'
  return `Upgrade to ${planName}`
}

export function SubscriptionPage({ user, onUpdated }) {
  const { plans, loading: plansLoading, error: plansError } = usePlanCatalog()
  const [loadingPlan, setLoadingPlan] = useState('')
  const [error, setError] = useState('')

  const subscription = user?.organization?.subscription
  const currentPlan = user?.organization?.effectivePlan ?? subscription?.plan ?? user?.organization?.plan ?? 'free'
  const currentStatus = subscription?.status ?? 'active'
  const hasActiveBillingPeriod = currentPlan !== 'free' && currentStatus === 'active'

  const currentPlanData = useMemo(
    () => plans.find((plan) => plan.id === currentPlan),
    [currentPlan, plans],
  )

  const startCheckout = async (plan) => {
    const isDowngrade = planRank[plan.id] < planRank[currentPlan]

    if (plan.id === 'free' || plan.id === currentPlan || isDowngrade) return

    setError('')
    setLoadingPlan(plan.id)

    try {
      const data = await subscriptionApi.checkout({
        plan: plan.id,
        currency: 'PH',
      })

      const checkoutUrl = data?.checkout?.checkoutUrl

      if (!checkoutUrl) {
        throw new Error('Checkout URL was not returned.')
      }

      window.location.assign(checkoutUrl)
      await onUpdated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPlan('')
    }
  }

  return (
    <section>
      <PageHeader
        title="Subscription"
        description="Choose the plan that matches your workspace."
      />

      <div className="grid gap-5 p-5">
        <div className="flex flex-col gap-4 rounded-md border border-line bg-panel p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              <p className="text-sm font-semibold text-ink">Current plan</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{currentPlanData?.name ?? currentPlan}</h2>
            <p className="mt-1 text-sm text-muted">
              Status: <span className="capitalize text-ink">{currentStatus}</span>
            </p>
          </div>

          <div className="grid gap-1 text-sm text-muted md:text-right">
            {hasActiveBillingPeriod ? (
              <>
                <p>Current period starts: {formatDate(subscription?.currentPeriodStart)}</p>
                <p>Current period ends: {formatDate(subscription?.currentPeriodEnd ?? subscription?.expiresAt)}</p>
              </>
            ) : (
              <p>No active billing period</p>
            )}
          </div>
        </div>

        <Notice>{error}</Notice>
        <Notice>{plansError}</Notice>
        {plansLoading ? <p className="text-sm text-muted">Loading plans...</p> : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan
            const isFree = plan.id === 'free'
            const isDowngrade = planRank[plan.id] < planRank[currentPlan]
            const isLoading = loadingPlan === plan.id

            return (
              <article key={plan.id} className="rounded-md border border-line bg-panel p-5">
                <div className="flex min-h-24 items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{plan.description}</p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-semibold text-accent">{plan.priceLabel}</p>
                </div>

                <ul className="mt-5 grid gap-3 text-sm text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 size={17} className="shrink-0 text-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant={isCurrent || isFree || isDowngrade ? 'secondary' : 'primary'}
                  disabled={isCurrent || isFree || isDowngrade || Boolean(loadingPlan)}
                  onClick={() => startCheckout(plan)}
                  className="mt-6 w-full"
                >
                  <CreditCard size={17} />
                  {planButtonLabel({
                    isCurrent,
                    isFree,
                    isDowngrade,
                    isLoading,
                    planName: plan.name,
                  })}
                </Button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
