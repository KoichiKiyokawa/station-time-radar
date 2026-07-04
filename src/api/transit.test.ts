import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createLimiter, fetchFeeds, planRoute, suggestStations } from "./transit";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("suggestStations", () => {
  it("同名かつ近接する駅を1件にまとめ、末尾のローマ字を除去し、バス停は除外する", async () => {
    mockFetchOnce({
      stations: [
        {
          id: "a",
          name: "渋谷",
          nameKana: "しぶや",
          feedId: "scrape-jreast-yamanote",
          feedName: "山手線",
          weight: 9,
          lat: 35.658034,
          lon: 139.701636,
          kind: "station",
        },
        {
          id: "b",
          name: "渋谷",
          nameKana: "しぶや",
          feedId: "odpt-tokyo-metro",
          feedName: "odpt.Operator:TokyoMetro",
          weight: 3,
          lat: 35.658517,
          lon: 139.701334,
          kind: "station",
        },
        {
          id: "c",
          name: "渋谷 Shibuya",
          feedId: "tokyo-tokyu-rail",
          feedName: "東急",
          weight: 16,
          lat: 35.658034,
          lon: 139.701636,
          kind: "station",
        },
        {
          id: "d",
          name: "渋谷駅前",
          feedId: "mdb-3175-part-04",
          feedName: "バス",
          weight: 12,
          lat: 35.659,
          lon: 139.7,
          kind: "stop",
        },
      ],
    });

    const result = await suggestStations("渋谷");

    expect(result).toHaveLength(1);
    const station = result[0];
    expect(station?.name).toBe("渋谷");
    expect(station?.lines).toEqual(expect.arrayContaining(["山手線", "東京メトロ", "東急"]));
    // 最もweightの大きい候補(id:c)の座標を代表値として採用する
    expect(station?.lat).toBeCloseTo(35.658034);
  });

  it("同名でも2km以上離れていれば別駅として扱う", async () => {
    mockFetchOnce({
      stations: [
        {
          id: "a",
          name: "府中",
          feedId: "x",
          weight: 5,
          lat: 35.669,
          lon: 139.478,
          kind: "station",
        },
        {
          id: "b",
          name: "府中",
          feedId: "y",
          weight: 5,
          lat: 34.566,
          lon: 133.234,
          kind: "station",
        },
      ],
    });

    const result = await suggestStations("府中");
    expect(result).toHaveLength(2);
  });
});

describe("planRoute", () => {
  const from = { name: "新宿", lat: 35.690921, lon: 139.700258 };
  const to = { name: "渋谷", lat: 35.658034, lon: 139.701636 };

  it("徒歩のみの候補を除外し、電車を含む最短経路を選ぶ", async () => {
    mockFetchOnce({
      journeys: [
        {
          departureSecs: 100,
          arrivalSecs: 900,
          durationSecs: 800,
          transferCount: 0,
          legs: [{ kind: "walk", departureSecs: 100, arrivalSecs: 900 }],
        },
        {
          departureSecs: 200,
          arrivalSecs: 620,
          durationSecs: 420,
          transferCount: 0,
          legs: [
            {
              kind: "transit",
              routeName: "山手線（内回り）",
              color: "9acd32",
              departureSecs: 200,
              arrivalSecs: 620,
            },
          ],
        },
        {
          departureSecs: 220,
          arrivalSecs: 1000,
          durationSecs: 780,
          transferCount: 1,
          fare: { currency: "JPY", ic: 170 },
          legs: [
            {
              kind: "transit",
              routeName: "丸ノ内線",
              color: "F62E36",
              departureSecs: 220,
              arrivalSecs: 500,
            },
            { kind: "walk", departureSecs: 500, arrivalSecs: 560 },
            {
              kind: "transit",
              routeName: "山手線（内回り）",
              color: "9acd32",
              departureSecs: 560,
              arrivalSecs: 1000,
            },
          ],
        },
      ],
    });

    const route = await planRoute(from, to);

    expect(route.minutes).toBe(7);
    expect(route.transfers).toBe(0);
    expect(route.lines).toEqual([{ name: "山手線（内回り）", color: "#9acd32" }]);
  });

  it("乗換ありの経路では路線カラーに#を補い、乗り換え路線を順に並べる", async () => {
    mockFetchOnce({
      journeys: [
        {
          departureSecs: 220,
          arrivalSecs: 1000,
          durationSecs: 780,
          transferCount: 1,
          fare: { currency: "JPY", ic: 170 },
          legs: [
            {
              kind: "transit",
              routeName: "丸ノ内線",
              color: "F62E36",
              departureSecs: 220,
              arrivalSecs: 500,
            },
            { kind: "walk", departureSecs: 500, arrivalSecs: 560 },
            {
              kind: "transit",
              routeName: "山手線（内回り）",
              color: "9acd32",
              departureSecs: 560,
              arrivalSecs: 1000,
            },
          ],
        },
      ],
    });

    const route = await planRoute(from, to);

    expect(route.fareIc).toBe(170);
    expect(route.lines).toEqual([
      { name: "丸ノ内線", color: "#F62E36" },
      { name: "山手線（内回り）", color: "#9acd32" },
    ]);
  });

  it("電車を含む経路が1つもない場合はエラーになる", async () => {
    mockFetchOnce({
      journeys: [
        {
          departureSecs: 100,
          arrivalSecs: 900,
          durationSecs: 800,
          transferCount: 0,
          legs: [{ kind: "walk", departureSecs: 100, arrivalSecs: 900 }],
        },
      ],
    });

    await expect(planRoute(from, to)).rejects.toThrow();
  });

  it("fromはgeo:座標で渡し、timeは指定時のみ付与する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ journeys: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(planRoute(from, to)).rejects.toThrow();
    let url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("from")).toBe("geo:35.690921,139.700258");
    expect(url.searchParams.has("time")).toBe(false);

    await expect(planRoute(from, to, "09:00")).rejects.toThrow();
    url = new URL(fetchMock.mock.calls[1][0] as string);
    expect(url.searchParams.get("time")).toBe("09:00");
  });
});

describe("fetchFeeds", () => {
  it("feedsをそのまま返す", async () => {
    mockFetchOnce({
      feeds: [{ feedId: "a", name: "阿武隈急行", license: "公式PDF由来" }],
    });
    const feeds = await fetchFeeds();
    expect(feeds).toEqual([{ feedId: "a", name: "阿武隈急行", license: "公式PDF由来" }]);
  });
});

describe("createLimiter", () => {
  it("同時実行数をmaxまでに制限する", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let maxActive = 0;
    const task = () =>
      new Promise<void>((resolve) => {
        active++;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => {
          active--;
          resolve();
        }, 10);
      });

    await Promise.all([1, 2, 3, 4, 5].map(() => limit(task)));
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("拒否されたタスクがあってもキューは止まらない", async () => {
    const limit = createLimiter(1);
    const order: string[] = [];
    const p1 = limit(() => Promise.reject(new Error("boom"))).catch(() => order.push("err"));
    const p2 = limit(() => Promise.resolve()).then(() => order.push("ok"));
    await Promise.all([p1, p2]);
    expect(order).toEqual(["err", "ok"]);
  });
});
