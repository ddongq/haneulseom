// 미리 녹음한 대사(Chirp 3 HD, Aoede) 재생. 녹음이 없으면 기기 목소리로 대신 읽는다.
import { getAudioContext } from '../audio/sfx'
import { speak } from './tts'

interface Entry { file: string; text: string }

let index: Record<string, Entry> | null = null
let loading: Promise<void> | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()
let currentSrc: AudioBufferSourceNode | null = null

function loadIndex(): Promise<void> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}voice/index.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => { index = j })
      .catch(() => { index = {} })
  }
  return loading
}

function buffer(id: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext()
  // 오디오가 아직 잠겨 있으면(첫 탭 전) 캐시하지 않고 넘어간다: 잠금 해제 뒤 다시 받는다
  if (!ctx) return Promise.resolve(null)
  let p = buffers.get(id)
  if (!p) {
    p = (async () => {
      const e = index?.[id]
      if (!e) return null
      const r = await fetch(import.meta.env.BASE_URL + e.file)
      if (!r.ok) return null
      return ctx.decodeAudioData(await r.arrayBuffer())
    })().catch(() => null)
    buffers.set(id, p)
  }
  return p
}

export async function hasRecording(id: string): Promise<boolean> {
  await loadIndex()
  return !!index?.[id]
}

/** 다음에 쓸 대사를 미리 받아 둔다. */
export async function preload(ids: string[]) {
  await loadIndex()
  ids.forEach((id) => buffer(id))
}

export function stopVoice() {
  try { currentSrc?.stop() } catch { /* already stopped */ }
  currentSrc = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

/**
 * 대사 id로 말한다. fallbackText는 녹음이 없을 때 기기 목소리로 읽을 글.
 * 끝날 때 resolve.
 */
export async function say(id: string, fallbackText?: string): Promise<void> {
  await loadIndex()
  stopVoice()
  const buf = await buffer(id)
  const ctx = getAudioContext()
  if (buf && ctx) {
    return new Promise((res) => {
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.onended = () => res()
      currentSrc = src
      src.start()
    })
  }
  const text = fallbackText ?? index?.[id]?.text
  if (!text) return
  return speak(text, id.startsWith('e.') ? 'en-US' : 'ko-KR')
}

export async function voiceIds(): Promise<string[]> {
  await loadIndex()
  return Object.keys(index ?? {})
}
