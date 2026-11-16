import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Item } from '../content/types'
import type { SkyScene } from '../gfx/scene'
import { sfx } from '../audio/sfx'
import { preload, say, stopVoice } from '../speech/voice'
import { speak } from '../speech/tts'
import { planSession, type Quest } from './plan'
import {
  CRACKS_TO_HATCH, grantStardust, recordItem, saveProfile, weekCount, type Profile,
} from '../store/profile'
import { SpriteImg } from '../gfx/SpriteImg'
import { EGG_FRAMES, eggRoles, UNIT_COLOR } from '../sprites/egg'

const CORRECT = ['p.correct1', 'p.correct2', 'p.correct3', 'p.correct4']
const RETRY = ['p.retry1', 'p.retry2', 'p.retry3']

type Phase = 'intro' | 'ask' | 'result'
type Feedback = null | { kind: 'right' } | { kind: 'hint'; text: string } | { kind: 'reveal' }

async function speakItem(it: Item) {
  if (it.promptVoice) await say(it.promptVoice, it.prompt)
  else await speak(it.promptSpeak ?? it.prompt)
  if (it.bodyVoice) await say(it.bodyVoice)
  else if (it.bodySpeak) await speak(it.bodySpeak)
}

export function Session(props: { profile: Profile; scene: SkyScene; onDone: (p: Profile) => void }) {
  const p = props.profile
  const quests = useMemo<Quest[]>(() => planSession(p, p.today.date), [])
  const [qi, setQi] = useState(0)
  const [ii, setIi] = useState(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [tries, setTries] = useState(0)
  const [fb, setFb] = useState<Feedback>(null)
  const [input, setInput] = useState<string[]>([])
  const [field, setField] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const questSelf = useRef({ self: 0, total: 0 })
  const sessionStats = useRef({ firstRight: 0, total: 0, stardust: 0 })

  const quest = quests[qi]
  const item = quest?.items[ii]
  const totalItems = quests.reduce((n, q) => n + q.items.length, 0)
  const doneItems = quests.slice(0, qi).reduce((n, q) => n + q.items.length, 0) + ii

  // 퀘스트 소개 음성
  useEffect(() => {
    if (phase !== 'intro' || !quest) return
    preload([quest.voice, ...CORRECT, ...RETRY, 'p.idk', 'p.hint'])
    say(quest.voice)
  }, [phase, qi])

  // 문항 시작
  useEffect(() => {
    if (phase !== 'ask' || !item) return
    setTries(0)
    setFb(null)
    setPicked(null)
    setField(0)
    setInput(item.kind === 'numpad' ? item.fields.map(() => '') : [])
    speakItem(item)
  }, [phase, qi, ii])

  function finishItem(firstRight: boolean, self: boolean) {
    recordItem(p, item!.id, firstRight)
    questSelf.current.total++
    if (self) questSelf.current.self++
    sessionStats.current.total++
    if (firstRight) sessionStats.current.firstRight++
    saveProfile(p)
  }

  function next() {
    stopVoice()
    if (ii + 1 < quest.items.length) {
      setIi(ii + 1)
      setPhase('ask')
      // phase가 그대로 'ask'라 effect가 ii 변화로 다시 돈다
      return
    }
    // 퀘스트 끝: 스스로 시도 60% 이상이면 별가루 8
    const { self, total } = questSelf.current
    if (total > 0 && self / total >= 0.6) sessionStats.current.stardust += grantStardust(p, 8)
    questSelf.current = { self: 0, total: 0 }
    if (qi + 1 < quests.length) {
      setQi(qi + 1)
      setIi(0)
      setPhase('intro')
    } else {
      endSession()
    }
  }

  function endSession() {
    const st = sessionStats.current
    st.stardust += grantStardust(p, 10)
    if (st.total && st.firstRight / st.total >= 0.8) st.stardust += grantStardust(p, 5)
    // 오늘 다룬 단원의 알마다 금 1단계
    const units = Array.from(new Set(quests.flatMap((q) => q.items.map((x) => x.unit))))
    for (const u of units) {
      const e = p.eggs[u] ?? { cracks: 0, hatched: false }
      if (!e.hatched) e.cracks = Math.min(CRACKS_TO_HATCH, e.cracks + 1)
      p.eggs[u] = e
    }
    p.sessions++
    p.today.sessionDone = true
    if (!p.days.includes(p.today.date)) p.days.push(p.today.date)
    saveProfile(p)
    setPhase('result')
    sfx.sparkle()
    props.scene.burst(128, 120, 60)
    say('p.done').then(() => say('p.tomorrow'))
  }

  function judge(ok: boolean) {
    if (ok) {
      sfx.correct()
      props.scene.burst(128, 100, 30)
      say(CORRECT[(doneItems + tries) % CORRECT.length])
      setFb({ kind: 'right' })
      finishItem(tries === 0, true)
      return
    }
    sfx.soft()
    if (tries === 0) {
      setTries(1)
      say(RETRY[doneItems % RETRY.length])
      setFb({ kind: 'hint', text: item!.hints[0] ?? '' })
    } else if (tries === 1 && item!.hints[1]) {
      setTries(2)
      setFb({ kind: 'hint', text: item!.hints[1] })
      say('p.retry2')
    } else {
      revealAnswer(true)
    }
  }

  function revealAnswer(attempted: boolean) {
    stopVoice()
    say('p.idk')
    setFb({ kind: 'reveal' })
    finishItem(false, attempted)
  }

  function choose(i: number) {
    if (fb?.kind === 'right' || fb?.kind === 'reveal' || item?.kind !== 'choice') return
    setPicked(i)
    judge(i === item.answer)
  }

  function press(d: string) {
    if (item?.kind !== 'numpad' || fb?.kind === 'right' || fb?.kind === 'reveal') return
    sfx.tap()
    const v = input.slice()
    if (d === '⌫') v[field] = v[field].slice(0, -1)
    else if (v[field].length < 4) v[field] += d
    setInput(v)
  }

  function submitNumpad() {
    if (item?.kind !== 'numpad') return
    if (input.some((x) => x === '')) {
      setField(input.findIndex((x) => x === ''))
      return
    }
    judge(item.fields.every((f, k) => Number(input[k]) === f.value))
  }

  // ---------- 화면 ----------

  const progress = (
    <div class="progress">
      {quests.map((q, k) => (
        <span class={`step ${k < qi ? 'done' : k === qi ? 'now' : ''}`}>{q.key === 'boss' ? '★' : k + 1}</span>
      ))}
      <span class="count">{doneItems}/{totalItems}</span>
    </div>
  )

  if (phase === 'intro') {
    return (
      <div class="sheet center" onClick={() => { sfx.tap(); setPhase('ask') }}>
        {progress}
        <div class="quest-card">
          <div class="quest-title">{quest.title}</div>
          <div class="quest-sub">{quest.subject}</div>
          <div class="quest-n">{quest.items.length}문제</div>
          <button class="primary">시작 ▶</button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const units = Array.from(new Set(quests.flatMap((q) => q.items.map((x) => x.unit))))
    return (
      <div class="sheet center">
        <div class="result-card">
          <h2>오늘 모험 완료!</h2>
          <div class="eggs">
            {units.map((u) => {
              const e = p.eggs[u]
              return (
                <div class="egg">
                  <SpriteImg def={EGG_FRAMES[Math.min(3, e?.cracks ?? 0)]} roles={eggRoles(UNIT_COLOR[u] ?? '#ffd36b')} scale={7} />
                  <div class="egg-label">{(e?.cracks ?? 0) >= CRACKS_TO_HATCH ? '곧 깨어나요!' : `금 ${e?.cracks ?? 0}/${CRACKS_TO_HATCH}`}</div>
                </div>
              )
            })}
          </div>
          <div class="result-row">
            <span>별가루</span>
            <b>+{sessionStats.current.stardust}</b>
            <span class="muted">(모은 별가루 {p.stardust})</span>
          </div>
          <div class="result-row">
            <span>처음에 맞힌 문제</span>
            <b>{sessionStats.current.firstRight}/{sessionStats.current.total}</b>
          </div>
          <div class="result-row">
            <span>이번 주 등불</span>
            <b>{'●'.repeat(Math.min(4, weekCount(p)))}{'○'.repeat(Math.max(0, 4 - weekCount(p)))}</b>
          </div>
          <ReadingCheck profile={p} />
          <button class="primary" onClick={() => { stopVoice(); props.onDone(p) }}>마치기</button>
        </div>
      </div>
    )
  }

  if (!item) return null
  const locked = fb?.kind === 'right' || fb?.kind === 'reveal'

  return (
    <div class="sheet">
      {progress}
      <div class="ask-card">
        <div class="prompt-row">
          <div class="prompt">{item.prompt}</div>
          <button class="listen" onClick={() => speakItem(item)} aria-label="다시 듣기">다시 듣기</button>
        </div>
        {item.body && <div class={`body ${item.subject}`}>{item.body}</div>}
        {item.bodyVoice && !item.body && (
          <button class="listen big" onClick={() => say(item.bodyVoice!)}>▶ 소리 듣기</button>
        )}

        {item.kind === 'choice' && (
          <div class={`choices n${item.choices.length}`}>
            {item.choices.map((c, k) => {
              const cls =
                locked && k === item.answer ? 'right' : picked === k && fb?.kind === 'hint' ? 'wrong' : ''
              return (
                <button class={`choice ${cls}`} onClick={() => choose(k)} disabled={locked}>
                  {c}
                </button>
              )
            })}
          </div>
        )}

        {item.kind === 'numpad' && (
          <div class="numpad-wrap">
            <div class="fields">
              {item.fields.map((f, k) => (
                <button class={`field ${field === k ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => setField(k)}>
                  <span class="label">{f.label}</span>
                  <span class="val">{locked && fb?.kind === 'reveal' ? f.value : input[k] || ' '}</span>
                </button>
              ))}
            </div>
            {!locked && (
              <div class="numpad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인'].map((d) => (
                  <button
                    class={d === '확인' ? 'ok' : ''}
                    onClick={() => (d === '확인' ? submitNumpad() : press(d))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {fb?.kind === 'hint' && <div class="hint"><b>힌트</b> {fb.text}</div>}
        {(fb?.kind === 'right' || fb?.kind === 'reveal') && (
          <div class={`explain ${fb.kind}`}>
            <div class="explain-title">{fb.kind === 'right' ? '정답!' : '같이 풀어 보자'}</div>
            <pre>{item.explain}</pre>
          </div>
        )}

        <div class="bottom-row">
          {!locked && (
            <button class="ghost" onClick={() => revealAnswer(tries > 0)}>
              모르겠어요
            </button>
          )}
          {locked && (
            <button class="primary" onClick={next}>
              다음 ▶
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadingCheck(props: { profile: Profile }) {
  const p = props.profile
  const [done, setDone] = useState(p.today.reading)
  if (done) return <div class="result-row"><span>오늘 책 읽기</span><b>읽었어요 ✓</b></div>
  return (
    <div class="reading">
      <span>오늘 책을 소리 내어 10분 읽었나요?</span>
      <button
        class="primary small"
        onClick={() => {
          p.today.reading = true
          grantStardust(p, 5)
          saveProfile(p)
          sfx.sparkle()
          say('p.reading_yes')
          setDone(true)
        }}
      >
        읽었어요!
      </button>
    </div>
  )
}
