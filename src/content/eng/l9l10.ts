// 영어 김태은 『영어 3』 L9 Can You Swim? · L10 She's My Mom (천재교과서)
// 듣기 중심: 소리(녹음 Aoede)를 듣고 뜻 고르기 / 질문에 알맞은 대답 고르기
import type { ChoiceItem } from '../types'

export const ENG_UNIT = 'eng-L9-L10'

const WORDS: [string, string][] = [
  ['e.swim', '수영하다'], ['e.skate', '스케이트 타다'], ['e.ski', '스키 타다'], ['e.jump', '점프하다'],
  ['e.run', '달리다'], ['e.dance', '춤추다'], ['e.sing', '노래하다'], ['e.fly', '날다'],
  ['e.mom', '엄마'], ['e.dad', '아빠'], ['e.brother', '형·오빠·남동생'], ['e.sister', '언니·누나·여동생'],
  ['e.grandma', '할머니'], ['e.grandpa', '할아버지'],
]

const QA: { q: string; qText: string; right: string; wrong: string[] }[] = [
  { q: 'e.q_swim', qText: 'Can you swim?', right: 'Yes, I can.', wrong: ["She's my mom.", "It's snowing."] },
  { q: 'e.q_skate', qText: 'Can you skate?', right: "No, I can't.", wrong: ["He's my dad.", 'How are you?'] },
  { q: 'e.q_jump', qText: 'Can you jump?', right: 'Yes, I can.', wrong: ["She's my sister.", "It's sunny."] },
  { q: 'e.q_who_she', qText: 'Who is she?', right: "She's my mom.", wrong: ['Yes, I can.', "He's my dad."] },
  { q: 'e.q_who_he', qText: 'Who is he?', right: "He's my brother.", wrong: ["She's my sister.", "No, I can't."] },
]

export function engItems(): ChoiceItem[] {
  const out: ChoiceItem[] = []
  WORDS.forEach(([voice, ko], i) => {
    // 같은 묶음(동작/가족)에서 오답 2개
    const group = i < 8 ? WORDS.slice(0, 8) : WORDS.slice(8)
    const others = group.filter(([v]) => v !== voice).map(([, k]) => k)
    const wrong = [others[(i * 3 + 1) % others.length], others[(i * 5 + 2) % others.length]]
    const uniq = Array.from(new Set(wrong))
    if (uniq.length < 2) uniq.push(others.find((o) => !uniq.includes(o))!)
    const choices = [ko, ...uniq.slice(0, 2)]
    // 정답 위치 섞기 (결정적)
    const rot = i % 3
    const rotated = [...choices.slice(rot), ...choices.slice(0, rot)]
    out.push({
      id: `eng.word.${voice}`,
      kind: 'choice',
      subject: 'eng',
      unit: ENG_UNIT,
      prompt: '잘 듣고 알맞은 뜻을 골라 보세요.',
      promptVoice: 'k.eng_listen',
      bodyVoice: voice,
      choices: rotated,
      answer: rotated.indexOf(ko),
      hints: ['소리를 한 번 더 들어 보세요.', `첫소리를 잘 들어 보세요.`],
      explain: `${voice.slice(2)} = ${ko}`,
      difficulty: 1,
    })
  })
  QA.forEach((x, i) => {
    const choices = [x.right, ...x.wrong]
    const rot = (i + 1) % 3
    const rotated = [...choices.slice(rot), ...choices.slice(0, rot)]
    out.push({
      id: `eng.qa.${i}`,
      kind: 'choice',
      subject: 'eng',
      unit: ENG_UNIT,
      prompt: '질문을 듣고 알맞은 대답을 골라 보세요.',
      promptVoice: 'k.eng_answer',
      bodyVoice: x.q,
      choices: rotated,
      answer: rotated.indexOf(x.right),
      hints: ['질문을 한 번 더 들어 보세요.', x.q.includes('who') ? '"누구야?" 하고 묻고 있어요.' : '"~할 수 있니?" 하고 묻고 있어요.'],
      explain: `${x.qText} → ${x.right}`,
      difficulty: 2,
    })
  })
  return out
}
