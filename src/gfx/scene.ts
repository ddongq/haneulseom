import { PAL } from './palette'
import { LW, LH } from './screen'
import { bake } from './sprite'
import { PORONG, PORONG_BLINK, PORONG_ROLES } from '../sprites/porong'

// 시작 화면: 하늘(디더링 띠) + 떠 있는 섬 + 구름 + 포롱 + 반짝이 파티클

interface Particle { x: number; y: number; vx: number; vy: number; life: number; c: string }

// 결정적 의사난수 (시드 고정 → 매번 같은 하늘)
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export class SkyScene {
  private porong = bake(PORONG, PORONG_ROLES)
  private porongBlink = bake(PORONG_BLINK, PORONG_ROLES)
  private sky: HTMLCanvasElement
  private particles: Particle[] = []
  private rand = rng(7)
  stressCount = 0

  constructor() {
    this.sky = this.paintSky()
  }

  private paintSky(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = LW
    c.height = LH
    const g = c.getContext('2d')!
    const bands = [PAL.night, PAL.navy, PAL.dusk, PAL.sky, PAL.skyLight]
    const bandH = LH / bands.length
    bands.forEach((col, i) => {
      g.fillStyle = col
      g.fillRect(0, Math.floor(i * bandH), LW, Math.ceil(bandH))
      // 띠 경계 4px 디더링
      if (i > 0) {
        g.fillStyle = bands[i - 1]
        const y0 = Math.floor(i * bandH)
        for (let y = y0; y < y0 + 4; y++)
          for (let x = (y % 2); x < LW; x += 2 + (y - y0)) g.fillRect(x, y, 1, 1)
      }
    })
    // 별
    const r = rng(42)
    g.fillStyle = PAL.cloud
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(r() * LW), Math.floor(r() * LH * 0.45), 1, 1)
    // 뒤쪽 구름
    for (const [cx, cy, w] of [[40, 70, 36], [200, 55, 44], [140, 96, 30]] as const) this.cloud(g, cx, cy, w)
    // 섬
    this.island(g, 128, 150, 70)
    this.island(g, 36, 120, 22)
    this.island(g, 222, 112, 26)
    return c
  }

  private cloud(g: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
    g.fillStyle = PAL.cloudShade
    g.fillRect(cx - w / 2, cy, w, 6)
    g.fillStyle = PAL.cloud
    g.fillRect(cx - w / 2 + 2, cy - 4, w - 4, 6)
    g.fillRect(cx - w / 4, cy - 8, w / 2, 6)
  }

  private island(g: CanvasRenderingContext2D, cx: number, top: number, halfW: number) {
    // 흙(아래로 좁아지는 역삼각) + 풀 윗면
    for (let y = 0; y < halfW * 0.7; y++) {
      const hw = Math.floor(halfW * (1 - y / (halfW * 0.7)))
      g.fillStyle = y % 6 < 3 ? PAL.soil : PAL.soilDark
      g.fillRect(cx - hw, top + 4 + y, hw * 2, 1)
    }
    g.fillStyle = PAL.grassDark
    g.fillRect(cx - halfW, top + 2, halfW * 2, 3)
    g.fillStyle = PAL.grass
    g.fillRect(cx - halfW + 1, top, halfW * 2 - 2, 3)
  }

  burst(x: number, y: number, n = 24) {
    const cols = [PAL.sun, PAL.cloud, PAL.peach, PAL.crystal]
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2
      const sp = 0.4 + this.rand() * 1.4
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life: 40 + this.rand() * 30, c: cols[i % cols.length] })
    }
  }

  draw(g: CanvasRenderingContext2D, t: number) {
    g.drawImage(this.sky, 0, 0)
    // 포롱: 둥실둥실 (2px 상하), 3.2초마다 깜빡
    const bob = Math.round(Math.sin(t / 500) * 2)
    const blink = t % 3200 < 140
    // 원래 크기(16×16)로 그린다: 한 화면 안 픽셀 밀도를 섞지 않는다
    g.drawImage(blink ? this.porongBlink : this.porong, 128 - 8, 150 - 15 + bob)
    // 성능 시험용 상시 파티클
    while (this.particles.length < this.stressCount) this.burst(this.rand() * LW, this.rand() * LH, 1)
    // 파티클
    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.03
      p.life--
      g.fillStyle = p.c
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < LH)
  }

  get particleCount() {
    return this.particles.length
  }
}
