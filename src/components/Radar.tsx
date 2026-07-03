import { createMemo, For, Show } from 'solid-js'
import { bearingDeg, pickRings, polar, radiusFor } from '../lib/geo'
import {
  destinations,
  destKey,
  hoverKey,
  origin,
  results,
  setHoverKey,
} from '../store'

const SIZE = 560
const C = SIZE / 2
const R = 234

interface Placed {
  key: string
  name: string
  x: number
  y: number
  labelX: number
  labelY: number
  anchor: 'start' | 'middle' | 'end'
  status: 'loading' | 'done' | 'error'
  minutes?: number
  color: string
  lineNames: string
}

export default function Radar() {
  const rings = createMemo(() => {
    const done = Object.values(results()).filter((r) => r.status === 'done')
    const max = Math.max(30, ...done.map((r) => r.route.minutes))
    return pickRings(max)
  })

  const placed = createMemo<Placed[]>(() => {
    const o = origin()
    if (!o) return []
    const maxRing = rings()[rings().length - 1]
    const res = results()

    const originKey = destKey(o)
    const entries: Placed[] = destinations()
      .filter((d) => destKey(d) !== originKey)
      .map((d) => {
      const key = destKey(d)
      const state = res[key] ?? { status: 'loading' as const }
      const bearing = bearingDeg(o, d)
      let r = R * 0.88
      let minutes: number | undefined
      let color = '#64748B'
      let lineNames = ''
      if (state.status === 'done') {
        minutes = state.route.minutes
        r = radiusFor(minutes, maxRing, R)
        color = state.route.lines[0]?.color ?? '#94A3B8'
        lineNames = state.route.lines.map((l) => l.name).join(' · ')
      }
      const { x, y } = polar(C, C, bearing, r)

      let anchor: Placed['anchor']
      let labelX: number
      let labelY: number
      if (Math.abs(x - C) < 36) {
        anchor = 'middle'
        labelX = x
        labelY = y < C ? y - 16 : y + 26
      } else {
        anchor = x >= C ? 'start' : 'end'
        labelX = x + (x >= C ? 10 : -10)
        labelY = y + 4.5
      }
      return {
        key,
        name: d.name,
        x,
        y,
        labelX,
        labelY,
        anchor,
        status: state.status,
        minutes,
        color,
        lineNames,
      }
    })

    // ラベルの縦方向衝突をずらして回避する
    const sorted = [...entries].sort((a, b) => a.labelY - b.labelY)
    for (let i = 1; i < sorted.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = sorted[j]
        const b = sorted[i]
        if (Math.abs(b.labelX - a.labelX) < 110 && b.labelY - a.labelY < 17) {
          b.labelY = a.labelY + 17
        }
      }
    }
    return entries
  })

  const maxRing = () => rings()[rings().length - 1]

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      class="w-full select-none"
      role="img"
      aria-label="所要時間レーダー"
    >
      {/* 同心円リング（時間目盛） */}
      <For each={rings()}>
        {(min) => {
          const r = () => radiusFor(min, maxRing(), R)
          return (
            <>
              <circle
                cx={C}
                cy={C}
                r={r()}
                fill="none"
                stroke="white"
                stroke-opacity="0.07"
              />
              <text
                x={C}
                y={C - r() - 5}
                text-anchor="middle"
                class="fill-muted/70"
                font-size="10.5"
              >
                {min}分
              </text>
            </>
          )
        }}
      </For>

      {/* 北マーカー */}
      <text
        x={C}
        y={18}
        text-anchor="middle"
        class="fill-muted/50"
        font-size="11"
        font-weight="600"
      >
        N
      </text>

      {/* 起点 */}
      <circle cx={C} cy={C} r={26} class="origin-pulse" fill="var(--color-accent)" />
      <circle
        cx={C}
        cy={C}
        r={7}
        fill="var(--color-accent)"
        stroke="var(--color-surface)"
        stroke-width="2.5"
      />
      <text
        x={C}
        y={C + 24}
        text-anchor="middle"
        class="fill-ink"
        font-size="13"
        font-weight="700"
      >
        {origin()?.name}
      </text>

      {/* 行き先 */}
      <For each={placed()}>
        {(p) => (
          <g
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            class="cursor-pointer"
            onMouseEnter={() => setHoverKey(p.key)}
            onMouseLeave={() => setHoverKey(null)}
          >
            <Show when={hoverKey() === p.key}>
              <circle
                r={13}
                fill="none"
                stroke={p.color}
                stroke-opacity="0.6"
                stroke-width="2"
              />
            </Show>
            <Show when={p.status === 'loading'}>
              <circle r={5.5} fill="#64748B" opacity="0.4" class="animate-pulse" />
            </Show>
            <Show when={p.status === 'error'}>
              <circle r={5.5} fill="none" stroke="#64748B" stroke-width="1.5" opacity="0.6" />
            </Show>
            <Show when={p.status === 'done'}>
              <circle
                r={hoverKey() === p.key ? 8.5 : 7}
                fill={p.color}
                stroke="var(--color-surface)"
                stroke-width="2"
                style={{ transition: 'r 150ms' }}
              />
              <circle
                r={hoverKey() === p.key ? 8.5 : 7}
                fill="none"
                stroke="white"
                stroke-opacity="0.35"
                stroke-width="1"
              />
            </Show>
          </g>
        )}
      </For>

      {/* ラベル（マーカーと別レイヤで最前面に） */}
      <For each={placed()}>
        {(p) => (
          <g
            style={{
              transform: `translate(${p.labelX}px, ${p.labelY}px)`,
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            class="pointer-events-none"
          >
            <text
              text-anchor={p.anchor}
              paint-order="stroke"
              stroke="var(--color-surface)"
              stroke-width="4"
              stroke-linejoin="round"
              class="fill-ink"
              font-size="12.5"
              font-weight="600"
              opacity={p.status === 'done' ? 1 : 0.45}
            >
              {p.name}
              <Show when={p.minutes !== undefined}>
                <tspan
                  dx="5"
                  font-size="14"
                  font-weight="800"
                  style={{ 'font-variant-numeric': 'tabular-nums' }}
                >
                  {p.minutes}
                </tspan>
                <tspan dx="1" font-size="10" class="fill-muted">
                  分
                </tspan>
              </Show>
            </text>
            <Show when={hoverKey() === p.key && p.lineNames}>
              <text
                y={15}
                text-anchor={p.anchor}
                paint-order="stroke"
                stroke="var(--color-surface)"
                stroke-width="4"
                stroke-linejoin="round"
                class="fill-muted"
                font-size="10.5"
              >
                {p.lineNames}
              </text>
            </Show>
          </g>
        )}
      </For>
    </svg>
  )
}
