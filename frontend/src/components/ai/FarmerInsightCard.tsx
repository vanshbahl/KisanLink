import type { ReactNode } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'
import { AiInsightCard } from './AiInsightCard'

/** Farmer translation adapter; generic result rendering remains role-neutral. */
export function FarmerInsightCard({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const { language } = useLanguage()
  return <AiInsightCard eyebrow={aiText(language, 'kisanIntelligence')} footer={aiText(language, 'disclaimerShort')} onClose={onClose}>{children}</AiInsightCard>
}
