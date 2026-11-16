// speechSynthesis 래퍼. iOS는 첫 발화를 사용자 탭 안에서 해야 이후 자동 발화가 된다.

export type Lang = 'ko-KR' | 'en-US'

export function hasTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** 목소리 목록은 비동기로 채워진다. 최대 1.5초 기다린다. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!hasTTS()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((res) => {
    const done = () => res(speechSynthesis.getVoices())
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

const chosen: Partial<Record<Lang, SpeechSynthesisVoice | null>> = {}

export function setVoice(lang: Lang, v: SpeechSynthesisVoice | null) {
  chosen[lang] = v
}

/** 언어별 기본 목소리: 고품질(Enhanced/Premium) 이름을 우선 */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | null {
  const prefix = lang.slice(0, 2)
  const list = voices.filter((v) => v.lang.replace('_', '-').startsWith(prefix))
  const score = (v: SpeechSynthesisVoice) =>
    (/premium|프리미엄/i.test(v.name) ? 4 : 0) + (/enhanced|고품질|향상/i.test(v.name) ? 2 : 0) + (v.lang.replace('_', '-') === lang ? 1 : 0)
  return list.sort((a, b) => score(b) - score(a))[0] ?? null
}

export function speak(text: string, lang: Lang = 'ko-KR', rate?: number): Promise<void> {
  if (!hasTTS()) return Promise.resolve()
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate ?? (lang === 'en-US' ? 0.8 : 0.95)
  const v = chosen[lang]
  if (v) u.voice = v
  return new Promise((res) => {
    u.onend = () => res()
    u.onerror = () => res()
    speechSynthesis.speak(u)
  })
}
