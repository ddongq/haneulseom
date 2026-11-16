import { useEffect, useRef } from 'preact/hooks'
import { Screen } from './screen'
import type { SkyScene } from './scene'

/** 캔버스 + 장면 루프. fps를 1초마다 알려 준다. */
export function PixelStage(props: { scene: SkyScene; onFps?: (fps: number, scale: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const screen = new Screen(canvas)
    const box = canvas.parentElement!
    const fit = () => screen.resize(box.clientWidth, box.clientHeight)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    let raf = 0
    let frames = 0
    let last = performance.now()
    const loop = (t: number) => {
      props.scene.draw(screen.g, t)
      screen.present()
      frames++
      if (t - last >= 1000) {
        props.onFps?.(Math.round((frames * 1000) / (t - last)), screen.scale)
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [props.scene])
  return (
    <div class="stage">
      <canvas ref={ref} />
    </div>
  )
}
