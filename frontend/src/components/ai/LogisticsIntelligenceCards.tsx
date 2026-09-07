import { Link, useNavigate } from 'react-router-dom'
import { Route } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { deliveryRiskCheck, dispatchPulse, pickupSequence, routeOptimisationReview } from '../../services/logisticsIntelligenceService'
import type { Delivery, LogisticsPickup, LogisticsRoute, Vehicle } from '../../types'
import { AiInsightCard } from './AiInsightCard'
import { MarketplaceAiSection } from './MarketplaceAiSection'
import { MarketplaceAiTrigger } from './MarketplaceAiTrigger'
import { MarketplaceInsightResult } from './MarketplaceInsightResult'

/**
 * Logistics uses the same shared lifecycle as Farmer, Consumer and Bulk. Only the operator-facing
 * chrome is localised here; the analytical body stays in English exactly as the Consumer and Bulk
 * intelligence cards do, so one reading of the evidence is shown across the whole prototype.
 */
function useOpsCopy() {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)
  return {
    l,
    brandLabel: l('Kisan Intelligence', 'किसान इंटेलिजेंस'),
    thinkingLabel: l('Combining operations signals', 'संचालन संकेत जोड़े जा रहे हैं'),
    errorTitle: l('Analysis could not complete', 'विश्लेषण पूरा नहीं हुआ'),
    backLabel: l('Go back', 'वापस जाएं'),
  }
}

/** Result-surface labels shared by every localised logistics insight. */
function useResultCopy() {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => (language === 'hi' ? hi : en)
  return {
    eyebrow: l('Kisan Intelligence', 'किसान इंटेलिजेंस'),
    whyLabel: l('See why', 'कारण देखें'),
    hideWhyLabel: l('Hide reasoning', 'कारण छिपाएं'),
    confidenceLabels: { high: l('High confidence', 'उच्च विश्वास'), medium: l('Moderate confidence', 'मध्यम विश्वास'), low: l('Limited confidence', 'सीमित विश्वास') },
  }
}

/** Dashboard — one operational read on what needs the hub's attention now. */
export function DispatchPulseCard({ pickups, deliveries, vehicles }: { pickups: LogisticsPickup[]; deliveries: Delivery[]; vehicles: Vehicle[] }) {
  const { l, ...chrome } = useOpsCopy(); const resultCopy = useResultCopy(); const navigate = useNavigate()
  return <MarketplaceAiSection
    sectionClassName="logistics-intelligence-slot"
    title={l('Dispatch Pulse', 'डिस्पैच पल्स')}
    subtitle={l('The one pickup, delivery or exception this hub should clear next.', 'इस हब को अगला कौन सा पिकअप, डिलीवरी या समस्या निपटानी है।')}
    eyebrow={chrome.brandLabel}
    idleLabel={l('Review the queue', 'कतार देखें')}
    idleHint={l('Find the operation that needs attention now', 'अभी ध्यान चाहने वाला काम खोजें')}
    stages={[l('Reading open pickups', 'खुले पिकअप पढ़े जा रहे हैं'), l('Reading open deliveries', 'खुली डिलीवरी पढ़ी जा रही हैं'), l('Checking vehicle availability', 'वाहन उपलब्धता जांची जा रही है'), l('Checking reported issues', 'दर्ज समस्याएं जांची जा रही हैं'), l('Preparing dispatch advice', 'डिस्पैच सलाह तैयार हो रही है')]}
    run={() => dispatchPulse(pickups, deliveries, vehicles)}
    renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} {...resultCopy} onClose={reset} onCta={() => insight.href ? navigate(insight.href) : reset()} footer={l('Uses the open pickup and delivery queues, fleet status and reported issues in the current prototype state.', 'यह वर्तमान प्रोटोटाइप स्थिति के खुले पिकअप, डिलीवरी, फ्लीट और दर्ज समस्याओं का उपयोग करता है।')} />}
    {...chrome}
  />
}

/** Pickups queue — a defensible collection order for the open farm pickups. */
export function PickupSequenceCard({ pickups }: { pickups: LogisticsPickup[] }) {
  const { l, ...chrome } = useOpsCopy()
  return <MarketplaceAiTrigger
    className="ai-order-advisor logistics-queue-advisor"
    variant="inline"
    idleLabel={l('Sequence the queue', 'कतार क्रम तय करें')}
    idleHint={l('What should this shift collect first?', 'इस शिफ्ट में पहले क्या लेना है?')}
    stages={[l('Checking reported issues', 'दर्ज समस्याएं जांची जा रही हैं'), l('Checking vehicle assignment', 'वाहन असाइनमेंट जांचा जा रहा है'), l('Comparing pickup windows', 'पिकअप समय की तुलना'), l('Weighing load and linked orders', 'लोड और जुड़े ऑर्डर तौले जा रहे हैं')]}
    run={() => pickupSequence(pickups)}
    renderResult={(ranked, reset) => <AiInsightCard eyebrow={chrome.brandLabel} onClose={reset} footer={l('Order comes from reported issues, vehicle assignment, pickup window, load size and linked orders — not a predicted travel time.', 'यह क्रम दर्ज समस्याओं, वाहन असाइनमेंट, समय, लोड और जुड़े ऑर्डर से बनता है — अनुमानित यात्रा समय से नहीं।')}>
      {ranked.length === 0
        ? <p className="ai-explanation">{l('No open pickups to sequence in this state.', 'इस स्थिति में क्रम तय करने के लिए कोई खुला पिकअप नहीं है।')}</p>
        : <>
          <h2 className="ai-headline">{l(`Collect ${ranked[0].item.id} first — ${ranked[0].item.farm}.`, `पहले ${ranked[0].item.id} लें — ${ranked[0].item.farm}।`)}</h2>
          <div className="ai-priority-list">{ranked.slice(0, 5).map((entry) => <div className="ai-priority-item" key={entry.item.id}>
            <span className={`ai-priority-tag ${entry.priority}`}>{entry.priority === 'first' ? l('First', 'पहले') : entry.priority === 'next' ? l('Next', 'अगला') : l('Later', 'बाद में')}</span>
            <div className="ai-priority-copy"><strong>{entry.item.id} · {entry.item.farm}</strong><small>{entry.item.crop} · {entry.item.quantityKg.toLocaleString('en-IN')} kg</small><p>{entry.reason}</p></div>
            <div className="ai-priority-meta"><strong>{entry.item.vehicleId ?? l('Unassigned', 'तय नहीं')}</strong><small>{entry.item.pickupWindow}</small></div>
          </div>)}</div>
          <div className="ai-cta-row"><Link className="btn btn-primary" to={`/logistics/pickups/${ranked[0].item.id}`}><Route size={16} />{l('Open this pickup', 'यह पिकअप खोलें')}</Link></div>
        </>}
    </AiInsightCard>}
    {...chrome}
  />
}

/** Routes — the real OR-Tools optimizer call, presented through the shared lifecycle. */
export function RouteReviewCard({ routes, capacityKg }: { routes: LogisticsRoute[]; capacityKg?: number }) {
  const { l, ...chrome } = useOpsCopy(); const resultCopy = useResultCopy(); const navigate = useNavigate()
  return <MarketplaceAiTrigger
    className="logistics-route-advisor"
    variant="inline"
    idleLabel={l('Review pooling', 'पूलिंग देखें')}
    idleHint={l('How much does pooling save on this plan?', 'इस योजना में पूलिंग से कितनी बचत है?')}
    stages={[l('Collecting farm stops', 'खेत स्टॉप जुटाए जा रहे हैं'), l('Checking vehicle capacity', 'वाहन क्षमता जांची जा रही है'), l('Solving the pickup sequence', 'पिकअप क्रम हल किया जा रहा है'), l('Comparing against separate trips', 'अलग यात्राओं से तुलना'), l('Preparing route review', 'रूट समीक्षा तैयार हो रही है')]}
    run={() => routeOptimisationReview(routes, capacityKg)}
    renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} {...resultCopy} onClose={reset} onCta={() => insight.href ? navigate(insight.href) : reset()} footer={l('Distance, duration and utilisation come from the route optimizer response for the current plan.', 'दूरी, समय और उपयोग वर्तमान योजना के रूट अनुकूलक उत्तर से आते हैं।')} />}
    {...chrome}
  />
}

/** Deliveries queue — where the open buyer commitments are most likely to slip. */
export function DeliveryRiskCard({ deliveries }: { deliveries: Delivery[] }) {
  const { l, ...chrome } = useOpsCopy(); const resultCopy = useResultCopy(); const navigate = useNavigate()
  return <MarketplaceAiTrigger
    className="logistics-queue-advisor"
    variant="inline"
    idleLabel={l('Check risk', 'जोखिम जांचें')}
    idleHint={l('Which shipments are most likely to slip?', 'किन शिपमेंट में देरी की आशंका है?')}
    stages={[l('Reading shipment status', 'शिपमेंट स्थिति पढ़ी जा रही है'), l('Checking vehicle assignment', 'वाहन असाइनमेंट जांचा जा रहा है'), l('Reviewing reported issues', 'दर्ज समस्याओं की समीक्षा'), l('Preparing risk summary', 'जोखिम सारांश तैयार हो रहा है')]}
    run={() => deliveryRiskCheck(deliveries)}
    renderResult={(insight, reset) => <MarketplaceInsightResult {...insight} {...resultCopy} onClose={reset} onCta={() => insight.href ? navigate(insight.href) : reset()} footer={l('Read from delivery status, vehicle assignment and reported issues in the current prototype state.', 'यह वर्तमान प्रोटोटाइप स्थिति की डिलीवरी स्थिति, वाहन असाइनमेंट और दर्ज समस्याओं से पढ़ा जाता है।')} />}
    {...chrome}
  />
}
