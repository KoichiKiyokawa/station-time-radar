import { createSignal, For, Show, onCleanup } from 'solid-js'
import { suggestStations, type SuggestedStation } from '../api/transit'

interface Props {
  placeholder: string
  onSelect: (s: SuggestedStation) => void
  size?: 'hero' | 'compact'
  initialValue?: string
  clearOnSelect?: boolean
}

export default function StationSearch(props: Props) {
  const [value, setValue] = createSignal(props.initialValue ?? '')
  const [items, setItems] = createSignal<SuggestedStation[]>([])
  const [open, setOpen] = createSignal(false)
  const [active, setActive] = createSignal(-1)
  const [loading, setLoading] = createSignal(false)

  let composing = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let ctrl: AbortController | null = null

  onCleanup(() => {
    clearTimeout(timer)
    ctrl?.abort()
  })

  async function search(q: string) {
    ctrl?.abort()
    if (q.trim() === '') {
      setItems([])
      setOpen(false)
      return
    }
    ctrl = new AbortController()
    setLoading(true)
    try {
      const res = await suggestStations(q.trim(), ctrl.signal)
      setItems(res)
      setActive(res.length > 0 ? 0 : -1)
      setOpen(true)
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }

  function schedule(q: string) {
    clearTimeout(timer)
    timer = setTimeout(() => void search(q), 250)
  }

  function select(item: SuggestedStation) {
    props.onSelect(item)
    setValue(props.clearOnSelect ? '' : item.name)
    setOpen(false)
    setItems([])
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.isComposing) return
    if (!open() || items().length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % items().length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + items().length) % items().length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items()[active()]
      if (item) select(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hero = () => (props.size ?? 'hero') === 'hero'

  return (
    <div class="relative">
      <div class="relative">
        <svg
          class={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${hero() ? 'left-5 size-5' : 'left-3 size-4'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={value()}
          placeholder={props.placeholder}
          spellcheck={false}
          autocomplete="off"
          role="combobox"
          aria-expanded={open()}
          class={`w-full rounded-2xl border border-white/10 bg-white/5 text-ink placeholder:text-muted/60 outline-none backdrop-blur transition-colors focus:border-accent/60 focus:bg-white/8 ${
            hero()
              ? 'py-4 pl-13 pr-5 text-lg font-medium tracking-wide'
              : 'py-2.5 pl-9.5 pr-3 text-base sm:text-sm'
          }`}
          onInput={(e) => {
            setValue(e.currentTarget.value)
            if (!composing) schedule(e.currentTarget.value)
          }}
          onCompositionStart={() => (composing = true)}
          onCompositionEnd={(e) => {
            composing = false
            schedule(e.currentTarget.value)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (items().length > 0) setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        <Show when={loading()}>
          <div
            class={`absolute top-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-muted/30 border-t-accent ${hero() ? 'right-5 size-5' : 'right-3 size-4'}`}
          />
        </Show>
      </div>

      <Show when={open() && items().length > 0}>
        <ul
          role="listbox"
          class="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#111827]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <For each={items()}>
            {(item, i) => (
              <li
                role="option"
                aria-selected={active() === i()}
                class={`flex cursor-pointer items-baseline gap-2.5 px-4 py-2.5 transition-colors ${
                  active() === i() ? 'bg-accent/15' : 'hover:bg-white/5'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i())}
                onClick={() => select(item)}
              >
                <span class="font-semibold text-ink">{item.name}</span>
                <Show when={item.kana}>
                  <span class="text-xs text-muted">{item.kana}</span>
                </Show>
                <Show when={!item.isStation}>
                  <span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">
                    バス停
                  </span>
                </Show>
                <span class="ml-auto truncate pl-2 text-right text-[11px] text-muted/80">
                  {item.lines.slice(0, 3).join('・')}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
