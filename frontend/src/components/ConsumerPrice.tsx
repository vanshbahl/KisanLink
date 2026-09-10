/**
 * Consumer-facing price, in one place.
 *
 * A shopper compares a KisanLink price against what the same vegetable costs at the shop
 * down the road — never against a mandi wholesale rate. Comparing a retail purchase to a
 * wholesale benchmark is not just unflattering, it is the wrong comparison: it made
 * KisanLink look expensive while actually being cheaper than the alternative the shopper
 * has. Mandi pricing stays where it belongs, on farmer and buyer screens.
 */

export interface ConsumerPriceInput {
  pricePerKg: number
  retailPricePerKg: number
  /** Rescue listings sell below their own asking price; that becomes the price paid. */
  rescuePricePerKg?: number
}

export interface ConsumerPriceFigures {
  price: number
  retail: number
  savingPerKg: number
  savingPct: number
  /** True when there is a real saving worth showing. */
  cheaper: boolean
}

/** Falls back to a conservative retail markup when a listing predates the retail field. */
export function consumerPrice({ pricePerKg, retailPricePerKg, rescuePricePerKg }: ConsumerPriceInput): ConsumerPriceFigures {
  const price = rescuePricePerKg ?? pricePerKg
  const retail = retailPricePerKg > 0 ? retailPricePerKg : Math.round(pricePerKg * 1.2)
  const savingPerKg = Math.max(0, retail - price)
  return {
    price,
    retail,
    savingPerKg,
    savingPct: retail > 0 ? Math.round((savingPerKg / retail) * 100) : 0,
    cheaper: savingPerKg >= 1,
  }
}

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/**
 * The compact three-part treatment used on every consumer card and detail screen:
 * price, struck-through local retail, and the saving.
 */
export function ConsumerPriceBlock({ listing, size = 'card' }: { listing: ConsumerPriceInput; size?: 'card' | 'hero' }) {
  const { price, retail, savingPerKg } = consumerPrice(listing)
  return (
    <div className={`c-price is-${size}`}>
      <p className="c-price-main">
        <strong>{money(price)}</strong><span>/kg</span>
        {savingPerKg >= 1 && <s aria-label={`Local retail ${money(retail)} per kilogram`}>{money(retail)}</s>}
      </p>
      {savingPerKg >= 1
        // The card is narrow; the full phrase wrapped to two lines and pushed the stock line
        // down. The detail page has room for the longer wording.
        ? <small className="c-price-save">Save {money(savingPerKg)}/kg {size === 'hero' ? 'vs local retail' : 'vs retail'}</small>
        : <small className="c-price-save is-neutral">Farm-direct · retail {money(retail)}/kg</small>}
    </div>
  )
}
