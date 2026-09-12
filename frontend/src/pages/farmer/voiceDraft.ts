/**
 * Hand-off slot for a voice-parsed listing.
 *
 * The voice modal can be opened from "मेरी फसल", but the fields it produces belong to the
 * sell flow on the next route. Rather than widening the router state or re-parsing, the
 * parsed fields are parked here for exactly one read.
 *
 * Module-level rather than sessionStorage on purpose: a half-finished sentence should not
 * survive a reload and silently prefill a later listing.
 */
export interface VoiceDraft {
  crop: string
  cropHi?: string
  quantityKg: number
  pricePerKg: number
  unit?: 'kg' | 'quintal' | 'tonne'
  harvestDate: string
  availableFrom?: string
  pickupDate?: string
  pickupWindow?: string
  fulfillment?: 'pickup' | 'self_delivery'
  farm?: string
  notes?: string
}

let pending: VoiceDraft | null = null

export function stashVoiceDraft(draft: VoiceDraft) {
  pending = draft
}

/** Returns the parked draft and clears it, so it is never applied twice. */
export function takeVoiceDraft(): VoiceDraft | null {
  const draft = pending
  pending = null
  return draft
}
