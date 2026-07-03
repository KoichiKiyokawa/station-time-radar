import { createSignal } from "solid-js";
import { createLimiter, planRoute, type RouteResult, type Station } from "./api/transit";
import { DEFAULT_DESTINATIONS } from "./data/presets";
import { cacheKey, getCached, setCached } from "./lib/routeCache";

export type ResultState =
  | { status: "loading" }
  | { status: "done"; route: RouteResult }
  | { status: "error"; message: string };

// 駅名で同一視する（同名駅は路線/データソースにより座標が僅かにずれるため）
export const destKey = (s: Station) => s.name;

const LS_ORIGIN = "str:origin";
const LS_DESTS = "str:destinations";

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode 等では黙って諦める */
  }
}

const [origin, setOrigin] = createSignal<Station | null>(loadJson<Station>(LS_ORIGIN));
const [destinations, setDestinations] = createSignal<Station[]>(
  loadJson<Station[]>(LS_DESTS) ?? DEFAULT_DESTINATIONS,
);
const [departure, setDeparture] = createSignal<"now" | string>("09:00");
const [results, setResults] = createSignal<Record<string, ResultState>>({});
const [hoverKey, setHoverKey] = createSignal<string | null>(null);

export { origin, destinations, departure, results, hoverKey, setHoverKey };

const limit = createLimiter(3);
let controller: AbortController | null = null;

function timeParam(): string | undefined {
  const t = departure();
  return t === "now" ? undefined : t;
}

function fetchOne(o: Station, d: Station, ctrl: AbortController, bypassCache = false) {
  const key = destKey(d);
  const time = timeParam();
  const isNow = departure() === "now";
  const rKey = cacheKey(o.name, d.name, time);

  if (!bypassCache) {
    const cached = getCached(rKey);
    if (cached) {
      setResults((prev) => ({ ...prev, [key]: { status: "done", route: cached } }));
      return;
    }
  }

  setResults((prev) => ({ ...prev, [key]: { status: "loading" } }));
  limit(() => planRoute(o, d, time, ctrl.signal))
    .then((route) => {
      if (ctrl.signal.aborted) return;
      setCached(rKey, route, isNow);
      setResults((prev) => ({ ...prev, [key]: { status: "done", route } }));
    })
    .catch((err: unknown) => {
      if (ctrl.signal.aborted) return;
      const message = err instanceof Error ? err.message : "検索に失敗しました";
      setResults((prev) => ({ ...prev, [key]: { status: "error", message } }));
    });
}

export function runSearch() {
  const o = origin();
  if (!o) return;
  controller?.abort();
  controller = new AbortController();
  const ctrl = controller;
  setResults({});
  for (const d of destinations()) {
    if (destKey(d) !== destKey(o)) fetchOne(o, d, ctrl);
  }
}

export function retryDestination(d: Station) {
  const o = origin();
  if (!o) return;
  controller ??= new AbortController();
  fetchOne(o, d, controller, true);
}

export function updateOrigin(s: Station) {
  setOrigin({ name: s.name, lat: s.lat, lon: s.lon });
  saveJson(LS_ORIGIN, origin());
  runSearch();
}

export function setDepartureTime(t: "now" | string) {
  if (departure() === t) return;
  setDeparture(t);
  runSearch();
}

export function addDestination(s: Station) {
  const station = { name: s.name, lat: s.lat, lon: s.lon };
  const key = destKey(station);
  if (destinations().some((d) => destKey(d) === key)) return;
  setDestinations([...destinations(), station]);
  saveJson(LS_DESTS, destinations());
  const o = origin();
  if (o) {
    controller ??= new AbortController();
    fetchOne(o, station, controller);
  }
}

export function removeDestination(key: string) {
  setDestinations(destinations().filter((d) => destKey(d) !== key));
  saveJson(LS_DESTS, destinations());
  setResults((prev) => {
    const { [key]: _, ...rest } = prev;
    return rest;
  });
}

export function resetDestinations() {
  setDestinations(DEFAULT_DESTINATIONS);
  saveJson(LS_DESTS, destinations());
  runSearch();
}
