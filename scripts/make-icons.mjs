// 앱 아이콘을 코드로 만든다: src/sprites/porong.ts 의 픽셀맵을 읽어 PNG로 굽는다.
// 사용: node scripts/make-icons.mjs  → public/icons/icon-{180,192,512}.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const src = readFileSync(new URL('../src/sprites/porong.ts', import.meta.url), 'utf8')
const block = src.slice(src.indexOf('defineSprite(['), src.indexOf('])'))
const rows = [...block.matchAll(/'([.A-Z]{16})'/g)].map((m) => m[1])
if (rows.length !== 16) throw new Error(`expected 16 rows, got ${rows.length}`)

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const roles = { O: '#2b3466', W: '#f4f6ff', S: '#c5cde8', K: '#1a1a2e', P: '#ffb3a7', M: '#1a1a2e' }
const BG = hex('#6e8fd8')
const BG2 = hex('#a9c6f2')

// 24×24 아이콘 격자: 하늘 배경 + 아래쪽 섬 + 가운데 포롱
const G = 24
const grid = Array.from({ length: G }, (_, y) => Array.from({ length: G }, () => (y < 12 ? BG : BG2)))
for (let x = 3; x < 21; x++) grid[20][x] = hex('#5fbf6a')
for (let x = 4; x < 20; x++) grid[21][x] = hex('#3a8a55')
for (let y = 22; y < 24; y++) for (let x = 6 + (y - 22) * 2; x < 18 - (y - 22) * 2; x++) grid[y][x] = hex('#9a6b4f')
rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') grid[y + 4][x + 4] = hex(roles[ch]) }))

function png(size) {
  const k = size / G
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = grid[Math.min(G - 1, Math.floor(y / k))][Math.min(G - 1, Math.floor(x / k))]
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const s of [180, 192, 512]) writeFileSync(new URL(`icon-${s}.png`, out), png(s))
console.log('icons written')
