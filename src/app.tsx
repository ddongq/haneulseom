import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { PixelStage } from './gfx/PixelStage'
import { SkyScene } from './gfx/scene'
import { sfx, unlockAudio } from './audio/sfx'
import { preload, say } from './speech/voice'
import { recordLaunch, requestPersist } from './store/db'
import { Diagnostics } from './diag/Diagnostics'

function UpdateBar() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div class="update-bar">
      새 버전이 있어요
      <button onClick={() => updateServiceWorker(true)}>새로 고침</button>
    </div>
  )
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
      <UpdateBar />
    </>
  )
}
