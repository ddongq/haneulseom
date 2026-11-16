// 하루 모험 구성: 퀘스트 3개 + 미니 보스. 처음 2주는 13~14문항.
import type { Item } from '../content/types'
import { divCheckChoice, divNumpad } from '../content/math/div'
import { korItems } from '../content/kor/connect'
import { engItems } from '../content/eng/l9l10'
import { makeRng, seedFrom, shuffle, type Rng } from '../content/rng'
import type { Profile } from '../store/profile'

export interface Quest {
  key: 'q1' | 'q2' | 'q3' | 'boss'
  title: string
  subject: string
  voice: string
  items: Item[]
}

/** 안 본 것 → 적게 본 것 → 처음에 틀린 적 있는 것 순으로 고른다 */
function choose(rng: Rng, pool: Item[], n: number, p: Profile): Item[] {
  const score = (it: Item) => {
    const s = p.items[it.id]
    if (!s) return 0
    const missRate = 1 - s.firstRight / s.seen
    return s.seen * 2 - missRate * 3
  }
  return shuffle(rng, pool)
    .sort((a, b) => score(a) - score(b))
    .slice(0, n)
}

export function planSession(p: Profile, date: string): Quest[] {
  const rng = makeRng(seedFrom(`${date}#${p.sessions}`))
  const m = (lvl: 1 | 2 | 3 | 4, k: number) => divNumpad(rng, lvl, `math.div.${date}.${k}`)

  const math: Item[] = [m(2, 0), m(2, 1), m(3, 2), divCheckChoice(rng, `math.divcheck.${date}`), m(4, 3)]
  const kor = choose(rng, korItems(), 4, p)
  const eng = choose(rng, engItems(), 3, p)
  const boss: Item[] = [m(3, 9), ...choose(rng, korItems().filter((x) => !kor.includes(x)), 1, p)]

  return [
    { key: 'q1', title: '퀘스트 1', subject: '수학 · 나눗셈', voice: 'p.quest1', items: math },
    { key: 'q2', title: '퀘스트 2', subject: '국어 · 정확하게 글을 써요', voice: 'p.quest2', items: kor },
    { key: 'q3', title: '퀘스트 3', subject: '영어 · Can You Swim?', voice: 'p.quest3', items: eng },
    { key: 'boss', title: '미니 보스', subject: '구름 장난꾸러기', voice: 'p.boss', items: boss },
  ]
}
