import type { Station } from '../api/transit'

/** 首都圏の主要駅（座標は locations/suggest の実測値ベース） */
export const PRESET_STATIONS: Station[] = [
  { name: '東京', lat: 35.681236, lon: 139.767125 },
  { name: '新宿', lat: 35.690921, lon: 139.700258 },
  { name: '渋谷', lat: 35.658034, lon: 139.701636 },
  { name: '池袋', lat: 35.728926, lon: 139.71038 },
  { name: '品川', lat: 35.630152, lon: 139.74044 },
  { name: '上野', lat: 35.713768, lon: 139.777254 },
  { name: '横浜', lat: 35.466188, lon: 139.622715 },
  { name: '大宮', lat: 35.906295, lon: 139.623999 },
  { name: '秋葉原', lat: 35.698683, lon: 139.774219 },
  { name: '吉祥寺', lat: 35.703119, lon: 139.579742 },
  { name: '立川', lat: 35.698158, lon: 139.413469 },
  { name: '川崎', lat: 35.531966, lon: 139.696932 },
]

export const DEFAULT_DESTINATIONS: Station[] = PRESET_STATIONS.slice(0, 8)
