import { useEffect, useState } from 'preact/hooks'
import { PixelStage } from '../gfx/PixelStage'
import type { SkyScene } from '../gfx/scene'
import { audioState, sfx, unlockAudio } from '../audio/sfx'
import { hasTTS, loadVoices, pickVoice, setVoice, speak, type Lang } from '../speech/tts'
import { ttsKo } from '../speech/ttsKo'
import { say, voiceIds } from '../speech/voice'
import { exportBackup, importBackup, isStandalone, kv, recordLaunch, requestPersist } from '../store/db'
import { LW, LH } from '../gfx/screen'
import { loadProfile, saveProfile } from '../store/profile'

// M0 iPad 호환 점검 화면. 결과를 "호환표" 텍스트로 복사해 기획에 반영한다.

type Mark = '좋음' | '애매' | '나쁨'

const KO_SAMPLES = [
  '○○아, 왔구나! 오늘도 같이 모험하자.',
  '그리고, 그래서, 그러나 중에서 알맞은 말을 골라 보세요.',
]
const MATH_SAMPLES = ['96 ÷ 8 = □', '157 ÷ 3', '3/4', '2와 1/3', '1L 300mL', '4kg 250g']
const EN_SAMPLES = [
  'swim', 'jump', 'skate', 'mom', 'dad', 'brother', 'sister', 'grandma', 'grandpa',
  'sunny', 'rainy', 'snowy', 'cloudy', 'windy',
  'Can you swim?', 'Yes, I can.', "No, I can't.", "She's my mom.", "It's snowing.",
]

export function Diagnostics(props: { scene: SkyScene; onClose: () => void }) {
  const [env, setEnv] = useState<Record<string, string>>({})
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setV] = useState<Record<Lang, string>>({ 'ko-KR': '', 'en-US': '' })
  const [enRate, setEnRate] = useState(0.8)
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [fps, setFps] = useState(0)
  const [stress, setStress] = useState(0)
  const [msg, setMsg] = useState('')
  const [recorded, setRecorded] = useState<string[]>([])

  async function refreshEnv() {
    const est = await navigator.storage?.estimate?.().catch(() => undefined)
    const persisted = await navigator.storage?.persisted?.().catch(() => undefined)
    const launches = await kv.get<{ count: number; first: string }>('launches')
    let idb = '실패'
    try {
      await kv.set('probe', { at: Date.now() })
      idb = (await kv.get('probe')) ? '읽기·쓰기 OK' : '읽기 실패'
    } catch (e) {
      idb = '실패: ' + String(e)
    }
    setEnv({
      실행모드: isStandalone() ? '홈 화면 앱 (standalone)' : 'Safari 탭',
      화면: `${window.innerWidth}×${window.innerHeight}pt, dpr ${window.devicePixelRatio}`,
      화면방향: window.innerWidth > window.innerHeight ? '가로' : '세로',
      'IndexedDB': idb,
      영구저장: persisted === undefined ? '지원 안 함' : persisted ? '허용됨' : '아직 아님',
      저장공간: est ? `${((est.usage ?? 0) / 1024).toFixed(0)}KB 사용 / ${((est.quota ?? 0) / 1024 / 1024).toFixed(0)}MB` : '알 수 없음',
      실행횟수: launches ? `${launches.count}회 (처음: ${launches.first.slice(0, 10)})` : '-',
      서비스워커: 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? '동작 중 (오프라인 가능)' : '등록 대기') : '지원 안 함',
      음성합성: hasTTS() ? '있음' : '없음',
      오디오: audioState(),
      브라우저: navigator.userAgent,
    })
  }

  useEffect(() => {
    refreshEnv()
    loadVoices().then((vs) => {
      setVoices(vs)
      const ko = pickVoice(vs, 'ko-KR')
      const en = pickVoice(vs, 'en-US')
      setVoice('ko-KR', ko)
      setVoice('en-US', en)
      setV({ 'ko-KR': ko?.name ?? '', 'en-US': en?.name ?? '' })
    })
    voiceIds().then(setRecorded)
    window.addEventListener('resize', refreshEnv)
    return () => window.removeEventListener('resize', refreshEnv)
  }, [])

  useEffect(() => {
    props.scene.stressCount = stress
    return () => {
      props.scene.stressCount = 0
    }
  }, [stress])

  function chooseVoice(lang: Lang, name: string) {
    const v = voices.find((x) => x.name === name) ?? null
    setVoice(lang, v)
    setV({ ...voice, [lang]: name })
  }

  function MarkRow(p: { id: string; label: string; onPlay: () => void }) {
    return (
      <div class="mark-row">
        <button onClick={p.onPlay}>▶</button>
        <span style={{ minWidth: '9em' }}>{p.label}</span>
        {(['좋음', '애매', '나쁨'] as Mark[]).map((m) => (
          <button class={marks[p.id] === m ? 'on' : ''} onClick={() => setMarks({ ...marks, [p.id]: m })}>
            {m}
          </button>
        ))}
      </div>
    )
  }

  function report(): string {
    const lines = ['# 하늘섬 M0 iPad 호환표', `점검 시각: ${new Date().toLocaleString('ko-KR')}`, '']
    for (const [k, v] of Object.entries(env)) lines.push(`- ${k}: ${v}`)
    lines.push(`- 렌더: ${LW}×${LH}, ${fps}fps (파티클 ${stress}개)`)
    lines.push(`- 한국어 목소리: ${voice['ko-KR'] || '(기본)'} / 영어 목소리: ${voice['en-US'] || '(기본)'} (영어 속도 ${enRate})`)
    lines.push(`- 목소리 수: ko ${voices.filter((v) => v.lang.startsWith('ko')).length}, en ${voices.filter((v) => v.lang.startsWith('en')).length}`)
    lines.push('', '## 듣기 평가')
    for (const [k, v] of Object.entries(marks)) lines.push(`- ${k}: ${v}`)
    return lines.join('\n')
  }

  async function copyReport() {
    const text = report()
    try {
      await navigator.clipboard.writeText(text)
      setMsg('호환표를 복사했어요. 채팅에 붙여 넣어 주세요.')
    } catch {
      setMsg('복사가 막혔어요. 아래 글을 길게 눌러 복사해 주세요.')
    }
  }

  async function onImport(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    try {
      const n = await importBackup(await f.text())
      setMsg(`백업에서 ${n}개 항목을 되살렸어요.`)
      refreshEnv()
    } catch (err) {
      setMsg(String((err as Error).message ?? err))
    }
  }

  const koVoices = voices.filter((v) => v.lang.startsWith('ko'))
  const enVoices = voices.filter((v) => v.lang.startsWith('en'))

  return (
    <div class="diag">
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>iPad 점검 (M0)</h1>
          <p class="sub">어른용 화면이에요. 확인이 끝나면 '호환표 복사'를 눌러 보내 주세요.</p>
        </div>
        <div class="row">
          <button onClick={copyReport}>호환표 복사</button>
          <button onClick={props.onClose}>닫기</button>
        </div>
      </div>
      {msg && <div class="card">{msg}</div>}

      <div class="card">
        <h2>1. 실행 환경과 저장</h2>
        <dl class="kv">
          {Object.entries(env).map(([k, v]) => (
            <>
              <dt>{k}</dt>
              <dd class={/OK|허용|standalone|동작/.test(v) ? 'ok' : /실패|없음|지원 안/.test(v) ? 'bad' : ''}>{v}</dd>
            </>
          ))}
        </dl>
        <div class="row">
          <button onClick={async () => { await requestPersist(); refreshEnv() }}>영구 저장 요청</button>
          <button onClick={async () => { await recordLaunch(); refreshEnv() }}>실행 횟수 +1</button>
          <button onClick={refreshEnv}>새로 확인</button>
          <button onClick={async () => {
            const pr = await loadProfile()
            pr.today.sessionDone = false
            await saveProfile(pr)
            setMsg('오늘 모험을 한 번 더 할 수 있게 했어요. (별가루 하루 상한은 그대로)')
          }}>오늘 모험 다시 열기 (테스트)</button>
        </div>
        <p class="sub">홈 화면 앱으로 연 뒤 며칠 동안 '실행 횟수'가 유지되는지 봐 주세요.</p>
      </div>

      <div class="card">
        <h2>2. 소리</h2>
        <div class="row">
          <button onClick={async () => { await unlockAudio(); sfx.tap(); refreshEnv() }}>톡</button>
          <button onClick={async () => { await unlockAudio(); sfx.correct() }}>정답</button>
          <button onClick={async () => { await unlockAudio(); sfx.soft() }}>다시 해 보자</button>
          <button onClick={async () => { await unlockAudio(); sfx.sparkle() }}>반짝</button>
        </div>
        <p class="sub">무음 스위치·이어폰에서도 들어 보세요. 앱을 나갔다 들어온 뒤에도 소리가 나는지 확인해 주세요.</p>
      </div>

      <div class="card">
        <h2>녹음된 목소리 (Chirp 3 HD · Aoede) — {recorded.length}개</h2>
        {recorded.length === 0 && <p class="sub">아직 녹음 파일이 없어요. 녹음이 없으면 아래 기기 목소리로 읽어요.</p>}
        <div class="row">
          {recorded.map((id) => (
            <button onClick={async () => { await unlockAudio(); say(id) }}>{id.replace(/^[pke]\./, '')}</button>
          ))}
        </div>
      </div>

      <div class="card">
        <h2>3. 기기 목소리 (한국어, 녹음 없는 문장용)</h2>
        <div class="row">
          <select value={voice['ko-KR']} onChange={(e) => chooseVoice('ko-KR', (e.target as HTMLSelectElement).value)}>
            {koVoices.length === 0 && <option value="">한국어 목소리 없음</option>}
            {koVoices.map((v) => <option value={v.name}>{v.name}</option>)}
          </select>
        </div>
        {KO_SAMPLES.map((s, i) => <MarkRow id={`ko${i + 1}: ${s}`} label={s} onPlay={() => speak(s, 'ko-KR')} />)}
        <h2 style={{ marginTop: 12 }}>수식 읽기</h2>
        {MATH_SAMPLES.map((s) => (
          <MarkRow id={`수식 ${s} → ${ttsKo(s)}`} label={`${s} → ${ttsKo(s)}`} onPlay={() => speak(ttsKo(s), 'ko-KR')} />
        ))}
      </div>

      <div class="card">
        <h2>4. 기기 목소리 (영어, 비교용)</h2>
        <div class="row">
          <select value={voice['en-US']} onChange={(e) => chooseVoice('en-US', (e.target as HTMLSelectElement).value)}>
            {enVoices.length === 0 && <option value="">영어 목소리 없음</option>}
            {enVoices.map((v) => <option value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
          {[0.7, 0.8, 0.9].map((r) => (
            <button class={enRate === r ? 'on' : ''} style={enRate === r ? { background: 'var(--cloud)', color: 'var(--ink)' } : {}} onClick={() => setEnRate(r)}>
              속도 {r}
            </button>
          ))}
        </div>
        {EN_SAMPLES.map((s) => <MarkRow id={`en ${s}`} label={s} onPlay={() => speak(s, 'en-US', enRate)} />)}
        <p class="sub">설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성에서 '고품질' 목소리를 받으면 여기 목록에 나타날 수 있어요.</p>
      </div>

      <div class="card">
        <h2>5. 그림과 성능</h2>
        <p>
          지금 {fps}fps · 반짝이 {stress}개 · 논리 {LW}×{LH}
        </p>
        <div class="row">
          {[0, 200, 500, 1000].map((n) => (
            <button onClick={() => setStress(n)}>반짝이 {n}</button>
          ))}
        </div>
        <div style={{ position: 'relative', height: '50vh', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <PixelStage scene={props.scene} onFps={(f) => setFps(f)} />
          </div>
        </div>
        <p class="sub">포롱 윤곽이 번지지 않고 또렷한지, 200개에서 60fps 근처인지 봐 주세요.</p>
      </div>

      <div class="card">
        <h2>6. 백업</h2>
        <div class="row">
          <button onClick={() => exportBackup().then(() => setMsg('백업 파일을 만들었어요.')).catch((e) => setMsg('백업 실패: ' + e))}>백업 내보내기</button>
          <label class="row" style={{ alignItems: 'center' }}>
            <span>백업 가져오기</span>
            <input type="file" accept="application/json,.json" onChange={onImport} />
          </label>
        </div>
        <p class="sub">'파일에 저장'으로 iCloud Drive에 넣고, 다시 가져와 실행 횟수가 돌아오는지 확인해 주세요.</p>
      </div>

      <div class="card">
        <h2>호환표 미리 보기</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{report()}</pre>
      </div>
    </div>
  )
}
