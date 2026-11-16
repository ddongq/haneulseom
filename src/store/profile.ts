// 아이 프로필(기기 안에만 저장). 별가루, 알, 문항 기록, 독서 체크.
import { kv } from './db'

export interface ItemStat { seen: number; firstRight: number; last: string }
export interface Egg { cracks: number; hatched: boolean }

export interface Profile {
  v: 1
  stardust: number
  today: { date: string; stardust: number; sessionDone: boolean; reading: boolean }
  sessions: number
  days: string[] // 모험한 날짜들 (주간 등불 계산용)
  eggs: Record<string, Egg>
  items: Record<string, ItemStat>
}

export const DAILY_CAP = 50
export const CRACKS_TO_HATCH = 3

export function todayStr(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function fresh(): Profile {
  return {
    v: 1,
    stardust: 0,
    today: { date: todayStr(), stardust: 0, sessionDone: false, reading: false },
    sessions: 0,
    days: [],
    eggs: {},
    items: {},
  }
}

/** 날짜가 바뀌었으면 오늘 칸을 새로 */
export function rollDay(p: Profile, date = todayStr()): Profile {
  if (p.today.date === date) return p
  return { ...p, today: { date, stardust: 0, sessionDone: false, reading: false } }
}

export async function loadProfile(): Promise<Profile> {
  const p = (await kv.get<Profile>('profile')) ?? fresh()
  return rollDay(p)
}

export function saveProfile(p: Profile) {
  return kv.set('profile', p)
}

/** 하루 상한을 지키며 별가루를 준다. 실제로 준 양을 돌려준다. */
export function grantStardust(p: Profile, amount: number): number {
  const room = Math.max(0, DAILY_CAP - p.today.stardust)
  const got = Math.min(room, amount)
  p.stardust += got
  p.today.stardust += got
  return got
}

export function recordItem(p: Profile, id: string, firstRight: boolean) {
  const s = p.items[id] ?? { seen: 0, firstRight: 0, last: '' }
  s.seen++
  if (firstRight) s.firstRight++
  s.last = p.today.date
  p.items[id] = s
}

/** 이번 주(월~일) 모험한 날 수 */
export function weekCount(p: Profile, now = new Date()): number {
  const d = new Date(now)
  const dow = (d.getDay() + 6) % 7 // 월=0
  d.setDate(d.getDate() - dow)
  const monday = todayStr(d)
  return p.days.filter((x) => x >= monday).length
}
