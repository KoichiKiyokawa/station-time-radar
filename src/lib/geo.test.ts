import { describe, expect, it } from "vite-plus/test";
import { bearingDeg, pickRings, polar, radiusFor } from "./geo";

describe("bearingDeg", () => {
  const origin = { name: "起点", lat: 0, lon: 0 };

  it("真東を90度とする", () => {
    expect(bearingDeg(origin, { name: "東", lat: 0, lon: 1 })).toBeCloseTo(90);
  });

  it("真北を0度とする", () => {
    expect(bearingDeg(origin, { name: "北", lat: 1, lon: 0 })).toBeCloseTo(0);
  });

  it("真南を180度とする", () => {
    expect(bearingDeg(origin, { name: "南", lat: -1, lon: 0 })).toBeCloseTo(180);
  });

  it("真西を270度とする", () => {
    expect(bearingDeg(origin, { name: "西", lat: 0, lon: -1 })).toBeCloseTo(270);
  });
});

describe("pickRings", () => {
  it("4本のリングを5分刻みの倍数で返す", () => {
    expect(pickRings(22)).toEqual([10, 20, 30, 40]);
  });

  it("最小刻みは5分", () => {
    expect(pickRings(3)).toEqual([5, 10, 15, 20]);
  });
});

describe("radiusFor", () => {
  it("sqrtスケールで半径を計算する", () => {
    expect(radiusFor(10, 40, 100)).toBeCloseTo(50);
    expect(radiusFor(40, 40, 100)).toBeCloseTo(100);
  });

  it("maxRingを超える分数はR以内にクランプする", () => {
    expect(radiusFor(999, 40, 100)).toBeCloseTo(100);
  });
});

describe("polar", () => {
  it("北(bearing=0)は中心の真上に配置する", () => {
    const { x, y } = polar(0, 0, 0, 10);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
  });

  it("東(bearing=90)は中心の右に配置する", () => {
    const { x, y } = polar(0, 0, 90, 10);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(0);
  });
});
