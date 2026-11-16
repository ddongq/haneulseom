// 수식·단위를 한국어 읽기 문장으로 바꾼다. (TTS가 "3/4"를 "3 슬래시 4"로 읽는 문제 방지)

const DIGIT = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const SMALL = ['', '십', '백', '천']
const BIG = ['', '만', '억', '조']

/** 정수를 한자어 수사로: 1300 → 천삼백, 10000 → 만, 0 → 영 */
export function sino(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`sino: unsupported ${n}`)
  if (n === 0) return '영'
  let out = ''
  let group = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk > 0) {
      let s = ''
      let c = chunk
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10
        if (d > 0) s = (d === 1 && i > 0 ? '' : DIGIT[d]) + SMALL[i] + s
        c = Math.floor(c / 10)
      }
      // 10000 → "만" (일만 아님)
      if (group === 1 && chunk === 1) s = ''
      out = s + BIG[group] + out
    }
    n = Math.floor(n / 10000)
    group++
  }
  return out
}

function decimal(str: string): string {
  const [i, f] = str.split('.')
  return sino(Number(i)) + ' 점 ' + [...f].map((d) => (d === '0' ? '영' : DIGIT[Number(d)])).join('')
}

const UNIT_WORD: Record<string, string> = {
  mL: '밀리리터', kg: '킬로그램', km: '킬로미터', cm: '센티미터', mm: '밀리미터',
  L: '리터', g: '그램', m: '미터', t: '톤',
}

/** 화면용 수식 문자열 → 읽기 문장 */
export function ttsKo(text: string): string {
  let s = text
  // 대분수: 2와 3/4
  s = s.replace(/(\d+)\s*와\s*(\d+)\/(\d+)/g, (_, w, a, b) => `${sino(+w)}와 ${sino(+b)}분의 ${sino(+a)}`)
  // 분수: 3/4 → 사분의 삼
  s = s.replace(/(\d+)\/(\d+)/g, (_, a, b) => `${sino(+b)}분의 ${sino(+a)}`)
  // 소수
  s = s.replace(/\d+\.\d+/g, (m) => decimal(m))
  // 숫자 + 단위
  s = s.replace(/(\d+)\s*(mL|kg|km|cm|mm|L|g|m|t)(?![a-zA-Z])/g, (_, n, u) => `${sino(+n)} ${UNIT_WORD[u]}`)
  // 연산 기호
  s = s
    .replace(/\s*÷\s*/g, ' 나누기 ')
    .replace(/\s*[×x]\s*(?=\d)/g, ' 곱하기 ')
    .replace(/\s*\+\s*/g, ' 더하기 ')
    .replace(/(\d)\s*-\s*(?=\d)/g, '$1 빼기 ')
    .replace(/\s*=\s*/g, ' \u0000 ')
    .replace(/□/g, '네모')
  // 남은 정수
  s = s.replace(/\d+/g, (m) => sino(+m))
  // '=' 자리: 앞 글자 받침에 따라 은/는
  s = s.replace(/(\S)\s*\u0000/g, (_, ch: string) => `${ch}${hasBatchim(ch) ? '은' : '는'}`)
  return s.replace(/\s+/g, ' ').trim()
}

function hasBatchim(ch: string): boolean {
  const c = ch.charCodeAt(0)
  if (c < 0xac00 || c > 0xd7a3) return false
  return (c - 0xac00) % 28 !== 0
}
