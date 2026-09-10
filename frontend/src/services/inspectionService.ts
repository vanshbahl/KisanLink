import type {
  CustodyStage,
  DropoffCondition,
  InspectionCapture,
  InspectionCaptureStatus,
  InspectionCheckpoint,
  LotInspectionState,
  LotTrail,
  PackagingType,
  SampleAssignment,
  SampleInstruction,
} from '../types'
import { INSPECTION_CHECKPOINTS } from '../types'
import { apiClient } from './apiClient'
import { prototypeService } from './prototypeService'

/**
 * Orchestrates the lot quality inspection + randomized sampling + visual chain-of-custody
 * system described in the product brief. Every lot is keyed by a human-readable `lotCode`
 * (e.g. "KL-TOM-1048") in shared prototype state.
 *
 * Anti-fraud design: sample selection always tries the real backend first (server-side,
 * cryptographically-seeded RNG - see backend/app/services/sampling_service.py). When a lot
 * has no real `cropListingId` (most seeded demo data) or the backend is unreachable, it falls
 * back to a *deterministic* client-side draw seeded from `lotCode + checkpoint` — not
 * Math.random() — so the same lot always re-derives the same containers. Either way the
 * result is persisted to shared state on first draw and never regenerated on reload.
 */

export interface LotContext {
  lotCode: string
  cropName: string
  quantityKg: number
  cropListingId?: string
  packagingType?: PackagingType
  containerCount?: number
  unitWeightKg?: number
}

const POSITION_CYCLE = ['Upper / outer layer', 'Middle / interior section', 'Lower / interior section']

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 - small, fast, deterministic PRNG. Not cryptographic; only used as the
 * offline fallback when the server-side draw is unavailable. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mirrors backend/app/services/sampling_service.py::compute_sample_size. Prototype-safe
 * minimum-sampling heuristic - NOT a formal AQL/statistical certification scheme. */
export function computeSampleSize(containerCount: number): number {
  if (containerCount <= 1) return containerCount
  if (containerCount <= 5) return 2
  if (containerCount <= 12) return 3
  if (containerCount <= 24) return 4
  return Math.min(containerCount, Math.max(4, Math.ceil(containerCount * 0.15)))
}

function localDraw(lotCode: string, checkpoint: InspectionCheckpoint, containerCount: number): { sampleSize: number; selected: number[] } {
  const rand = mulberry32(hashSeed(`${lotCode}:${checkpoint}`))
  const sampleSize = computeSampleSize(containerCount)
  const pool = Array.from({ length: containerCount }, (_, i) => i + 1)
  const selected: number[] = []
  for (let i = 0; i < sampleSize && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length)
    selected.push(pool.splice(idx, 1)[0])
  }
  return { sampleSize, selected: selected.sort((a, b) => a - b) }
}

function buildInstructions(selected: number[]): SampleInstruction[] {
  return selected.map((containerNumber, i) => {
    const position = POSITION_CYCLE[i % POSITION_CYCLE.length]
    return {
      containerNumber,
      position,
      note: `Open container ${containerNumber} and capture 4-6 representative pieces from the ${position.toLowerCase()}.`,
    }
  })
}

async function ensureLotState(lot: LotContext): Promise<LotInspectionState> {
  const state = await prototypeService.getState()
  let entry = state.inspectionLots[lot.lotCode]
  if (!entry) {
    entry = {
      lotCode: lot.lotCode,
      cropListingId: lot.cropListingId,
      cropName: lot.cropName,
      quantityKg: lot.quantityKg,
      packagingType: lot.packagingType,
      containerCount: lot.containerCount,
      unitWeightKg: lot.unitWeightKg,
      declaredAt: new Date().toISOString(),
      farmerPhotos: [],
      sampleAssignments: {},
      captures: [],
    }
    state.inspectionLots[lot.lotCode] = entry
    await prototypeService.replaceState(state)
  } else if (lot.cropListingId && !entry.cropListingId) {
    entry.cropListingId = lot.cropListingId
    await prototypeService.replaceState(state)
  }
  return entry
}

export const inspectionService = {
  /** Server-generated (or deterministic offline-equivalent) random sample. Idempotent per
   * (lotCode, checkpoint) - a screen refresh must return the exact same containers. */
  async getOrCreateSampleAssignment(lot: LotContext, checkpoint: InspectionCheckpoint): Promise<SampleAssignment> {
    const entry = await ensureLotState(lot)
    const existing = entry.sampleAssignments[checkpoint]
    if (existing) return existing

    const containerCount = entry.containerCount ?? lot.containerCount ?? 0
    let assignment: SampleAssignment

    if (entry.cropListingId) {
      try {
        const raw = await apiClient.createOrGetSampleAssignment(entry.cropListingId, checkpoint)
        assignment = {
          id: raw.id,
          lotCode: lot.lotCode,
          checkpoint,
          containerCount: raw.container_count,
          sampleSize: raw.sample_size,
          selectedContainers: raw.selected_containers,
          instructions: raw.instructions.map((i) => ({ containerNumber: i.container_number, position: i.position, note: i.note })),
          method: raw.method,
          createdAt: raw.created_at,
          serverGenerated: true,
        }
        entry.sampleAssignments[checkpoint] = assignment
        const state = await prototypeService.getState()
        state.inspectionLots[lot.lotCode] = entry
        await prototypeService.replaceState(state)
        return assignment
      } catch (err) {
        console.warn('Sample assignment: backend unavailable, using local deterministic draw.', err)
      }
    }

    if (!containerCount || containerCount < 1) {
      throw new Error('This lot has no packaging/container information, so a random sample cannot be drawn.')
    }
    const { sampleSize, selected } = localDraw(lot.lotCode, checkpoint, containerCount)
    assignment = {
      id: `local-${lot.lotCode}-${checkpoint}`,
      lotCode: lot.lotCode,
      checkpoint,
      containerCount,
      sampleSize,
      selectedContainers: selected,
      instructions: buildInstructions(selected),
      method: 'client_deterministic_v1',
      createdAt: new Date().toISOString(),
      serverGenerated: false,
    }
    entry.sampleAssignments[checkpoint] = assignment
    const state = await prototypeService.getState()
    state.inspectionLots[lot.lotCode] = entry
    await prototypeService.replaceState(state)
    return assignment
  },

  async getSampleAssignment(lotCode: string, checkpoint: InspectionCheckpoint): Promise<SampleAssignment | undefined> {
    const state = await prototypeService.getState()
    return state.inspectionLots[lotCode]?.sampleAssignments[checkpoint]
  },

  /** Uploads one evidence photo. Tries the real AI/backend first; if that fails for any
   * reason (offline, model unavailable, network error) the photo is still saved as evidence
   * with status "saved_ai_unavailable" - the custody workflow must never be blocked by an
   * AI failure. */
  async submitCapture(params: {
    lot: LotContext
    checkpoint: InspectionCheckpoint
    file: Blob
    containerNumber?: number
    sampleAssignmentId?: string
    capturedBy?: string
  }): Promise<InspectionCapture> {
    const entry = await ensureLotState(params.lot)
    let imageUrl: string
    let status: InspectionCaptureStatus = 'saved_ai_unavailable'

    try {
      const raw = await apiClient.analyzeInspectionImage({
        file: params.file,
        checkpoint: params.checkpoint,
        cropListingId: entry.cropListingId,
        sampleAssignmentId: params.sampleAssignmentId,
        containerNumber: params.containerNumber,
      })
      imageUrl = raw.sample_image_url
      status = raw.predicted_class === 'fresh' ? 'fresh' : 'quality_concern'
      // A single not_fresh read on one sampled crate is treated as "needs review" at the
      // capture level; checkpoint-level aggregation (see deriveStageStatus) is what decides
      // the conservative "quality_concern" vs "needs_review" split across the whole sample.
      if (status === 'quality_concern') status = 'needs_review' as InspectionCaptureStatus
    } catch (err) {
      console.warn('Inspection AI unavailable - saving evidence without an AI verdict.', err)
      imageUrl = await blobToDataUrl(params.file)
      status = 'saved_ai_unavailable'
    }

    const capture: InspectionCapture = {
      id: `cap-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      lotCode: params.lot.lotCode,
      checkpoint: params.checkpoint,
      containerNumber: params.containerNumber,
      sampleAssignmentId: params.sampleAssignmentId,
      imageUrl,
      status,
      capturedAt: new Date().toISOString(),
      capturedBy: params.capturedBy,
    }

    const state = await prototypeService.getState()
    const stateEntry = state.inspectionLots[params.lot.lotCode] ?? entry
    stateEntry.captures = [...stateEntry.captures, capture]
    if (params.checkpoint === 'FARMER_GATE') stateEntry.farmerPhotos = [...stateEntry.farmerPhotos, imageUrl]
    state.inspectionLots[params.lot.lotCode] = stateEntry
    await prototypeService.replaceState(state)
    return capture
  },

  async retakeCapture(lotCode: string, captureId: string): Promise<void> {
    const state = await prototypeService.getState()
    const entry = state.inspectionLots[lotCode]
    if (!entry) return
    entry.captures = entry.captures.filter((c) => c.id !== captureId)
    await prototypeService.replaceState(state)
  },

  async recordDropoffCondition(lotCode: string, condition: DropoffCondition): Promise<void> {
    const state = await prototypeService.getState()
    const entry = state.inspectionLots[lotCode]
    if (!entry) return
    entry.dropoffCondition = condition
    await prototypeService.replaceState(state)
  },

  async getLotState(lotCode: string): Promise<LotInspectionState | undefined> {
    const state = await prototypeService.getState()
    return state.inspectionLots[lotCode]
  },

  /** Assembles the full visual chain-of-custody trail for one lot, checkpoint by checkpoint,
   * using the same conservative aggregation rule as the backend (never a fabricated score). */
  async getLotTrail(lotCode: string): Promise<LotTrail | undefined> {
    const entry = await this.getLotState(lotCode)
    if (!entry) return undefined

    const stages: CustodyStage[] = []
    for (const checkpoint of INSPECTION_CHECKPOINTS) {
      const captures = entry.captures.filter((c) => c.checkpoint === checkpoint)
      const assignment = entry.sampleAssignments[checkpoint]
      const condition = checkpoint === 'LOGISTICS_DROPOFF' ? entry.dropoffCondition : undefined
      if (!captures.length && !assignment && !condition) continue

      stages.push({
        checkpoint,
        status: deriveStageStatus(checkpoint, captures, condition),
        photoCount: captures.length + (condition?.photoUrl ? 1 : 0),
        sampledContainers: assignment?.sampleSize,
        totalContainers: assignment?.containerCount,
        selectedContainers: assignment?.selectedContainers,
        firstCapturedAt: captures[0]?.capturedAt,
        lastCapturedAt: captures[captures.length - 1]?.capturedAt,
        captures,
        condition,
      })
    }

    return {
      lotCode: entry.lotCode,
      cropListingId: entry.cropListingId,
      cropName: entry.cropName,
      quantityKg: entry.quantityKg,
      packagingType: entry.packagingType,
      containerCount: entry.containerCount,
      unitWeightKg: entry.unitWeightKg,
      declaredAt: entry.declaredAt,
      stages,
    }
  },
}

/** Conservative, transparent aggregation - mirrors backend/app/api/v1/inspections.py -
 * never a fabricated numeric score. */
export function deriveStageStatus(
  checkpoint: InspectionCheckpoint,
  captures: InspectionCapture[],
  condition?: DropoffCondition
): CustodyStage['status'] {
  if (checkpoint === 'LOGISTICS_DROPOFF') {
    if (!condition && !captures.length) return 'pending'
    if (condition && (!condition.sealed || !condition.packagingIntact)) return 'needs_review'
    return 'declared'
  }
  if (!captures.length) return 'pending'
  if (checkpoint === 'FARMER_GATE') return 'declared'

  const resolved = captures.filter((c) => c.status !== 'saved_ai_unavailable')
  if (!resolved.length) return 'unable_to_assess'
  const concern = resolved.filter((c) => c.status === 'needs_review' || c.status === 'quality_concern').length
  if (concern === 0) return 'fresh'
  if (concern === resolved.length) return 'quality_concern'
  return 'needs_review'
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
