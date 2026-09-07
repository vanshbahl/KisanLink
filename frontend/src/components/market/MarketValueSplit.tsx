import type { MarketMakerBoard } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'
import { AnimatedNumber } from './AnimatedNumber'

/**
 * Where every rupee of the buyer's price goes, before and after. The two bars are drawn to the
 * same scale (the price buyers pay today), so the second bar being visibly shorter *is* the
 * saving, and the block that disappears is the intermediary spread.
 */
export function MarketValueSplit({ board, math }: { board: MarketMakerBoard; math: MarketMath }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const scale = board.buyerCurrentPerKg
  const share = (value: number) => Math.max(0, (value / scale) * 100)
  const pct = (value: number) => `${share(value)}%`
  // A segment narrower than this cannot hold its own label without clipping, so the value is
  // left to the legend and the outcome cards below rather than being cut in half.
  const labelled = (value: number) => share(value) >= 13
  const rupee = (value: number) => `₹${Number.isInteger(value) ? value : value.toFixed(2)}`
  const spreadBefore = board.buyerCurrentPerKg - board.mandiPricePerKg
  const hasMarket = math.committedKg > 0 && math.vehicle

  return (
    <div className="mm-split">
      <div className="mm-split-row">
        <header><span>{l('Through the traditional chain today', 'आज पारंपरिक श्रृंखला से')}</span><strong>{rupee(board.buyerCurrentPerKg)}<small>{l('/kg', '/किलो')}</small></strong></header>
        <div className="mm-split-bar" role="img" aria-label={l(`Farmer ${rupee(board.mandiPricePerKg)} per kg, intermediaries ${rupee(spreadBefore)} per kg`, `किसान ${rupee(board.mandiPricePerKg)} प्रति किलो, बिचौलिया अंतर ${rupee(spreadBefore)} प्रति किलो`)}>
          <i className="seg-farmer" style={{ width: pct(board.mandiPricePerKg) }}>{labelled(board.mandiPricePerKg) && <b>{rupee(board.mandiPricePerKg)}</b>}</i>
          <i className="seg-spread" style={{ width: pct(spreadBefore) }}>{labelled(spreadBefore) && <b>{rupee(spreadBefore)}</b>}</i>
        </div>
        <footer><span className="key key-farmer">{l('Farmer', 'किसान')}</span><span className="key key-spread">{l('Aggregator, mandi, wholesaler, retailer', 'एग्रीगेटर, मंडी, थोक और खुदरा विक्रेता')}</span></footer>
      </div>

      <div className={`mm-split-row is-direct ${math.viable ? 'is-live' : ''}`}>
        <header><span>{l('Direct through this market', 'इस बाज़ार से सीधे')}</span><strong>₹{hasMarket ? math.deliveredPerKg.toFixed(2) : '—'}<small>{l('/kg', '/किलो')}</small></strong></header>
        <div className="mm-split-bar" role="img" aria-label={l(`Farmer ₹${math.farmerGatePerKg}, freight ₹${math.freightPerKg.toFixed(2)}, platform ₹${math.platformFeePerKg.toFixed(2)}`, `किसान ₹${math.farmerGatePerKg}, ढुलाई ₹${math.freightPerKg.toFixed(2)}, प्लेटफ़ॉर्म ₹${math.platformFeePerKg.toFixed(2)}`)}>
          <i className="seg-farmer" style={{ width: pct(math.farmerGatePerKg) }}>{labelled(math.farmerGatePerKg) && <b>{rupee(math.farmerGatePerKg)}</b>}</i>
          <i className="seg-freight" style={{ width: pct(hasMarket ? math.freightPerKg : 0) }}>{hasMarket && labelled(math.freightPerKg) && <b>{rupee(math.freightPerKg)}</b>}</i>
          <i className="seg-platform" style={{ width: pct(math.platformFeePerKg) }} />
          <i className="seg-saved" style={{ width: pct(hasMarket ? Math.max(0, math.buyerSavingPerKg) : 0) }}>{hasMarket && labelled(math.buyerSavingPerKg) && <b>{rupee(math.buyerSavingPerKg)}</b>}</i>
        </div>
        <footer>
          <span className="key key-farmer">{l('Farmer', 'किसान')}</span>
          <span className="key key-freight">{l('Transport', 'ढुलाई')}</span>
          <span className="key key-platform">{l('Platform', 'प्लेटफ़ॉर्म')} {Math.round(board.platformFeePct * 1000) / 10}%</span>
          <span className="key key-saved">{l('Buyer keeps', 'खरीदार बचाता है')}</span>
        </footer>
      </div>

      <div className="mm-split-outcome">
        <article>
          <span>{l('Farmer receives more', 'किसान को अधिक मिलता है')}</span>
          <strong>+<AnimatedNumber value={math.farmerGainTotal} prefix="₹" /></strong>
          <small>{l(`₹${math.farmerGatePerKg}/kg instead of ₹${board.mandiPricePerKg}/kg`, `₹${board.mandiPricePerKg}/किलो के बजाय ₹${math.farmerGatePerKg}/किलो`)} · +{math.farmerGainPct.toFixed(1)}%</small>
        </article>
        <article>
          <span>{l('Buyers pay less', 'खरीदार कम देते हैं')}</span>
          <strong>−<AnimatedNumber value={Math.max(0, math.buyerSavingTotal)} prefix="₹" /></strong>
          <small>{l(`₹${math.buyerSavingPerKg.toFixed(2)}/kg below the usual landed cost`, `आम कीमत से ₹${math.buyerSavingPerKg.toFixed(2)}/किलो कम`)}</small>
        </article>
        <article className="is-highlight">
          <span>{l('Spread replaced by transparent cost', 'बिचौलिया अंतर की जगह साफ़ लागत')}</span>
          <strong><AnimatedNumber value={math.spreadRemovedPerKg} decimals={2} prefix="₹" suffix="/kg" /></strong>
          <small>{l(`₹${spreadBefore.toFixed(2)} margin becomes ₹${math.spreadAfterPerKg.toFixed(2)} of stated freight and fee`, `₹${spreadBefore.toFixed(2)} का अंतर ₹${math.spreadAfterPerKg.toFixed(2)} की बताई गई ढुलाई और शुल्क बनता है`)}</small>
        </article>
      </div>
    </div>
  )
}
