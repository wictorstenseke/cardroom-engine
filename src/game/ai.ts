import type { Difficulty } from '../settings/types'
import type { Card } from './cards'
import { bestHandScore, compareScores, type HandScore } from './pokerRank'

export type AiAction = 'fold' | 'check' | 'call' | 'raise'

export interface AiContext {
  difficulty: Difficulty
  hole: Card[]
  up: Card[]
  toCall: number
  pot: number
  raiseIncrement: number
  canCheck: boolean
  canRaise: boolean
  stack: number
  street: 3 | 4 | 5 | 6 | 7
  activeOpponents: number
  raisesThisStreet: number
  humanIsLastAggressor: boolean
  /** Monte Carlo P(share pot at showdown) from fair information only (~0–1). */
  showdownEquity: number
}

function noise(difficulty: Difficulty): number {
  if (difficulty === 'easy') return (Math.random() - 0.5) * 0.14
  if (difficulty === 'medium') return (Math.random() - 0.5) * 0.09
  return (Math.random() - 0.5) * 0.05
}

function handStrength01(score: HandScore | null): number {
  if (!score) return 0
  const cat = score[0] / 8
  const k = (score[1] ?? 0) / 12
  return Math.min(1, cat * 0.82 + k * 0.18)
}

function playStrength(full: number, visible: number): number {
  return Math.max(full, visible * 0.88 + full * 0.12)
}

function difficultyMargin(d: Difficulty): number {
  if (d === 'easy') return 0.02
  if (d === 'medium') return 0.038
  return 0.055
}

export function pickAiAction(ctx: AiContext): AiAction {
  const cards = [...ctx.hole, ...ctx.up]
  const scoreFull = bestHandScore(cards)
  const scoreVis = bestHandScore(ctx.up)
  let s = handStrength01(scoreFull)
  const v = handStrength01(scoreVis)
  s += noise(ctx.difficulty)
  s = Math.max(0, Math.min(1, s))
  const p = playStrength(s, v)
  const eq = ctx.showdownEquity

  const pressure = ctx.activeOpponents > 2 ? 0.025 : 0

  if (ctx.canCheck) {
    const openEq =
      ctx.street <= 4 ? 0.42 + pressure * 0.5 : 0.38 + pressure * 0.5
    if (eq > openEq && ctx.canRaise && Math.random() < (ctx.difficulty === 'hard' ? 0.42 : 0.28)) {
      return 'raise'
    }
    if (p < 0.3 - pressure && ctx.difficulty === 'easy' && Math.random() < 0.08) {
      return 'raise'
    }
    if (p < 0.34) return 'check'
    if (p > 0.55 && ctx.canRaise && Math.random() < 0.32) return 'raise'
    if (v > 0.44 && ctx.canRaise && eq > 0.32 && Math.random() < 0.22) return 'raise'
    return 'check'
  }

  if (ctx.toCall > 0) {
    const potAfter = ctx.pot + ctx.toCall
    const potShare = ctx.toCall / potAfter

    const margin =
      difficultyMargin(ctx.difficulty) +
      (ctx.humanIsLastAggressor ? 0.048 : 0) +
      Math.min(0.065, Math.max(0, ctx.street - 3) * 0.014) +
      (ctx.raisesThisStreet >= 2 ? 0.038 * (ctx.raisesThisStreet - 1) : 0) +
      (ctx.activeOpponents > 2 ? -0.012 : 0)

    const needEquity = potShare + margin

    if (ctx.stack <= ctx.toCall) {
      return eq + noise(ctx.difficulty) * 0.04 >= potShare - 0.025 ? 'call' : 'fold'
    }

    if (ctx.canRaise) {
      const bar =
        ctx.street >= 6 ? 0.54 : ctx.street >= 5 ? 0.57 : ctx.street >= 4 ? 0.6 : 0.64
      const freq = ctx.difficulty === 'hard' ? 0.48 : ctx.difficulty === 'medium' ? 0.34 : 0.22
      if (eq > bar && Math.random() < freq) return 'raise'

      const semi =
        ctx.street >= 4 &&
        v > 0.4 &&
        eq > 0.3 &&
        eq < bar &&
        Math.random() < (ctx.difficulty === 'hard' ? 0.18 : 0.1)
      if (semi) return 'raise'
    }

    const eqAdj = eq + noise(ctx.difficulty) * 0.03
    if (eqAdj >= needEquity) return 'call'

    if (eqAdj >= needEquity - 0.035 && Math.random() < 0.12) return 'call'

    return 'fold'
  }

  if (ctx.canRaise && (eq > 0.52 || p > 0.52) && Math.random() < 0.35) return 'raise'
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
