import { useEffect, useRef } from 'preact/hooks'
import { bake, type Roles, type SpriteDef } from './sprite'

/** DOM 안에 스프라이트 하나를 정수 배율로 그린다 (결과 화면, 도감 등) */
export function SpriteImg(props: { def: SpriteDef; roles: Roles; scale: number; class?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    const k = props.scale * dpr
    c.width = props.def.w * k
    c.height = props.def.h * k
    const g = c.getContext('2d')!
    g.imageSmoothingEnabled = false
    g.drawImage(bake(props.def, props.roles), 0, 0, c.width, c.height)
  }, [props.def, props.roles, props.scale])
  return (
    <canvas
      ref={ref}
      class={props.class}
      style={{ width: `${props.def.w * props.scale}px`, height: `${props.def.h * props.scale}px` }}
    />
  )
}
