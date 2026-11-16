// 문항 공통 형식. 정적 문항과 생성기 문항이 같은 모양을 쓴다.

export type Subject = 'math' | 'kor' | 'eng'

interface Base {
  id: string
  subject: Subject
  /** 단원 키 (알·도감과 연결) */
  unit: string
  /** 화면에 보이는 지시문 */
  prompt: string
  /** 녹음된 지시문 대사 id (없으면 promptSpeak을 기기 목소리로) */
  promptVoice?: string
  promptSpeak?: string
  /** 문항 본문 (수식, 문장 등) */
  body?: string
  /** 본문 읽기: 녹음 id 또는 기기 목소리용 문장 */
  bodyVoice?: string
  bodySpeak?: string
  /** 힌트 단계 (점점 구체적으로) */
  hints: string[]
  /** 정답 뒤·두 번 틀린 뒤 보여 줄 풀이 */
  explain: string
  difficulty: 1 | 2 | 3
}

export interface ChoiceItem extends Base {
  kind: 'choice'
  choices: string[]
  answer: number
}

export interface NumpadItem extends Base {
  kind: 'numpad'
  /** 칸 이름과 정답. 예: [{label:'몫',value:52},{label:'나머지',value:1}] */
  fields: { label: string; value: number }[]
}

export type Item = ChoiceItem | NumpadItem
