import type { Difficulty } from '../settings/types'
import type { Card } from './cards'
import { bestHandScore, compareScores, type HandScore } from './pokerRank'

export type AiAction = 'fold' | 'check' | 'call' | 'raise'

export interface AiContext {
  difficulty: Difficulty
  /** Full known cards for this player (hole + up). */
  hole: Card[]
  up: Card[]
  toCall: number
  pot: number
  /** Cost to raise one limit increment (0 if cannot raise). */
  raiseIncrement: number
  canCheck: boolean
  canRaise: boolean
  stack: number
  street: 3 | 4 | 5 | 6 | 7
  /** Opponent count still in hand (not folded). */
  activeOpponents: number
}

function noise(difficulty: Difficulty): number {
  if (difficulty === 'easy') return (Math.random() - 0.5) * 0.45
  if (difficulty === 'medium') return (Math.random() - 0.5) * 0.22
  return (Math.random() - 0.5) * 0.08
}

function handStrength01(score: HandScore | null): number {
  if (!score) return 0
  const cat = score[0] / 8
  const k = (score[1] ?? 0) / 12
  return Math.min(1, cat * 0.85 + k * 0.15)
}

export function pickAiAction(ctx: AiContext): AiAction {
  const cards = [...ctx.hole, ...ctx.up]
  const score = bestHandScore(cards)
  let s = handStrength01(score)
  s += noise(ctx.difficulty)
  s = Math.max(0, Math.min(1, s))

  const potOdds =
    ctx.toCall > 0 ? ctx.pot / (ctx.pot + ctx.toCall) : 0.55
  const pressure = ctx.activeOpponents > 2 ? 0.06 : 0

  if (ctx.canCheck) {
    if (s < 0.28 - pressure && ctx.difficulty === 'easy' && Math.random() < 0.15) {
      return 'raise'
    }
    if (s < 0.35) return 'check'
    if (s > 0.62 && ctx.canRaise) return 'raise'
    return 'check'
  }

  if (ctx.toCall > 0) {
    if (ctx.stack <= ctx.toCall) return 'call'
    if (s < 0.22 + (ctx.difficulty === 'hard' ? 0.05 : 0)) return 'fold'
    if (s < potOdds - (ctx.difficulty === 'hard' ? 0.12 : 0.05)) {
      return Math.random() < (ctx.difficulty === 'easy' ? 0.35 : 0.12) ? 'call' : 'fold'
    }
    if (s > 0.72 && ctx.canRaise) return 'raise'
    if (s > 0.55 && ctx.canRaise && ctx.difficulty !== 'easy' && Math.random() < 0.25) {
      return 'raise'
    }
    return 'call'
  }

  if (ctx.canRaise && s > 0.58) return 'raise'
  return 'check'
}

export function compareAiHand(a: Card[], b: Card[]): number {
  const sa = bestHandScore(a)
  const sb = bestHandScore(b)
  if (!sa && !sb) return 0
  if (!sa) return -1
  if (!sb) return 1
  return compareScores(sa, sb)
}
