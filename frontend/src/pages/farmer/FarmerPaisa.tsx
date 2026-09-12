import { useState } from 'react'
import { ChevronDown, IndianRupee, TrendingUp } from 'lucide-react'
import { Money } from '../../components/farmer/Money'
import { DashboardSkeleton } from '../../components/LoadingSkeleton'
import { useFarmerText, money, relativeDay } from '../../i18n/farmer'
import { useAsyncData } from '../../hooks/useAsyncData'
import { buildEarningsStory } from '../../services/farmerAiService'
import { prototypeService } from '../../services/prototypeService'
import { daysUntil } from '../../utils/dates'

/**
 * "मेरा पैसा".
 *
 * Payment visibility is where a farmer's trust in the platform actually lives, so this is a
 * destination rather than a tab on a dashboard. The order is the order a farmer cares about:
 * what is owed, what has arrived, how it compares to the mandi, and only then the full ledger.
 *
 * Every figure is the same `getEarnings()` data as before — nothing is rounded away or
 * summarised into a score. What went is the decorative sparkline and the "See why you earned
 * more" AI card: `buildEarningsStory` is a synchronous pure function, so its answer now
 * appears the instant the farmer asks for it instead of after a staged animation.
 */
export function FarmerPaisa() {
  const { f, language, pick } = useFarmerText()
  const [showWhy, setShowWhy] = useState(false)
  const [showLedger, setShowLedger] = useState(false)

  const { data, loading } = useAsyncData(async () => {
    const [earnings, orders] = await Promise.all([
      prototypeService.getEarnings(),
      prototypeService.getOrders(),
    ])
    return { earnings, orders }
  }, [], { live: true })

  if (loading && !data) return <DashboardSkeleton />

  const earnings = data?.earnings ?? []
  const orders = data?.orders ?? []
  const pendingItems = earnings.filter((item) => item.status === 'pending')
  const paidItems = earnings.filter((item) => item.status === 'paid')
  const pending = pendingItems.reduce((sum, item) => sum + item.net, 0)
  const gain = earnings.reduce((sum, item) => sum + (item.net - item.mandiEquivalent), 0)
  const story = buildEarningsStory(earnings, orders)

  // The nearest pending payment is the one a farmer is actually waiting on.
  const nextUp = [...pendingItems].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))[0]

  return (
    <div className="page f-page f-paisa">
      <header className="f-page-head"><h1>{f('paisaTitle')}</h1></header>

      <section className="f-paisa-hero">
        <span>{f('youWillReceive')}</span>
        <Money value={pending} size="hero" tone="good" />
        {/* The payout window is the platform's stated two working days, not a per-transaction
            estimate — the ledger carries no settlement date, so inventing one per row would
            put a number on screen that nothing behind it can honour. */}
        {nextUp && (
          <p>{f('nextPayment', {
            crop: pick(nextUp.crop, nextUp.cropHi),
            amount: money(nextUp.net),
          })}</p>
        )}
      </section>

      {gain > 0 && (
        <section className="f-gain">
          <div className="f-gain-head">
            <span className="f-gain-icon"><TrendingUp size={21} /></span>
            <div>
              <strong>{f('earnedMoreThanMandi', { amount: money(gain) })}</strong>
              <small>{f('moreThanMandiHint')}</small>
            </div>
          </div>
          <button type="button" className="f-disclose is-inline" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
            <span>{showWhy ? f('hideWhy') : f('whyMore')}</span>
            <ChevronDown size={19} className={showWhy ? 'is-open' : ''} aria-hidden="true" />
          </button>
          {showWhy && (
            <dl className="f-facts f-gain-facts">
              {story.bestCrop && (
                <div>
                  <dt>{f('bestCrop')}</dt>
                  <dd>{pick(story.bestCrop.crop, story.bestCrop.cropHi)} · +{money(story.bestCrop.gain)}</dd>
                </div>
              )}
              <div><dt>{f('averageExtra')}</dt><dd>₹{story.averageGainPerKg.toFixed(2)}{f('perKg')}</dd></div>
              <div><dt>{f('stillComing')}</dt><dd>{money(story.pendingAmount)}</dd></div>
            </dl>
          )}
        </section>
      )}

      <section className="f-received">
        <h2 className="f-section-heading">{f('receivedTitle')}</h2>
        {paidItems.length ? (
          <ul className="f-money-list">
            {paidItems.map((item) => (
              <li key={item.id}>
                <span className="f-money-icon"><IndianRupee size={19} /></span>
                <span className="f-money-copy">
                  <strong>{pick(item.crop, item.cropHi)}</strong>
                  <small>{relativeDay(language, item.date, daysUntil(item.date))}</small>
                </span>
                <Money value={item.net} tone="good" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="f-note">{f('nothingReceived')}</p>
        )}
      </section>

      {/* No transactions means nothing to open — a disclosure that expands to nothing is worse
          than no disclosure. */}
      {earnings.length > 0 && (
      <section className="f-ledger">
        <button type="button" className="f-disclose" aria-expanded={showLedger} onClick={() => setShowLedger(!showLedger)}>
          <span>{f('fullAccount')}<small>{f('fullAccountHint')}</small></span>
          <ChevronDown size={20} className={showLedger ? 'is-open' : ''} aria-hidden="true" />
        </button>
        {showLedger && (
          <div className="f-ledger-list">
            {earnings.map((item) => (
              <article key={item.id}>
                <header>
                  <strong>{pick(item.crop, item.cropHi)}</strong>
                  <span className={item.status === 'paid' ? 'is-paid' : 'is-awaiting'}>
                    {item.status === 'paid' ? f('gotPaid') : f('awaiting')}
                  </span>
                </header>
                <dl className="f-breakdown">
                  <div><dt>{f('totalPrice')}</dt><dd>{money(item.gross)}</dd></div>
                  <div><dt>{f('transportCost')} + {f('kisanlinkCost')}</dt><dd className="is-minus">−{money(item.deductions)}</dd></div>
                  <div className="is-total"><dt>{f('youGet')}</dt><dd>{money(item.net)}</dd></div>
                </dl>
                <small>{item.orderId} · {relativeDay(language, item.date, daysUntil(item.date))}</small>
              </article>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  )
}
