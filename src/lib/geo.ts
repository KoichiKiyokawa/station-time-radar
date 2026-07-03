import type { Station } from '../api/transit'

/** 真北=0°、時計回りの方位角（度） */
export function bearingDeg(from: Station, to: Station): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const p1 = toRad(from.lat)
  const p2 = toRad(to.lat)
  const dl = toRad(to.lon - from.lon)
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** 最大所要分数を覆う等間隔リング（5分刻みの4本） */
export function pickRings(maxMinutes: number): number[] {
  const step = Math.max(5, Math.ceil(maxMinutes / 4 / 5) * 5)
  return [step, step * 2, step * 3, step * 4]
}

/** 半径 = 所要時間の sqrt スケール（外周の間延び防止） */
export function radiusFor(minutes: number, maxRing: number, R: number): number {
  return R * Math.sqrt(Math.min(minutes, maxRing) / maxRing)
}

/** 方位角と半径から SVG 座標へ（北=上） */
export function polar(
  cx: number,
  cy: number,
  bearing: number,
  r: number,
): { x: number; y: number } {
  const a = ((bearing - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
