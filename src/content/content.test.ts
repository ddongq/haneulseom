import { describe, expect, it } from 'vitest'
import { makeRng } from './rng'
import { divCheckChoice, divNumpad, josaNum, makeDiv } from './math/div'
import { korItems } from './kor/connect'
import { engItems } from './eng/l9l10'
import { planSession } from '../session/plan'
import { fresh, grantStardust, DAILY_CAP } from '../store/profile'

describe('나눗셈 생성기', () => {
  it.each([1, 2, 3, 4] as const)('레벨 %i: 몫×나누는수+나머지=나뉠수, 나머지<나누는수', (lvl) => {
    const rng = makeRng(lvl * 99)
    for (let i = 0; i < 300; i++) {
      const p = makeDiv(rng, lvl)
      expect(p.q * p.b + p.r).toBe(p.a)
      expect(p.r).toBeLessThan(p.b)
      if (lvl === 1) { expect(p.a % 10).toBe(0); expect(p.r).toBe(0) }
      if (lvl === 2) { expect(p.a).toBeGreaterThanOrEqual(20); expect(p.a).toBeLessThanOrEqual(99); expect(p.r).toBe(0) }
      if (lvl === 3) { expect(p.a).toBeLessThanOrEqual(99); expect(p.r).toBeGreaterThan(0) }
      if (lvl === 4) { expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThanOrEqual(999) }
    }
  })
  it('숫자 패드 문항: 나머지가 있으면 칸 2개', () => {
    const it3 = divNumpad(makeRng(3), 3, 'x')
    expect(it3.fields.map((f) => f.label)).toEqual(['몫', '나머지'])
    const it2 = divNumpad(makeRng(3), 2, 'y')
    expect(it2.fields.map((f) => f.label)).toEqual(['몫'])
  })
  it('확인하기 문항: 보기 3개가 서로 다르고 정답이 하나', () => {
    for (let s = 1; s < 200; s++) {
      const c = divCheckChoice(makeRng(s), 'c')
      expect(new Set(c.choices).size).toBe(3)
      expect(c.answer).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('정적 문항', () => {
  it('국어: 정답 인덱스가 보기 안에 있고 id가 겹치지 않는다', () => {
    const xs = korItems()
    expect(new Set(xs.map((x) => x.id)).size).toBe(xs.length)
    xs.forEach((x) => expect(x.choices[x.answer]).toBeDefined())
  })
  it('영어: 보기 3개가 서로 다르고 정답 포함, 녹음 id 사용', () => {
    const xs = engItems()
    xs.forEach((x) => {
      expect(new Set(x.choices).size).toBe(3)
      expect(x.answer).toBeGreaterThanOrEqual(0)
      expect(x.bodyVoice).toMatch(/^e\./)
    })
  })
  it('문항 글에 그림 문자(이모지)를 쓰지 않는다', () => {
    const all = JSON.stringify([...korItems(), ...engItems(), divNumpad(makeRng(1), 3, 'z')])
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('하루 구성', () => {
  it('퀘스트 3개 + 미니 보스, 14문항', () => {
    const qs = planSession(fresh(), '2026-11-17')
    expect(qs.map((q) => q.key)).toEqual(['q1', 'q2', 'q3', 'boss'])
    expect(qs.reduce((n, q) => n + q.items.length, 0)).toBe(14)
  })
  it('같은 날 같은 기록이면 같은 문제', () => {
    const a = planSession(fresh(), '2026-11-17').flatMap((q) => q.items.map((i) => i.id + (i.body ?? '')))
    const b = planSession(fresh(), '2026-11-17').flatMap((q) => q.items.map((i) => i.id + (i.body ?? '')))
    expect(a).toEqual(b)
  })
})

describe('별가루', () => {
  it('하루 상한을 넘지 않는다', () => {
    const p = fresh()
    let got = 0
    for (let i = 0; i < 20; i++) got += grantStardust(p, 8)
    expect(got).toBe(DAILY_CAP)
    expect(p.stardust).toBe(DAILY_CAP)
  })
})

describe('숫자 조사', () => {
  it.each([
    [3, '3으로'], [4, '4로'], [6, '6으로'], [7, '7로'], [8, '8로'], [1, '1로'], [10, '10으로'],
  ])('%i → %s', (n, want) => expect(josaNum(n, '으로', '로', '로')).toBe(want))
  it.each([[1, '1은'], [2, '2는'], [30, '30은'], [5, '5는']])('%i 은/는', (n, want) => expect(josaNum(n, '은', '는')).toBe(want))
  it('30을 / 20을', () => { expect(josaNum(30, '을', '를')).toBe('30을'); expect(josaNum(2, '을', '를')).toBe('2를') })
})
