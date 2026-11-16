// Web Audio 칩튠 효과음. iOS는 사용자 탭 안에서 resume()해야 소리가 난다.

let ctx: AudioContext | null = null

export function audioState(): string {
  return ctx ? ctx.state : 'none'
}

/** 첫 탭 핸들러 안에서 반드시 호출. */
export async function unlockAudio(): Promise<string> {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  if (ctx.state !== 'running') await ctx.resume()
  // 무음 1샘플 재생으로 iOS 잠금 해제 확정
  const b = ctx.createBuffer(1, 1, 22050)
  const s = ctx.createBufferSource()
  s.buffer = b
  s.connect(ctx.destination)
  s.start(0)
  return ctx.state
}

// 앱이 백그라운드에서 돌아오면 다시 깨운다
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
  })
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

export const sfx = {
  tap() {
    if (!ctx) return
    tone(880, ctx.currentTime, 0.05)
  },
  correct() {
    if (!ctx) return
    const t = ctx.currentTime
    tone(784, t, 0.09)
    tone(1047, t + 0.09, 0.16)
  },
  sparkle() {
    if (!ctx) return
    const t = ctx.currentTime
    ;[1319, 1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.12, 'triangle', 0.06))
  },
  /** 틀렸을 때도 부드럽게: 낮은 두 음, 경고음 느낌 금지 */
  soft() {
    if (!ctx) return
    const t = ctx.currentTime
    tone(392, t, 0.12, 'triangle', 0.06)
    tone(440, t + 0.12, 0.14, 'triangle', 0.06)
  },
}
