// 문자열 픽셀맵 스프라이트.
// 각 문자는 "역할 키"이고 '.'은 투명. 역할→색 표(roles)를 바꾸면 같은 그림의 색 변종이 나온다.

export type Roles = Record<string, string>

export interface SpriteDef {
  w: number
  h: number
  rows: string[]
}

export function defineSprite(rows: string[]): SpriteDef {
  const h = rows.length
  const w = rows[0]?.length ?? 0
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`sprite row ${i} has width ${r.length}, expected ${w}`)
  })
  return { w, h, rows }
}

/** 역할 표로 색을 입혀 오프스크린 캔버스로 굽는다. 결과는 캐시해서 매 프레임 drawImage만 한다. */
export function bake(def: SpriteDef, roles: Roles): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = def.w
  c.height = def.h
  const ctx = c.getContext('2d')!
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const color = roles[ch]
      if (!color) throw new Error(`no color for role '${ch}'`)
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return c
}

/** 행 단위 문자 치환으로 프레임 변형(예: 눈 깜빡임). */
export function variant(def: SpriteDef, edits: Record<number, string>): SpriteDef {
  const rows = def.rows.map((r, i) => edits[i] ?? r)
  return defineSprite(rows)
}
