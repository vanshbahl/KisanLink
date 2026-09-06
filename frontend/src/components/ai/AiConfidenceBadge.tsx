export function AiConfidenceBadge({ score, labels }: { score: number; labels?: { high: string; medium: string; low: string } }) {
  const tier = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low'
  const label = labels ? labels[tier] : tier === 'high' ? 'High confidence' : tier === 'medium' ? 'Moderate confidence' : 'Limited confidence'
  return (
    <span className={`ai-confidence ai-confidence-${tier}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}
