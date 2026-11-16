// 3-2-2 나눗셈 생성기 (아이스크림미디어 3-2 2단원 범위)
// 레벨 1: (몇십)÷(몇)            예) 60÷3
// 레벨 2: (몇십 몇)÷(몇), 나머지 0  예) 84÷4, 72÷3
// 레벨 3: (몇십 몇)÷(몇), 나머지 있음 예) 47÷3 = 15…2
// 레벨 4: (세 자리)÷(한 자리)        예) 156÷3, 157÷3 = 52…1
import type { ChoiceItem, NumpadItem } from '../types'
import { randInt, shuffle, type Rng } from '../rng'
import { ttsKo } from '../../speech/ttsKo'

export const DIV_UNIT = 'math-3-2-2-div'

export interface DivProblem { a: number; b: number; q: number; r: number }

export function makeDiv(rng: Rng, level: 1 | 2 | 3 | 4): DivProblem {
  for (let tries = 0; tries < 200; tries++) {
    const b = randInt(rng, 2, 9)
    let a: number
    if (level === 1) {
      // 몇십 ÷ 몇 : 몫이 정수인 것 (예: 60÷3=20, 80÷4=20, 90÷3=30)
      const q = randInt(rng, 1, 4) * 10
      a = q * b
      if (a > 90 || a % 10 !== 0) continue
    } else if (level === 2) {
      const q = randInt(rng, 11, 45)
      a = q * b
      if (a < 20 || a > 99) continue
    } else if (level === 3) {
      a = randInt(rng, 20, 99)
      if (a % b === 0 || Math.floor(a / b) < 5) continue
    } else {
      a = randInt(rng, 100, 999)
      // 몫이 두 자리 또는 세 자리, 지나치게 크지 않게
      if (Math.floor(a / b) < 12) continue
    }
    return { a, b, q: Math.floor(a / b), r: a % b }
  }
  return { a: 84, b: 4, q: 21, r: 0 }
}

/** 숫자 뒤 조사: 받침(한자어 읽기 기준)에 따라 고른다. 예) 3으로, 4로, 1은, 2는 */
export function josaNum(n: number, withBatchim: string, without: string, rieul?: string): string {
  const last = n % 10
  const tens = n % 100
  // 끝자리 읽기: 0이면 십/백/천 (십·백 받침 있음, 천 없음)
  let ch: string
  if (last !== 0) ch = '_일이삼사오육칠팔구'[last]
  else if (tens !== 0) ch = '십'
  else if (n % 1000 !== 0) ch = '백'
  else ch = '천'
  const code = ch.charCodeAt(0) - 0xac00
  const jong = code % 28
  if (jong === 0) return `${n}${without}`
  if (jong === 8 && rieul !== undefined) return `${n}${rieul}` // ㄹ 받침 + 로
  return `${n}${withBatchim}`
}
const ro = (n: number) => josaNum(n, '으로', '로', '로')
const eun = (n: number) => josaNum(n, '은', '는')
const eul = (n: number) => josaNum(n, '을', '를')

function explainDiv({ a, b, q, r }: DivProblem): string {
  const check = r === 0 ? `확인: ${b} × ${q} = ${a}` : `확인: ${b} × ${q} = ${b * q}, ${b * q} + ${r} = ${a}`
  return r === 0
    ? `${a} ÷ ${b} = ${q}\n${check}`
    : `${a} ÷ ${b} = ${q} … ${r}\n나머지 ${eun(r)} 나누는 수 ${b}보다 작아야 해요.\n${check}`
}

function hintsDiv({ a, b }: DivProblem): string[] {
  const tens = Math.floor(a / 10) * 10
  const h1 = a >= 100 ? `백의 자리부터 차례로 ${ro(b)} 나누어 보세요.` : `먼저 ${eul(tens)} ${ro(b)} 나누어 보세요.`
  return [h1, `${b}단 곱셈구구를 떠올려 보세요. ${b} × □ 가 ${a}보다 크지 않으면서 가장 가까운 수는?`]
}

export function divNumpad(rng: Rng, level: 1 | 2 | 3 | 4, id: string): NumpadItem {
  const p = makeDiv(rng, level)
  const withR = p.r !== 0
  const body = `${p.a} ÷ ${p.b}`
  return {
    id,
    kind: 'numpad',
    subject: 'math',
    unit: DIV_UNIT,
    prompt: withR ? '몫과 나머지를 구해 보세요.' : '몫을 구해 보세요.',
    promptVoice: withR ? 'k.math_rem' : 'k.math_quot',
    body,
    bodySpeak: ttsKo(body),
    fields: withR ? [{ label: '몫', value: p.q }, { label: '나머지', value: p.r }] : [{ label: '몫', value: p.q }],
    hints: hintsDiv(p),
    explain: explainDiv(p),
    difficulty: level <= 2 ? 1 : level === 3 ? 2 : 3,
  }
}

/** 나눗셈 확인하기: 계산이 맞는지 고르기 (나머지가 나누는 수보다 큰 오답 포함) */
export function divCheckChoice(rng: Rng, id: string): ChoiceItem {
  const p = makeDiv(rng, 3)
  const right = `${p.a} ÷ ${p.b} = ${p.q} … ${p.r}`
  const wrongs = [
    `${p.a} ÷ ${p.b} = ${p.q - 1} … ${p.r + p.b}`, // 나머지가 나누는 수보다 큼
    `${p.a} ÷ ${p.b} = ${p.q + 1} … ${p.r}`,
  ]
  const choices = shuffle(rng, [right, ...wrongs])
  return {
    id,
    kind: 'choice',
    subject: 'math',
    unit: DIV_UNIT,
    prompt: '바르게 계산한 것을 골라 보세요.',
    promptVoice: 'k.math_check',
    choices,
    answer: choices.indexOf(right),
    hints: ['나머지는 나누는 수보다 작아야 해요.', `${p.b} × 몫 + 나머지 = ${p.a} 인지 확인해 보세요.`],
    explain: explainDiv(p),
    difficulty: 2,
  }
}
