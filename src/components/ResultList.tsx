import { createMemo, For, Show } from 'solid-js'
import type { Station } from '../api/transit'
import {
  destinations,
  destKey,
  hoverKey,
  origin,
  removeDestination,
  results,
  retryDestination,
  setHoverKey,
  type ResultState,
} from '../store'

interface Row {
  key: string
  station: Station
  state: ResultState
}

export default function ResultList() {
  const rows = createMemo<Row[]>(() => {
    const res = results()
    const o = origin()
    const list = destinations()
      .filter((d) => !o || destKey(d) !== destKey(o))
      .map((d) => {
      const key = destKey(d)
      return { key, station: d, state: res[key] ?? { status: 'loading' as const } }
    })
    const order = (r: Row) =>
      r.state.status === 'done'
        ? r.state.route.minutes
        : r.state.status === 'loading'
          ? 10_000
          : 20_000
    return list.sort((a, b) => order(a) - order(b))
  })

  return (
    <ul class="flex flex-col gap-1.5">
      <For each={rows()}>
        {(row) => (
          <li
            class={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              hoverKey() === row.key
                ? 'border-white/15 bg-white/8'
                : 'border-white/5 bg-white/3'
            }`}
            onMouseEnter={() => setHoverKey(row.key)}
            onMouseLeave={() => setHoverKey(null)}
          >
            <div class="min-w-0 flex-1">
              <div class="font-bold text-ink">{row.station.name}</div>
              <Show when={row.state.status === 'done' && row.state}>
                {(state) => {
                  const s = state()
                  if (s.status !== 'done') return null
                  return (
                    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <For each={s.route.lines}>
                        {(line) => (
                          <span class="inline-flex items-center gap-1.5 text-[11px] text-muted">
                            <span
                              class="h-2.5 w-1 rounded-full ring-1 ring-white/20"
                              style={{ background: line.color }}
                            />
                            {line.name}
                          </span>
                        )}
                      </For>
                    </div>
                  )
                }}
              </Show>
              <Show when={row.state.status === 'error'}>
                <div class="mt-0.5 text-[11px] text-muted">
                  経路が見つかりませんでした
                  <button
                    class="ml-2 text-accent/80 hover:text-accent"
                    onClick={() => retryDestination(row.station)}
                  >
                    再試行
                  </button>
                </div>
              </Show>
            </div>

            <Show when={row.state.status === 'done' && row.state}>
              {(state) => {
                const s = state()
                if (s.status !== 'done') return null
                return (
                  <div class="flex items-baseline gap-3 text-right">
                    <span class="text-[11px] text-muted">
                      乗換{s.route.transfers}
                      <Show when={s.route.fareIc !== undefined}>
                        {' · ¥'}
                        {s.route.fareIc}
                      </Show>
                    </span>
                    <span class="min-w-14 text-xl font-extrabold tabular-nums text-ink">
                      {s.route.minutes}
                      <span class="ml-0.5 text-xs font-medium text-muted">分</span>
                    </span>
                  </div>
                )
              }}
            </Show>
            <Show when={row.state.status === 'loading'}>
              <div class="h-5 w-14 animate-pulse rounded bg-white/10" />
            </Show>

            <button
              aria-label={`${row.station.name}を削除`}
              class="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full border border-white/15 bg-[#1a2234] text-[10px] text-muted hover:text-ink group-hover:flex"
              onClick={() => removeDestination(row.key)}
            >
              ✕
            </button>
          </li>
        )}
      </For>
    </ul>
  )
}
