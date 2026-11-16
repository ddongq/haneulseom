// 국어 3-2 가 3단원 「정확하게 글을 써요」
// (1) 이어 주는 말(그리고/그래서/그러나)  (2) 순서나 방법을 설명하는 글
// 문장은 모두 직접 지은 것. 교과서 지문을 옮기지 않는다.
import type { ChoiceItem } from '../types'

export const KOR_UNIT = 'kor-3-2-3-write'

const C3 = ['그리고', '그래서', '그러나'] as const

const CONNECT: [string, string, (typeof C3)[number], string][] = [
  ['비가 많이 내렸어요.', '우산을 쓰고 학교에 갔어요.', '그래서', '앞 일 때문에 뒤 일이 생겼으니까 "그래서"예요.'],
  ['아침에 세수를 했어요.', '이를 닦았어요.', '그리고', '한 일을 차례로 늘어놓으니까 "그리고"예요.'],
  ['나는 사과를 좋아해요.', '동생은 사과를 싫어해요.', '그러나', '앞과 뒤가 서로 반대니까 "그러나"예요.'],
  ['어제 늦게 잤어요.', '오늘 아침에 늦잠을 잤어요.', '그래서', '늦게 잔 것 때문에 늦잠을 잤으니까 "그래서"예요.'],
  ['열심히 달렸어요.', '버스를 놓쳤어요.', '그러나', '열심히 달렸는데 결과는 반대니까 "그러나"예요.'],
  ['공원에서 그네를 탔어요.', '미끄럼틀도 탔어요.', '그리고', '한 일을 더 보태니까 "그리고"예요.'],
  ['날씨가 무척 추웠어요.', '두꺼운 외투를 입었어요.', '그래서', '추운 날씨 때문에 외투를 입었으니까 "그래서"예요.'],
  ['키가 작은 강아지예요.', '아주 높이 뛰어요.', '그러나', '작은데 높이 뛰니까 생각과 반대예요. "그러나"예요.'],
  ['나는 책을 읽었어요.', '독서 기록장에 느낌을 썼어요.', '그리고', '한 일을 이어서 말하니까 "그리고"예요.'],
  ['동생이 넘어졌어요.', '무릎에 반창고를 붙였어요.', '그래서', '넘어진 것 때문에 반창고를 붙였으니까 "그래서"예요.'],
  ['숙제를 다 했어요.', '아직 준비물을 챙기지 못했어요.', '그러나', '숙제는 했지만 준비물은 못 챙겼으니 반대예요. "그러나"예요.'],
  ['바다에서 조개를 주웠어요.', '모래성도 쌓았어요.', '그리고', '한 일을 보태니까 "그리고"예요.'],
]

// 순서를 나타내는 말: 먼저 → 다음으로 → 마지막으로
const ORDER: { steps: string[]; title: string }[] = [
  { title: '손 씻는 방법', steps: ['손에 물을 묻혀요.', '비누로 거품을 내어 손을 문질러요.', '물로 깨끗이 헹궈요.'] },
  { title: '화분에 씨앗 심는 방법', steps: ['화분에 흙을 담아요.', '손가락으로 구멍을 내고 씨앗을 넣어요.', '흙을 덮고 물을 줘요.'] },
  { title: '종이비행기 날리는 방법', steps: ['종이를 반으로 접어요.', '양쪽 날개를 접어 비행기를 만들어요.', '앞으로 힘껏 날려요.'] },
  { title: '컵라면 먹는 방법', steps: ['뚜껑을 반쯤 열어요.', '선까지 뜨거운 물을 부어요.', '3분 기다린 뒤 먹어요.'] },
]
const ORDER_WORDS = ['먼저', '다음으로', '마지막으로'] as const

export function korItems(): ChoiceItem[] {
  const items: ChoiceItem[] = CONNECT.map(([a, b, ans, why], i) => ({
    id: `kor.connect.${i}`,
    kind: 'choice',
    subject: 'kor',
    unit: KOR_UNIT,
    prompt: '알맞은 이어 주는 말을 골라 보세요.',
    promptVoice: 'k.kor_connect',
    body: `${a} (   ) ${b}`,
    bodySpeak: `${a} 무엇 ${b}`,
    choices: [...C3],
    answer: C3.indexOf(ans),
    hints: ['앞 문장과 뒤 문장이 어떤 사이인지 생각해 보세요.', '그리고: 보태기 · 그래서: 까닭과 결과 · 그러나: 반대'],
    explain: why,
    difficulty: 1,
  }))
  ORDER.forEach((o, i) => {
    o.steps.forEach((step, k) => {
      items.push({
        id: `kor.order.${i}.${k}`,
        kind: 'choice',
        subject: 'kor',
        unit: KOR_UNIT,
        prompt: `「${o.title}」 글이에요. (   )에 들어갈 말을 골라 보세요.`,
        promptSpeak: `${o.title}을 설명하는 글이에요. 괄호에 들어갈 말을 골라 보세요.`,
        body: `(   ) ${step}`,
        bodySpeak: step,
        choices: [...ORDER_WORDS],
        answer: k,
        hints: ['이 일이 몇 번째로 하는 일인지 생각해 보세요.', o.steps.map((s, j) => `${j + 1}. ${s}`).join('\n')],
        explain: o.steps.map((s, j) => `${ORDER_WORDS[j]} ${s}`).join('\n'),
        difficulty: 2,
      })
    })
  })
  return items
}
