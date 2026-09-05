import { useLanguage } from '../../contexts/LanguageContext'
import { aiText } from '../../i18n/farmerAi'

export function AiConfidenceBadge({ score }: { score: number }) {
  const { language } = useLanguage()
  const tier = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low'
  const key = tier === 'high' ? 'confidenceHigh' : tier === 'medium' ? 'confidenceMedium' : 'confidenceLow'
  return (
    <span className={`ai-confidence ai-confidence-${tier}`}>
      <i aria-hidden="true" />
      {aiText(language, key)}
    </span>
  )
}
