import { createResource, createSignal, For, Show } from 'solid-js'
import { fetchFeeds } from '../api/transit'

export default function AttributionFooter() {
  const [open, setOpen] = createSignal(false)
  const [feeds] = createResource(
    () => open() || undefined,
    () => fetchFeeds(),
  )

  return (
    <footer class="border-t border-white/5 py-5 text-center text-[11px] text-muted/70">
      <p>
        Data: GTFS / ODPT 各事業者（
        <a
          href="https://api.transit.ls8h.com/"
          target="_blank"
          rel="noreferrer"
          class="underline-offset-2 hover:text-muted hover:underline"
        >
          api.transit.ls8h.com
        </a>
        ・非公式API）·{' '}
        <button
          class="underline underline-offset-2 hover:text-muted"
          onClick={() => setOpen(true)}
        >
          出典・ライセンス
        </button>
      </p>

      <Show when={open()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            class="flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#101828] text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h2 class="text-sm font-bold text-ink">出典・ライセンス</h2>
              <button
                class="text-muted hover:text-ink"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div class="overflow-y-auto px-5 py-3">
              <Show when={!feeds.loading} fallback={<p class="py-4 text-muted">読み込み中…</p>}>
                <ul class="space-y-2">
                  <For each={feeds() ?? []}>
                    {(f) => (
                      <li class="text-xs leading-relaxed">
                        <span class="font-semibold text-ink">{f.name}</span>
                        <Show when={f.license}>
                          <span class="text-muted"> — {f.license}</span>
                        </Show>
                        <Show when={f.attribution}>
                          <div class="text-muted/70">{f.attribution}</div>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </footer>
  )
}
