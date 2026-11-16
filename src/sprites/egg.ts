import { defineSprite, type Roles } from '../gfx/sprite'
import { PAL } from '../gfx/palette'

// 배움알 (12×14). 금 0~3단계는 행 치환으로 만든다.
const BASE = [
  '....OOOO....',
  '...OWWWWO...',
  '..OWWWWWWO..',
  '.OWWWDWWWWO.',
  '.OWWWWWWWWO.',
  'OWWWWWWWDWWO',
  'OWDWWWWWWWWO',
  'OWWWWWWWWWWO',
  'OWWWWWDWWWSO',
  'OWWWWWWWWSSO',
  '.OWWWWWWWSO.',
  '.OSWWWWWSSO.',
  '..OOSSSSOO..',
  '....OOOO....',
]

function withCracks(n: number): string[] {
  const rows = BASE.slice()
  const put = (y: number, x: number) => {
    rows[y] = rows[y].slice(0, x) + 'K' + rows[y].slice(x + 1)
  }
  // 위에서 아래로 이어지는 지그재그 금
  if (n >= 1) { put(3, 6); put(4, 5); put(5, 6) }
  if (n >= 2) { put(6, 5); put(7, 6); put(6, 7); put(5, 8) }
  if (n >= 3) { put(8, 5); put(9, 4); put(7, 3); put(8, 9); put(9, 8) }
  return rows
}

export const EGG_FRAMES = [0, 1, 2, 3].map((n) => defineSprite(withCracks(n)))

/** 단원 계열 색으로 무늬(D)만 바꾼다 */
export function eggRoles(spot: string): Roles {
  return { O: PAL.navy, W: PAL.cloud, S: PAL.cloudShade, D: spot, K: PAL.ink }
}

export const UNIT_COLOR: Record<string, string> = {
  'math-3-2-2-div': PAL.crystal,
  'kor-3-2-3-write': PAL.grass,
  'eng-L9-L10': PAL.sea,
}
