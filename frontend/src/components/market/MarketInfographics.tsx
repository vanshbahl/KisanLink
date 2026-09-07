import { Coins, Gauge, PackageOpen, Truck, Users, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MarketMakerBoard, Role } from '../../types'
import type { MarketMath } from '../../services/marketMakerEngine'
import { useLanguage } from '../../contexts/LanguageContext'

interface Block { icon: LucideIcon; value: string; label: string; line: string }

/**
 * The secondary explanation, as infographic blocks rather than prose: one icon, one number
 * and one short sentence each. Role adapters choose which four signals matter — the shared
 * presentation is identical so every role reads the same way.
 */
export function MarketInfographics({ role, board, math }: { role: Role; board: MarketMakerBoard; math: MarketMath }) {
  const { language } = useLanguage()
  const l = (en: string, hi: string) => language === 'hi' ? hi : en
  const threshold = Number.isFinite(math.thresholdKg) ? math.thresholdKg.toLocaleString('en-IN') : '—'
  const delivered = (math.viable ? math.deliveredPerKg : math.deliveredAtThresholdPerKg).toFixed(2)

  const shared: Record<string, Block> = {
    threshold: { icon: Gauge, value: `${threshold} kg`, label: l('Break-even load', 'ज़रूरी मात्रा'), line: l('One trip only pays for itself above this.', 'इससे ऊपर ही एक यात्रा फायदेमंद है।') },
    committed: { icon: Users, value: `${math.committedKg.toLocaleString('en-IN')} kg`, label: l('Committed today', 'आज पक्की मांग'), line: math.viable ? l('Threshold reached.', 'ज़रूरी मात्रा पूरी।') : l(`${math.gapKg} kg still to go.`, `${math.gapKg} किलो और चाहिए।`) },
    freight: { icon: Truck, value: `₹${math.freightPerKg.toFixed(2)}`, label: l('Freight per kg', 'प्रति किलो ढुलाई'), line: l(`₹${math.freightTotal.toLocaleString('en-IN')} for the trip, split by volume.`, `₹${math.freightTotal.toLocaleString('en-IN')} की लागत मात्रा में बंटती है।`) },
    delivered: { icon: Coins, value: `₹${delivered}`, label: l('Delivered price', 'डिलीवरी कीमत'), line: l(`Buyer limit is ₹${board.buyerCeilingPerKg.toFixed(2)}.`, `खरीदार की सीमा ₹${board.buyerCeilingPerKg.toFixed(2)} है।`) },
    farmer: { icon: Coins, value: `₹${math.farmerGatePerKg}`, label: l('Farmer gets', 'किसान को मिलता है'), line: l(`Mandi pays ₹${board.mandiPricePerKg}.`, `मंडी ₹${board.mandiPricePerKg} देती है।`) },
    supply: { icon: PackageOpen, value: `${math.offeredKg.toLocaleString('en-IN')} kg`, label: l('Supply offered', 'उपलब्ध फसल'), line: l(`${math.allocations.length} farm lots on this corridor.`, `इस कॉरिडोर पर ${math.allocations.length} खेत।`) },
    vehicle: { icon: Truck, value: `${math.utilisationPct}%`, label: l('Vehicle load', 'वाहन में भार'), line: math.vehicle ? `${math.vehicle.registration} · ${math.capacityKg} kg` : l('No vehicle held.', 'कोई वाहन नहीं।') },
    corridor: { icon: Warehouse, value: `${board.routeDistanceKm} km`, label: l('Corridor', 'कॉरिडोर'), line: l(board.corridor, board.corridorHi) },
  }

  const byRole: Record<Role, Block[]> = {
    farmer: [shared.farmer, shared.committed, shared.threshold, shared.corridor],
    consumer: [shared.delivered, shared.committed, shared.freight, shared.farmer],
    bulk: [shared.supply, shared.committed, shared.delivered, shared.corridor],
    logistics: [shared.vehicle, shared.threshold, shared.committed, shared.freight],
  }

  return (
    <div className="mm-infographics">
      {byRole[role].map((block) => (
        <article key={block.label}>
          <span className="mm-info-icon"><block.icon size={17} /></span>
          <strong>{block.value}</strong>
          <span className="mm-info-label">{block.label}</span>
          <small>{block.line}</small>
        </article>
      ))}
    </div>
  )
}
