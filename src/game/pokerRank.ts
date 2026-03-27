import type { Card, Rank } from './cards'
import { rankIndex } from './cards'

/** Category 8 = straight flush … 0 = high card. Higher is better. */
export type HandCategory = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type HandScore = readonly [HandCategory, ...number[]]

function countRanks(cards: Card[]): Map<Rank, number> {
  const m = new Map<Rank, number>()
  for (const c of cards) {
    m.set(c.rank, (m.get(c.rank) ?? 0) + 1)
  }
  return m
}

function isFlush(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const s = cards[0].suit
  return cards.every((c) => c.suit === s)
}

function straightHighRank(cards: Card[]): number | null {
  const uniq = [...new Set(cards.map((c) => rankIndex(c.rank)))].sort((a, b) => a - b)
  if (uniq.includes(12) && uniq.includes(0) && uniq.includes(1) && uniq.includes(2) && uniq.includes(3)) {
    return 3
  }
  for (let i = 0; i <= uniq.length - 5; i++) {
    let ok = true
    for (let k = 1; k < 5; k++) {
      if (uniq[i + k] !== uniq[i + k - 1] + 1) {
        ok = false
        break
      }
    }
    if (ok) return uniq[i + 4]
  }
  return null
}

function combinations5(cards: Card[], out: Card[][]): void {
  const n = cards.length
  const pick: Card[] = []
  function dfs(start: number) {
    if (pick.length === 5) {
      out.push([...pick])
      return
    }
    for (let i = start; i < n; i++) {
      pick.push(cards[i])
      dfs(i + 1)
      pick.pop()
    }
  }
  dfs(0)
}

/** Partial hands (fewer than 5 cards): only categories possible from upcards. */
function evaluatePartial(cards: Card[]): HandScore {
  const cnt = countRanks(cards)
  const byCount = [...cnt.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return rankIndex(b[0]) - rankIndex(a[0])
  })
  const ranksSortedDesc = [...cards]
    .map((c) => rankIndex(c.rank))
    .sort((a, b) => b - a)
  const pairs = byCount.filter(([, n]) => n === 2)

  if (byCount[0][1] === 4) {
    const quad = rankIndex(byCount[0][0])
    const kicker = byCount.find(([, n]) => n === 1)?.[0]
    return [7, quad, kicker != null ? rankIndex(kicker) : 0]
  }
  if (byCount[0][1] === 3) {
    const kickers = byCount
      .filter(([, n]) => n === 1)
      .map(([r]) => rankIndex(r))
      .sort((a, b) => b - a)
    return [3, rankIndex(byCount[0][0]), ...kickers]
  }
  if (pairs.length >= 2) {
    const pr = pairs.map(([r]) => rankIndex(r)).sort((a, b) => b - a)
    const kicker = byCount.find(([, n]) => n === 1)?.[0]
    return [2, pr[0], pr[1], kicker != null ? rankIndex(kicker) : 0]
  }
  if (pairs.length === 1) {
    const kickers = byCount
      .filter(([, n]) => n === 1)
      .map(([r]) => rankIndex(r))
      .sort((a, b) => b - a)
    return [1, rankIndex(pairs[0][0]), ...kickers]
  }
  return [0, ...ranksSortedDesc]
}

function evaluate5Cards(cards: Card[]): HandScore {
  const cnt = countRanks(cards)
  const byCount = [...cnt.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return rankIndex(b[0]) - rankIndex(a[0])
  })
  const flush = isFlush(cards)
  const sh = straightHighRank(cards)
  const ranksSortedDesc = [...cards]
    .map((c) => rankIndex(c.rank))
    .sort((a, b) => b - a)
  const pairs = byCount.filter(([, n]) => n === 2)

  if (flush && sh !== null) {
    return [8, sh]
  }
  if (byCount[0][1] === 4) {
    const quad = rankIndex(byCount[0][0])
    const kicker = byCount.find(([, n]) => n === 1)?.[0]
    return [7, quad, kicker != null ? rankIndex(kicker) : 0]
  }
  if (byCount[0][1] === 3 && byCount[1][1] === 2) {
    return [6, rankIndex(byCount[0][0]), rankIndex(byCount[1][0])]
  }
  if (flush) {
    return [5, ...ranksSortedDesc]
  }
  if (sh !== null) {
    return [4, sh]
  }
  if (byCount[0][1] === 3) {
    const kickers = byCount
      .filter(([, n]) => n === 1)
      .map(([r]) => rankIndex(r))
      .sort((a, b) => b - a)
    return [3, rankIndex(byCount[0][0]), ...kickers]
  }
  if (pairs.length >= 2) {
    const pr = pairs.map(([r]) => rankIndex(r)).sort((a, b) => b - a)
    const kicker = byCount.find(([, n]) => n === 1)?.[0]
    return [2, pr[0], pr[1], kicker != null ? rankIndex(kicker) : 0]
  }
  if (pairs.length === 1) {
    const kickers = byCount
      .filter(([, n]) => n === 1)
      .map(([r]) => rankIndex(r))
      .sort((a, b) => b - a)
    return [1, rankIndex(pairs[0][0]), ...kickers]
  }
  return [0, ...ranksSortedDesc]
}

export function compareScores(a: HandScore, b: HandScore): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

export function bestHandScore(cards: Card[]): HandScore | null {
  if (cards.length === 0) return null
  if (cards.length < 5) {
    return evaluatePartial(cards)
  }
  const combos: Card[][] = []
  combinations5(cards, combos)
  let best: HandScore | null = null
  for (const combo of combos) {
    const s = evaluate5Cards(combo)
    if (!best || compareScores(s, best) > 0) best = s
  }
  return best
}

export function bestVisibleScore(upcards: Card[]): HandScore | null {
  return bestHandScore(upcards)
}

export function handLabel(score: HandScore): string {
  const cat = score[0]
  const labels: Record<HandCategory, string> = {
    8: 'Straight flush',
    7: 'Four of a kind',
    6: 'Full house',
    5: 'Flush',
    4: 'Straight',
    3: 'Three of a kind',
    2: 'Two pair',
    1: 'Pair',
    0: 'High card',
  }
  return labels[cat as HandCategory] ?? 'Hand'
}
