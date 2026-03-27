export interface PotLayer {
  amount: number
  eligibleIds: string[]
}

/**
 * Build side pots from per-player total contribution among showdown participants.
 * Contributions must be sorted ascending by distinct levels.
 */
export function buildPotLayers(
  rows: { id: string; contributed: number }[],
): PotLayer[] {
  const positive = rows.filter((r) => r.contributed > 0)
  if (positive.length === 0) return []
  const levels = [...new Set(positive.map((r) => r.contributed))].sort(
    (a, b) => a - b,
  )
  const layers: PotLayer[] = []
  let prev = 0
  for (const level of levels) {
    const inc = level - prev
    const eligibleIds = positive.filter((r) => r.contributed >= level).map((r) => r.id)
    const amount = inc * eligibleIds.length
    if (amount > 0) layers.push({ amount, eligibleIds })
    prev = level
  }
  return layers
}
