/**
 * Single source of truth for Kisan Intelligence pacing.
 *
 * Every AI card across Farmer, Consumer, Bulk and Logistics runs the same lifecycle:
 * trigger -> floating focus state -> deliberate processing window -> result reveal -> normal page.
 *
 * `AI_REVEAL_MS` is a *floor*, never a cap: the real async work is always awaited, and the
 * result is only revealed once both the work and this window have completed. That keeps the
 * interaction readable (a fast deterministic calculation never flashes past) without ever
 * faking completion before the underlying call settles.
 */
export const AI_REVEAL_MS = 3600
export const AI_SETTLE_MS = 620

/** Reduced-motion users get the same lifecycle with the theatre removed. */
export const AI_REDUCED_REVEAL_MS = 120
export const AI_REDUCED_SETTLE_MS = 60

export const revealMs = (reduced: boolean) => (reduced ? AI_REDUCED_REVEAL_MS : AI_REVEAL_MS)
export const settleMs = (reduced: boolean) => (reduced ? AI_REDUCED_SETTLE_MS : AI_SETTLE_MS)
