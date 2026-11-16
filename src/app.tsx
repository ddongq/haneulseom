import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { PixelStage } from './gfx/PixelStage'
import { SkyScene } from './gfx/scene'
import { sfx, unlockAudio } from './audio/sfx'
import { preload, say } from './speech/voice'
import { recordLaunch, requestPersist } from './store/db'
import { Diagnostics } from './diag/Diagnostics'

/**
 * 새 버전 자동 적용.
 * 홈 화면 앱은 껐다 켜지 않으면 업데이트를 확인하지 않으므로,
 * 앱이 앞으로 나올 때마다(그리고 30분마다) 새 버전을 확인하고,
 * 학습 중이 아니면(busy=false) 바로 바꾼다. 학습 중이면 끝난 뒤 바꾼다.
 */
function AutoUpdate(props: { busy: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return
      const check = () => r.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, 30 * 60 * 1000)
    },
  })
  useEffect(() => {
    if (needRefresh && !props.busy) updateServiceWorker(true)
  }, [needRefresh, props.busy])
  if (!needRefresh) return null
  return <div class="update-bar">새 버전으로 바꾸는 중…</div>
}

export function App() {
  const [view, setView] = useState<'home' | 'diag'>('home')
  const [scene] = useState(() => new SkyScene())
  const [bubble, setBubble] = useState('톡 눌러서 시작해요')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    recordLaunch().catch(() => {})
    preload(['p.greet_first', 'p.soon'])
    requestPersist().catch(() => {})
  }, [])

  async function start() {
    // iOS: 소리·음성 잠금 해제는 반드시 이 탭 안에서
    await unlockAudio()
    sfx.sparkle()
    scene.burst(128, 140, 40)
    if (!started) {
      setStarted(true)
      setBubble('안녕! 나는 포롱이야')
      await say('p.greet_first')
      setBubble('모험은 곧 열려요!')
    } else {
      setBubble('모험은 곧 열려요!')
      say('p.soon')
    }
  }

  if (view === 'diag') return <Diagnostics scene={scene} onClose={() => setView('home')} />

  return (
    <>
      <PixelStage scene={scene} />
      <div class="overlay">
        <h1 class="title">하늘섬 탐험일지</h1>
        <div class="speech">{bubble}</div>
      </div>
      <button class="big-btn" onClick={start}>
        {started ? '오늘의 모험 ▶' : '시작하기 ▶'}
      </button>
      <button class="corner-btn" onClick={() => setView('diag')} aria-label="어른용 점검">
        ⚙︎ 점검
      </button>
      <AutoUpdate busy={false} />
    </>
  )
}
