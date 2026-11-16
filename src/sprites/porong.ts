import { defineSprite, variant, type Roles } from '../gfx/sprite'
import { PAL } from '../gfx/palette'

// 포롱: 손바닥만 한 구름 솜뭉치 안내 동료 (16×16)
// O 외곽선, W 몸, S 그늘, K 눈, P 볼, M 입
export const PORONG = defineSprite([
  '................',
  '.....OOOOO......',
  '...OOWWWWWOO....',
  '..OWWWWWWWWWOO..',
  '.OWWWWWWWWWWWWO.',
  '.OWWWWWWWWWWWWWO',
  'OWWWKWWWWKWWWWWO',
  'OWWWKWWWWKWWWWWO',
  'OWWPWWWWWWPWWWSO',
  'OWWWWWMMWWWWWSSO',
  '.OWWWWWWWWWWWSO.',
  '.OSWWWWWWWWWSSO.',
  '..OSSWWWWWSSSO..',
  '...OOSSSSSSOO...',
  '.....OOOOOO.....',
  '................',
])

export const PORONG_BLINK = variant(PORONG, {
  6: 'OWWWWWWWWWWWWWWO',
  7: 'OWWWKWWWWKWWWWWO',
})

export const PORONG_ROLES: Roles = {
  O: PAL.navy,
  W: PAL.cloud,
  S: PAL.cloudShade,
  K: PAL.ink,
  P: PAL.peach,
  M: PAL.ink,
}

// 팔레트 스왑 예시: 노을빛 포롱 (빛무늬 변종 시험용)
export const PORONG_SUNSET: Roles = { ...PORONG_ROLES, W: '#ffe2c4', S: '#f2b38f', O: '#7a3b52' }
