const BASE = "https://api.transit.ls8h.com";

export interface Station {
  name: string;
  lat: number;
  lon: number;
}

export interface SuggestedStation extends Station {
  kana?: string;
  lines: string[];
}

export interface RouteLine {
  name: string;
  color: string;
}

export interface RouteResult {
  minutes: number;
  transfers: number;
  fareIc?: number;
  lines: RouteLine[];
  departureSecs: number;
  arrivalSecs: number;
}

interface RawSuggestStation {
  id: string;
  name: string;
  nameKana?: string;
  feedId: string;
  feedName?: string;
  weight?: number;
  lat: number;
  lon: number;
  kind: "station" | "stop";
}

interface RawLeg {
  kind: "walk" | "transit";
  routeName?: string;
  mode?: string;
  color?: string;
  headsign?: string;
  departureSecs: number;
  arrivalSecs: number;
}

interface RawJourney {
  departureSecs: number;
  arrivalSecs: number;
  durationSecs: number;
  transferCount: number;
  fare?: { currency: string; ticket?: number; ic?: number };
  legs: RawLeg[];
}

export interface FeedInfo {
  feedId: string;
  name: string;
  license?: string;
  attribution?: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  TokyoMetro: "東京メトロ",
  Toei: "都営",
  "JR-East": "JR東日本",
};

function cleanFeedName(feedName: string | undefined, feedId: string): string {
  if (!feedName) return feedId;
  const m = feedName.match(/^odpt\.Operator:(.+)$/);
  if (m) return OPERATOR_LABELS[m[1]] ?? m[1];
  return feedName;
}

/** 2点間の概算距離(km)。駅の同一判定用なので等距円筒近似で十分 */
function approxDistanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (aLat - bLat) * 111;
  const dLon = (aLon - bLon) * 111 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

const SAME_STATION_KM = 2;

/** 一部feedは「渋谷 Shibuya」のようにローマ字を後置してくるので取り除く */
function normalizeStationName(name: string): string {
  const stripped = name.replace(/[\s　]+[A-Za-z][A-Za-z0-9 .'-]*$/, "").trim();
  return stripped === "" ? name : stripped;
}

/**
 * 同一駅が路線(feed)ごとに重複して返るため、同名かつ2km以内を同一駅にまとめる。
 * （同名の遠隔駅、例: 東京の府中と広島の府中は別候補のまま残る）
 * バス停(kind: "stop")は候補に含めない。
 */
export async function suggestStations(
  query: string,
  signal?: AbortSignal,
): Promise<SuggestedStation[]> {
  const res = await fetch(`${BASE}/api/v1/locations/suggest?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`suggest failed: ${res.status}`);
  const data = (await res.json()) as { stations?: RawSuggestStation[] };

  interface Group {
    station: SuggestedStation;
    weight: number;
    bestWeight: number;
    lines: Set<string>;
  }
  const groupsByName = new Map<string, Group[]>();

  for (const s of data.stations ?? []) {
    if (s.kind !== "station") continue;
    const w = s.weight ?? 0;
    const name = normalizeStationName(s.name);
    const line = cleanFeedName(s.feedName, s.feedId);
    const clusters = groupsByName.get(name) ?? [];
    const g = clusters.find(
      (c) => approxDistanceKm(c.station.lat, c.station.lon, s.lat, s.lon) <= SAME_STATION_KM,
    );
    if (!g) {
      clusters.push({
        station: {
          name,
          kana: s.nameKana,
          lat: s.lat,
          lon: s.lon,
          lines: [],
        },
        weight: w,
        bestWeight: w,
        lines: new Set([line]),
      });
      groupsByName.set(name, clusters);
    } else {
      g.weight += w;
      g.lines.add(line);
      g.station.kana ??= s.nameKana;
      if (w > g.bestWeight) {
        g.bestWeight = w;
        g.station.lat = s.lat;
        g.station.lon = s.lon;
      }
    }
  }

  return [...groupsByName.values()]
    .flat()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((g) => ({ ...g.station, lines: [...g.lines].slice(0, 4) }));
}

const FALLBACK_COLOR = "#94A3B8";

function normalizeColor(c?: string): string {
  if (!c) return FALLBACK_COLOR;
  return c.startsWith("#") ? c : `#${c}`;
}

/**
 * 経路検索。from/to は geo: 座標で渡す（駅IDは路線feedごとに別IDのため）。
 * journeys は出発時刻違いの候補列なので、電車を含むもののうち最短を採用する。
 */
export async function planRoute(
  from: Station,
  to: Station,
  time?: string,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const params = new URLSearchParams({
    from: `geo:${from.lat},${from.lon}`,
    to: `geo:${to.lat},${to.lon}`,
  });
  if (time) params.set("time", time);
  const res = await fetch(`${BASE}/api/v1/plan?${params}`, { signal });
  if (!res.ok) throw new Error(`plan failed: ${res.status}`);
  const data = (await res.json()) as { journeys?: RawJourney[] };

  const candidates = (data.journeys ?? []).filter((j) => j.legs.some((l) => l.kind === "transit"));
  if (candidates.length === 0) throw new Error("経路が見つかりませんでした");

  const best = candidates.reduce((a, b) => (b.durationSecs < a.durationSecs ? b : a));

  const lines: RouteLine[] = [];
  for (const leg of best.legs) {
    if (leg.kind !== "transit") continue;
    const name = leg.routeName ?? "不明";
    if (lines.at(-1)?.name !== name) {
      lines.push({ name, color: normalizeColor(leg.color) });
    }
  }

  return {
    minutes: Math.max(1, Math.round(best.durationSecs / 60)),
    transfers: best.transferCount,
    fareIc: best.fare?.ic,
    lines,
    departureSecs: best.departureSecs,
    arrivalSecs: best.arrivalSecs,
  };
}

export async function fetchFeeds(signal?: AbortSignal): Promise<FeedInfo[]> {
  const res = await fetch(`${BASE}/api/v1/feeds`, { signal });
  if (!res.ok) throw new Error(`feeds failed: ${res.status}`);
  const data = (await res.json()) as { feeds?: FeedInfo[] };
  return data.feeds ?? [];
}

/** 非公式APIへの配慮として同時リクエスト数を制限する */
export function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < max) run();
      else queue.push(run);
    });
  };
}
