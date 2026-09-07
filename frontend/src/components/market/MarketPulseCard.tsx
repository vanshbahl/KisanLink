import { ArrowRight, CircleAlert, Radar, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import type { MarketMakerBoard, Role } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { marketMakerService } from '../../services/marketMakerService'
import { MarketThresholdMeter } from './MarketThresholdMeter'

type Localize = (en: string, hi: string) => string

function pitch(role: Role, board: MarketMakerBoard, math: MarketMath, l: Localize) {
  const crop = l(board.crop, board.cropHi)
  const own = math.allocations.find((entry) => entry.lot.own)
  const blocker = math.blockers.find((item) => item.kind !== 'demand')

  if (blocker) return {
    headline: role === 'farmer' ? l('This direct market needs attention', 'इस सीधे बाज़ार पर ध्यान देना ज़रूरी है') : blocker.title,
    body: role === 'farmer'
      ? l('Demand is visible, but supply or a suitable vehicle must be available before the market can form.', 'मांग मौजूद है, लेकिन बाज़ार बनने से पहले पर्याप्त फसल और सही वाहन उपलब्ध होना चाहिए।')
      : blocker.detail,
  }

  if (board.status === 'created') return {
    headline: l('Direct market ready', 'सीधा बाज़ार तैयार है'),
    body: role === 'farmer'
      ? l(`${own?.allocatedKg ?? 0} kg of your ${crop.toLowerCase()} is matched. Pickup can now be created.`, `आपके ${own?.allocatedKg ?? 0} किलो ${crop} का मिलान हो गया है। अब पिकअप बनाया जा सकता है।`)
      : role === 'logistics'
        ? `${board.routeId} · ${math.committedKg} kg · ${math.utilisationPct}% ${l('vehicle load', 'वाहन भरा')}`
        : l(`${crop} is moving farm-direct at ₹${math.deliveredPerKg.toFixed(2)}/kg.`, `${crop} अब खेत से सीधे ₹${math.deliveredPerKg.toFixed(2)}/किलो पर आ रही है।`),
  }

  if (math.viable) return {
    headline: l('Direct market ready', 'सीधा बाज़ार तैयार है'),
    body: role === 'farmer'
      ? l(`${math.committedKg} kg of demand is confirmed. Your matched produce can now move in the pooled pickup.`, `${math.committedKg} किलो मांग पक्की है। आपकी मिली हुई फसल अब साझा पिकअप में जा सकती है।`)
      : role === 'logistics'
        ? l(`${math.committedKg} kg clears the ${math.thresholdKg} kg break-even load. The route can be created.`, `${math.committedKg} किलो ने ${math.thresholdKg} किलो की न्यूनतम मात्रा पूरी कर ली है। रूट बनाया जा सकता है।`)
        : l(`Farmer earns ₹${math.farmerGatePerKg}/kg, you pay ₹${math.deliveredPerKg.toFixed(2)}/kg.`, `किसान को ₹${math.farmerGatePerKg}/किलो मिलता है, आप ₹${math.deliveredPerKg.toFixed(2)}/किलो देते हैं।`),
  }

  return {
    headline: role === 'farmer'
      ? l(`Your ${crop.toLowerCase()} are close to a direct market`, `${crop} के लिए सीधा बाज़ार करीब है`)
      : role === 'consumer'
        ? l(`${math.gapKg} kg more needed to unlock farm-direct pricing`, `खेत से सीधी कीमत पाने के लिए ${math.gapKg} किलो और चाहिए`)
        : role === 'bulk'
          ? l(`Your corridor is ${math.gapKg} kg short of viable`, `आपके कॉरिडोर को व्यवहार्य बनने के लिए ${math.gapKg} किलो और चाहिए`)
          : l(`${math.gapKg} kg from a viable trip`, `व्यवहार्य यात्रा के लिए ${math.gapKg} किलो और चाहिए`),
    body: role === 'farmer'
      ? l(`${math.committedKg} of ${math.thresholdKg} kg demand is committed. ${own?.allocatedKg ?? 0} kg of your produce can be matched.`, `${math.thresholdKg} किलो में से ${math.committedKg} किलो मांग पक्की है। आपकी ${own?.allocatedKg ?? 0} किलो फसल का मिलान हो सकता है।`)
      : role === 'consumer'
        ? l(`${math.committedKg} of ${math.thresholdKg} kg is already committed by pooled buyers.`, `साझा खरीदारों ने ${math.thresholdKg} किलो में से ${math.committedKg} किलो पहले ही पक्का किया है।`)
        : role === 'logistics'
          ? l(`${math.vehicle?.registration ?? 'No vehicle'} is held for ${board.corridor}.`, `${board.corridorHi} के लिए ${math.vehicle?.registration ?? 'कोई वाहन नहीं'} रखा गया है।`)
          : l(`${math.bulkKg} kg business demand is pooled with ${math.consumerKg} kg household demand.`, `${math.bulkKg} किलो व्यावसायिक मांग को ${math.consumerKg} किलो घरेलू मांग से जोड़ा गया है।`),
  }
}

/** Compact, role-specific home summary backed by the detail page's shared market board. */
export function MarketPulseCard({ role }: { role: Role }) {
  const { language } = useLanguage()
  const l: Localize = (en, hi) => language === 'hi' ? hi : en
  const { data } = useAsyncData(() => marketMakerService.board(), [], { live: true })
  if (!data) return null
  const { board, math } = data
  const copy = pitch(role, board, math, l)
  const blocked = math.blockers.some((item) => item.kind !== 'demand')
  const created = board.status === 'created'
  const own = math.allocations.find((entry) => entry.lot.own)
  const action = created
    ? l('View market', 'बाज़ार देखें')
    : math.viable
      ? role === 'logistics' ? l('Create route', 'रूट बनाएं') : l('Create direct market', 'सीधा बाज़ार बनाएं')
      : role === 'logistics' ? l('Review corridor', 'कॉरिडोर देखें') : l('View opportunity', 'अवसर देखें')

  return (
    <section className={`mm-pulse mm-pulse-${role} mm-pulse-${board.status} ${blocked ? 'is-blocked' : ''}`}>
      <div className="mm-pulse-copy">
        <span className="eyebrow light">
          {created ? <Sparkles size={14} /> : blocked ? <CircleAlert size={14} /> : <Radar size={14} />}
          {l('Market Maker opportunity', 'मार्केट मेकर अवसर')} · {l(board.crop, board.cropHi)}
        </span>
        <h2>{copy.headline}</h2>
        <p>{copy.body}</p>
        {!blocked && <MarketThresholdMeter board={board} math={math} tone="dark" showLabels={false} />}
        <div className="mm-pulse-economics" aria-label={l('Market Maker price comparison', 'मार्केट मेकर कीमत तुलना')}>
          <div><span>{l('Current mandi earning', 'अभी मंडी कमाई')}</span><strong>₹{board.mandiPricePerKg}<small>{l('/kg', '/किलो')}</small></strong></div>
          <div><span>{l('With Market Maker', 'मार्केट मेकर के साथ')}</span><strong>₹{math.farmerGatePerKg}<small>{l('/kg to farmer', '/किलो किसान को')}</small></strong></div>
          {role !== 'farmer' && <div><span>{l('Buyer pays', 'खरीदार देता है')}</span><strong>₹{(math.viable ? math.deliveredPerKg : math.deliveredAtThresholdPerKg).toFixed(2)}<small>{l('/kg', '/किलो')}</small></strong></div>}
          {role === 'farmer' && <div><span>{l('Your produce matched', 'आपकी मिली फसल')}</span><strong>{own?.allocatedKg ?? 0}<small> kg</small></strong></div>}
        </div>
        <div className="mm-pulse-actions">
          <Link className="btn btn-light" to={`/${role}/market`}>{action}<ArrowRight size={16} /></Link>
          {role === 'logistics' && math.vehicle && <span className="mm-pulse-vehicle"><Truck size={14} /> {math.vehicle.registration} · {math.capacityKg} kg</span>}
        </div>
      </div>
      <aside className="mm-pulse-progress">
        <strong>{math.committedKg}<small> / {Number.isFinite(math.thresholdKg) ? math.thresholdKg : '—'} kg</small></strong>
        <span>{math.viable ? l('Demand threshold reached', 'मांग की सीमा पूरी') : l(`${math.gapKg} kg demand still needed`, `${math.gapKg} किलो मांग और चाहिए`)}</span>
      </aside>
    </section>
  )
}
