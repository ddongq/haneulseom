// 논리 해상도 256×192 픽셀 화면을 정수 배율로 키워 그린다.
// 백킹 크기 = CSS 크기 × devicePixelRatio 이므로 image-rendering 지원 여부와 무관하게 선명하다.

export const LW = 256
export const LH = 192

/** 주어진 CSS 영역에 들어가는 가장 큰 정수 배율 (최소 1). */
export function fitScale(cssW: number, cssH: number): number {
  return Math.max(1, Math.floor(Math.min(cssW / LW, cssH / LH)))
}

export class Screen {
  readonly buf: HTMLCanvasElement
  readonly g: CanvasRenderingContext2D
  private out: CanvasRenderingContext2D
  scale = 1
  dpr = 1

  constructor(private canvas: HTMLCanvasElement) {
    this.buf = document.createElement('canvas')
    this.buf.width = LW
    this.buf.height = LH
    this.g = this.buf.getContext('2d')!
    this.g.imageSmoothingEnabled = false
    this.out = canvas.getContext('2d')!
  }

  resize(cssW: number, cssH: number) {
    this.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    this.scale = fitScale(cssW, cssH)
    const w = LW * this.scale
    const h = LH * this.scale
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.out.imageSmoothingEnabled = false
  }

  present() {
    this.out.imageSmoothingEnabled = false
    this.out.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height)
  }
}
