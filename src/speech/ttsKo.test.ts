import { describe, expect, it } from 'vitest'
import { sino, ttsKo } from './ttsKo'
import { fitScale } from '../gfx/screen'
import { PORONG, PORONG_BLINK } from '../sprites/porong'
import { parseBackup } from '../store/db'

describe('sino', () => {
  it.each([
    [0, '영'], [1, '일'], [10, '십'], [11, '십일'], [96, '구십육'], [100, '백'],
    [157, '백오십칠'], [1300, '천삼백'], [10000, '만'], [12345, '만이천삼백사십오'],
  ])('%i → %s', (n, s) => expect(sino(n)).toBe(s))
})

describe('ttsKo', () => {
  it.each([
    ['96 ÷ 8 = □', '구십육 나누기 팔은 네모'],
    ['84 ÷ 4 = 21', '팔십사 나누기 사는 이십일'],
    ['3/4', '사분의 삼'],
    ['2와 1/3', '이와 삼분의 일'],
    ['1L 300mL', '일 리터 삼백 밀리리터'],
    ['4kg 250g', '사 킬로그램 이백오십 그램'],
    ['0.5', '영 점 오'],
  ])('%s', (src, want) => expect(ttsKo(src)).toBe(want))
})

describe('fitScale (iPad Pro 12.9)', () => {
  it('가로 1366×1024 → ×5', () => expect(fitScale(1366, 1024)).toBe(5))
  it('세로 1024×1366 → ×4', () => expect(fitScale(1024, 1366)).toBe(4))
  it('아주 작은 화면도 최소 ×1', () => expect(fitScale(100, 100)).toBe(1))
})

describe('sprites', () => {
  it('포롱은 16×16, 깜빡임 프레임도 같은 크기', () => {
    expect([PORONG.w, PORONG.h]).toEqual([16, 16])
    expect([PORONG_BLINK.w, PORONG_BLINK.h]).toEqual([16, 16])
  })
})

describe('backup', () => {
  it('다른 앱 파일은 거절', () => expect(() => parseBackup('{"app":"x"}')).toThrow())
  it('더 새 스키마는 거절', () =>
    expect(() => parseBackup('{"app":"haneulseom","schema":99,"exportedAt":"","data":{}}')).toThrow())
  it('정상 백업 통과', () =>
    expect(parseBackup('{"app":"haneulseom","schema":1,"exportedAt":"","data":{"a":1}}').data).toEqual({ a: 1 }))
})
