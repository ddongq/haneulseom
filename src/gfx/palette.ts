// 하늘섬 기본 팔레트 (16색, 자체 설계). 역할 이름으로 부르고, 팔레트 스왑은 역할→색 표를 바꿔 끼운다.
export const PAL = {
  night: '#1b2140',
  navy: '#2b3466',
  dusk: '#4a4f8c',
  sky: '#6e8fd8',
  skyLight: '#a9c6f2',
  cloud: '#f4f6ff',
  cloudShade: '#c5cde8',
  grass: '#5fbf6a',
  grassDark: '#3a8a55',
  soil: '#9a6b4f',
  soilDark: '#6a4535',
  sun: '#ffd36b',
  peach: '#ffb3a7',
  crystal: '#b48cf0',
  sea: '#4fb3c9',
  ink: '#1a1a2e',
} as const

export type PalKey = keyof typeof PAL
