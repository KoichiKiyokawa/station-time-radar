import type { RouteResult } from "../api/transit";

const STORAGE_KEY = "str:route-cache";
const MAX_ENTRIES = 150;
/** 「今すぐ」検索は発車時刻がずれていくため短命に */
const NOW_TTL_MS = 3 * 60 * 1000;

interface Entry {
  route: RouteResult;
  cachedAt: number;
  dateStamp: string;
  isNow: boolean;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function load(): Record<string, Entry> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, Entry>;
  } catch {
    return {};
  }
}

function save(store: Record<string, Entry>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 容量超過やプライベートモード等では黙って諦める */
  }
}

export function cacheKey(originName: string, destName: string, time: string | undefined): string {
  return `${originName}>${destName}@${time ?? "now"}`;
}

export function getCached(key: string): RouteResult | null {
  const entry = load()[key];
  if (!entry) return null;
  const fresh = entry.isNow
    ? Date.now() - entry.cachedAt < NOW_TTL_MS
    : entry.dateStamp === todayStamp();
  return fresh ? entry.route : null;
}

/** 固定時刻の結果は日付が変わるまで、今すぐ検索の結果は数分だけ有効 */
export function setCached(key: string, route: RouteResult, isNow: boolean) {
  const store = load();
  store[key] = { route, cachedAt: Date.now(), dateStamp: todayStamp(), isNow };

  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => store[a].cachedAt - store[b].cachedAt)
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete store[k]);
  }
  save(store);
}
