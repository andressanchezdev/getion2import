// realtime.sequencer · control de secuencia (lastSeq): descarta duplicados, avanza con watermark y acepta system.* con seq 0
// conecta con: realtime.service y realtime.slice
// ojo: los saltos de seq son normales (rollbacks y eventos de otras compañías) y NUNCA se tratan como error (sección 16.3)
import type { RealtimeEvent } from '../types/realtime.contract'

export interface SequencerDecision {
  accepted: boolean
  deliver: boolean
  nextLastSeq: number | null
}

export const evaluateRealtimeSequence = (
  event: RealtimeEvent,
  currentLastSeq: number | null
): SequencerDecision => {
  if (event.type === 'system.watermark') {
    const watermarkSeq = event.data.seq
    const next = currentLastSeq === null ? watermarkSeq : Math.max(currentLastSeq, watermarkSeq)
    return {
      accepted: true,
      deliver: false,
      nextLastSeq: next,
    }
  }

  if (event.type === 'system.welcome') {
    const next = currentLastSeq === null ? event.data.currentSeq : currentLastSeq
    return {
      accepted: true,
      deliver: true,
      nextLastSeq: next,
    }
  }

  if (event.type === 'system.resync_required') {
    return {
      accepted: true,
      deliver: true,
      nextLastSeq: event.data.currentSeq,
    }
  }

  if (event.type.startsWith('system.') && event.seq === 0) {
    return {
      accepted: true,
      deliver: true,
      nextLastSeq: currentLastSeq,
    }
  }

  if (currentLastSeq !== null && event.seq <= currentLastSeq) {
    return {
      accepted: false,
      deliver: false,
      nextLastSeq: currentLastSeq,
    }
  }

  return {
    accepted: true,
    deliver: true,
    nextLastSeq: event.seq,
  }
}

export interface RealtimeSequencer {
  getLastSeq: () => number | null
  setLastSeq: (seq: number | null) => void
  accept: (event: RealtimeEvent) => boolean
}

export const createRealtimeSequencer = (initialLastSeq: number | null = null): RealtimeSequencer => {
  let lastSeq: number | null = initialLastSeq

  return {
    getLastSeq: () => lastSeq,
    setLastSeq: (seq) => {
      lastSeq = seq
    },
    accept: (event) => {
      const decision = evaluateRealtimeSequence(event, lastSeq)
      lastSeq = decision.nextLastSeq
      return decision.deliver
    },
  }
}

