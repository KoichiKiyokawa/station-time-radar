import { createSignal, onMount, Show } from "solid-js";
import AttributionFooter from "./components/AttributionFooter";
import DestinationEditor from "./components/DestinationEditor";
import Radar from "./components/Radar";
import ResultList from "./components/ResultList";
import StationSearch from "./components/StationSearch";
import { departure, origin, runSearch, setDepartureTime, updateOrigin } from "./store";

export default function App() {
  const [customTime, setCustomTime] = createSignal("09:00");

  onMount(() => {
    if (origin()) runSearch();
  });

  return (
    <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 sm:px-6">
      <header class="flex items-center gap-3 py-6">
        <svg class="size-7 text-accent" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-opacity="0.3" />
          <circle cx="16" cy="16" r="7.5" stroke="currentColor" stroke-opacity="0.5" />
          <circle cx="16" cy="16" r="2.5" fill="currentColor" />
          <circle cx="24" cy="9" r="2.2" fill="#F43F5E" />
        </svg>
        <div>
          <h1 class="text-sm font-extrabold tracking-[0.25em] text-ink">STATION TIME RADAR</h1>
          <p class="text-[11px] text-muted">起点駅から主要駅への所要時間を一望</p>
        </div>
      </header>

      <section class="mx-auto w-full max-w-xl pb-8 pt-2">
        <StationSearch
          placeholder="起点の駅名を入力（例: 新宿）"
          initialValue={origin()?.name}
          onSelect={updateOrigin}
        />
        <div class="mt-3 flex items-center justify-center gap-2 text-xs">
          <span class="text-muted/70">出発</span>
          <div class="flex overflow-hidden rounded-lg border border-white/10">
            <button
              class={`px-3 py-1.5 transition-colors ${
                departure() === "now"
                  ? "bg-accent/20 font-semibold text-accent"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setDepartureTime("now")}
            >
              今すぐ
            </button>
            <label
              class={`flex cursor-pointer items-center gap-1 border-l border-white/10 px-3 py-1.5 transition-colors ${
                departure() !== "now"
                  ? "bg-accent/20 font-semibold text-accent"
                  : "text-muted hover:text-ink"
              }`}
            >
              <input
                type="time"
                value={customTime()}
                class="bg-transparent text-base outline-none [color-scheme:dark] sm:text-xs"
                onChange={(e) => {
                  if (e.currentTarget.value) {
                    setCustomTime(e.currentTarget.value);
                    setDepartureTime(e.currentTarget.value);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <Show
        when={origin()}
        fallback={
          <main class="flex flex-1 flex-col items-center justify-center gap-4 pb-20 text-center">
            <svg class="size-40 text-muted/30" viewBox="0 0 160 160" fill="none">
              <circle cx="80" cy="80" r="72" stroke="currentColor" stroke-opacity="0.4" />
              <circle cx="80" cy="80" r="48" stroke="currentColor" stroke-opacity="0.6" />
              <circle cx="80" cy="80" r="24" stroke="currentColor" stroke-opacity="0.8" />
              <circle cx="80" cy="80" r="4" fill="currentColor" />
            </svg>
            <p class="text-sm text-muted">
              起点の駅を入力すると、主要駅への所要時間がここに表示されます
            </p>
          </main>
        }
      >
        <main class="grid flex-1 items-start gap-8 pb-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div class="rounded-3xl border border-white/5 bg-white/2 p-1 sm:p-4">
            <Radar />
          </div>
          <div>
            <ResultList />
            <DestinationEditor />
          </div>
        </main>
      </Show>

      <AttributionFooter />
    </div>
  );
}
