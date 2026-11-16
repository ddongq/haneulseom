import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { PixelStage } from './gfx/PixelStage'
import { SkyScene } from './gfx/scene'
import { sfx, unlockAudio } from './audio/sfx'
import { say } from './speech/voice'
import { recordLaunch, requestPersist } from './store/db'
import { loadProfile, type Profile } from './store/profile'
import { Session } from './session/Session'
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
  const [view, setView] = useState<'home' | 'session' | 'diag'>('home')
  const [scene] = useState(() => new SkyScene())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bubble, setBubble] = useState('톡 눌러서 시작해요')
  const [greeted, setGreeted] = useState(false)

  useEffect(() => {
    recordLaunch().catch(() => {})
    requestPersist().catch(() => {})
    loadProfile().then(setProfile)
  }, [])

  const doneToday = !!profile?.today.sessionDone

  useEffect(() => {
    if (doneToday) setBubble('포롱은 쿨쿨… 내일 또 만나요')
  }, [doneToday])

  async function start() {
    // iOS: 소리·음성 잠금 해제는 반드시 이 탭 안에서
    await unlockAudio()
    sfx.sparkle()
    scene.burst(128, 140, 40)
    if (!profile) return
    if (doneToday) {
      setBubble('오늘 모험은 끝났어요. 내일 만나요!')
      say('p.sleep')
      return
    }
    if (!greeted) {
      setGreeted(true)
      setBubble('안녕! 나는 포롱이야')
      await say(profile.sessions === 0 ? 'p.greet_first' : 'p.greet_back')
    }
    setView('session')
  }

  if (view === 'diag')
    return (
      <Diagnostics
        scene={scene}
        onClose={() => { loadProfile().then(setProfile); setView('home') }}
      />
    )

  return (
    <>
      <PixelStage scene={scene} />
      {view === 'session' && profile ? (
        <Session
          profile={profile}
          scene={scene}
          onDone={(p) => { setProfile({ ...p }); setView('home') }}
        />
      ) : (
        <>
          <div class="overlay">
            <h1 class="title">하늘섬 탐험일지</h1>
            <div class="speech">{bubble}</div>
            {profile && (
              <div class="stardust-pill">별가루 {profile.stardust}</div>
            )}
          </div>
          <button class={`big-btn ${doneToday ? 'sleep' : ''}`} onClick={start}>
            {doneToday ? '내일 또 만나요' : greeted ? '오늘의 모험 ▶' : '시작하기 ▶'}
          </button>
          <button class="corner-btn" onClick={() => setView('diag')} aria-label="어른용 점검">
            ⚙︎ 점검
          </button>
        </>
      )}
      <AutoUpdate busy={view === 'session'} />
    </>
  )
}
