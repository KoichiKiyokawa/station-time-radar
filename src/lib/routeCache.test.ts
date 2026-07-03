import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { RouteResult } from "../api/transit";
import { cacheKey, getCached, setCached } from "./routeCache";

const sampleRoute: RouteResult = {
  minutes: 12,
  transfers: 0,
  lines: [{ name: "山手線", color: "#9acd32" }],
  departureSecs: 100,
  arrivalSecs: 800,
};

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-04T09:00:00+09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("routeCache", () => {
  it("未キャッシュのキーはnullを返す", () => {
    expect(getCached("nope")).toBeNull();
  });

  it("固定時刻の結果は同日中ヒットする", () => {
    const key = cacheKey("新宿", "渋谷", "09:00");
    setCached(key, sampleRoute, false);
    expect(getCached(key)).toEqual(sampleRoute);
  });

  it("固定時刻の結果は日付が変わると失効する", () => {
    const key = cacheKey("新宿", "渋谷", "09:00");
    setCached(key, sampleRoute, false);
    vi.setSystemTime(new Date("2026-07-05T00:30:00+09:00"));
    expect(getCached(key)).toBeNull();
  });

  it("「今すぐ」の結果はTTL(3分)経過後に失効する", () => {
    const key = cacheKey("新宿", "渋谷", undefined);
    setCached(key, sampleRoute, true);
    vi.advanceTimersByTime(3 * 60 * 1000 + 1);
    expect(getCached(key)).toBeNull();
  });

  it("「今すぐ」の結果はTTL内なら有効", () => {
    const key = cacheKey("新宿", "渋谷", undefined);
    setCached(key, sampleRoute, true);
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(getCached(key)).toEqual(sampleRoute);
  });

  it("上限件数を超えると古い順に間引かれる", () => {
    for (let i = 0; i < 151; i++) {
      setCached(`k${i}`, sampleRoute, false);
      vi.advanceTimersByTime(1);
    }
    expect(getCached("k0")).toBeNull();
    expect(getCached("k150")).toEqual(sampleRoute);
  });
});
