// 아주 작은 IndexedDB 키-값 저장소 + 영구 저장 요청 + JSON 백업.

const DB_NAME = 'haneulseom'
const STORE = 'kv'
export const SCHEMA_VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => res(req.result)
    t.onerror = () => rej(t.error)
  })
}

export const kv = {
  get: <T>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, val: unknown) => tx('readwrite', (s) => s.put(val, key)),
  del: (key: string) => tx('readwrite', (s) => s.delete(key)),
  async all(): Promise<Record<string, unknown>> {
    const db = await open()
    return new Promise((res, rej) => {
      const out: Record<string, unknown> = {}
      const t = db.transaction(STORE, 'readonly')
      const cur = t.objectStore(STORE).openCursor()
      cur.onsuccess = () => {
        const c = cur.result
        if (c) {
          out[String(c.key)] = c.value
          c.continue()
        }
      }
      t.oncomplete = () => res(out)
      t.onerror = () => rej(t.error)
    })
  },
}

export async function requestPersist(): Promise<boolean | 'unsupported'> {
  if (!navigator.storage?.persist) return 'unsupported'
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** 실행 기록: 앱이 며칠 동안 데이터를 잃지 않는지 확인용 */
export async function recordLaunch(): Promise<{ count: number; first: string }> {
  const prev = (await kv.get<{ count: number; first: string }>('launches')) ?? { count: 0, first: new Date().toISOString() }
  const next = { count: prev.count + 1, first: prev.first }
  await kv.set('launches', next)
  return next
}

export interface Backup {
  app: 'haneulseom'
  schema: number
  exportedAt: string
  data: Record<string, unknown>
}

export async function exportBackup(): Promise<void> {
  const payload: Backup = { app: 'haneulseom', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: await kv.all() }
  const name = `하늘섬-백업-${payload.exportedAt.slice(0, 10)}.json`
  const file = new File([JSON.stringify(payload, null, 2)], name, { type: 'application/json' })
  // iPad 홈 화면 앱에서는 공유 시트(파일에 저장)가 가장 확실하다
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name })
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export function parseBackup(text: string): Backup {
  const b = JSON.parse(text) as Backup
  if (b.app !== 'haneulseom' || typeof b.schema !== 'number' || typeof b.data !== 'object') throw new Error('하늘섬 백업 파일이 아니에요')
  if (b.schema > SCHEMA_VERSION) throw new Error('더 새 버전 앱에서 만든 백업이에요. 앱을 먼저 업데이트해 주세요')
  return b
}

export async function importBackup(text: string): Promise<number> {
  const b = parseBackup(text)
  const entries = Object.entries(b.data)
  for (const [k, v] of entries) await kv.set(k, v)
  return entries.length
}
