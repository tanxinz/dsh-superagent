/** M0 native SQLite/Effects probes: transaction rollback, SIGKILL recovery, payload generations and reactivation. */
import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Effects } from '../src/app/effects.ts'
import { Store } from '../src/app/store.ts'
import { HealthBoard } from '../src/infra/health.ts'

let directory: string
let path: string
let store: Store
let effects: Effects
let child: ChildProcess | undefined
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mesh-m0-'))
  path = join(directory, 'db.sqlite')
  store = new Store(path)
  store.atomic(() => { store.db.exec('CREATE TABLE mesh_m0_probe (id TEXT PRIMARY KEY, value TEXT NOT NULL)') })
  effects = new Effects(store, new HealthBoard(), () => 1000)
})
afterEach(async () => {
  if (child && child.exitCode === null && child.signalCode === null) { const ended = once(child, 'close'); child.kill('SIGKILL'); await ended }
  child = undefined
  await effects.drain()
  store.close()
  rmSync(directory, { recursive: true, force: true })
})
const rows = () => store.db.prepare('SELECT id, value FROM mesh_m0_probe ORDER BY id').all()
const nativeRows = () => store.db.prepare('SELECT key, value, generation, attempts, due FROM effect ORDER BY seq').all()
const insert = (id: string) => { store.db.prepare('INSERT INTO mesh_m0_probe VALUES (?, ?)').run(id, 'probe') }

it.each(['before-enqueue', 'before-commit'])('rolls back both native records on a synchronous fault at %s', async point => {
  const run = vi.fn(async () => {})
  effects.handle('relay', run); effects.start()
  expect(() => store.atomic(() => {
    insert('rollback')
    if (point === 'before-enqueue') throw new Error(point)
    effects.enqueue('relay', 'rollback', { text: 'probe' })
    throw new Error(point)
  })).toThrow(point)
  await effects.idle()
  expect(rows()).toEqual([]); expect(nativeRows()).toEqual([]); expect(run).not.toHaveBeenCalled()
})

it('rolls back the probe when the native enqueue itself fails', () => {
  const original = store.db.prepare.bind(store.db)
  const spy = vi.spyOn(store.db, 'prepare').mockImplementation(sql => {
    if (sql.includes('INSERT INTO effect')) throw new Error('injected enqueue failure')
    return original(sql)
  })
  try {
    expect(() => store.atomic(() => { insert('rollback'); effects.enqueue('relay', 'rollback', { text: 'probe' }) })).toThrow('enqueue failure')
  } finally { spy.mockRestore() }
  expect(rows()).toEqual([]); expect(nativeRows()).toEqual([])
})

it('rolls back a nested probe and effect when the outer transaction fails', () => {
  expect(() => store.atomic(() => {
    store.atomic(() => { insert('nested'); effects.enqueue('relay', 'nested', { text: 'probe' }) })
    throw new Error('outer failed')
  })).toThrow('outer failed')
  expect(rows()).toEqual([]); expect(nativeRows()).toEqual([])
})

it('persists both rows before dispatch and replays them from a reopened Store', async () => {
  store.atomic(() => { insert('commit'); effects.enqueue('relay', 'commit', { text: 'probe' }) })
  expect(rows()).toHaveLength(1); expect(nativeRows()).toHaveLength(1)
  await effects.drain(); store.close()
  store = new Store(path)
  effects = new Effects(store, new HealthBoard())
  const run = vi.fn(async () => {})
  effects.handle('relay', run); effects.start(); await effects.idle()
  expect(run.mock.calls).toEqual([[{ text: 'probe' }, 'commit']])
  expect(rows()).toHaveLength(1); expect(nativeRows()).toEqual([])
})

it('coalesces identical and conflicting waiting payloads and re-enqueues completed work', async () => {
  for (const text of ['same', 'same', 'changed']) effects.enqueue('relay', 'key', { text })
  expect(nativeRows()).toMatchObject([{ key: 'key', value: JSON.stringify({ text: 'changed' }), generation: 2 }])
  const run = vi.fn(async () => {})
  effects.handle('relay', run); effects.start(); await effects.idle()
  effects.enqueue('relay', 'key', { text: 'reactivated' }); await effects.idle()
  expect(run.mock.calls).toEqual([[{ text: 'changed' }, 'key'], [{ text: 'reactivated' }, 'key']])
})

it('resets failed work through native enqueue, with no terminal row or durable lease', async () => {
  let fail = true
  effects.handle('relay', async () => { if (fail) throw new Error('offline') }, { retry: [1000, 1000] })
  effects.enqueue('relay', 'key', { text: 'first' }); effects.start(); await effects.idle()
  expect(nativeRows()).toMatchObject([{ attempts: 1, due: 2000 }])
  effects.enqueue('relay', 'key', { text: 'second' })
  expect(nativeRows()).toMatchObject([{ attempts: 0, due: 1000, generation: 1 }])
  fail = false; await effects.idle(); expect(nativeRows()).toEqual([])
})

async function crashAt(point: string): Promise<void> {
  const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mesh-crash.ts')
  child = spawn(process.execPath, ['--experimental-transform-types', fixture, path, point, join(directory, 'witness')], { stdio: ['ignore', 'pipe', 'pipe'] })
  const current = child
  let stderr = ''
  current.stderr!.on('data', chunk => { stderr += String(chunk) })
  await new Promise<void>((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error(`Crash child timed out: ${stderr}`)), 8000)
    const finish = (error?: Error) => { clearTimeout(timeout); current.removeListener('error', fail); current.removeListener('exit', earlyExit); error ? reject(error) : resolve() }
    const fail = (error: Error) => finish(error)
    const earlyExit = () => finish(new Error(`Crash child exited early: ${stderr}`))
    current.once('error', fail); current.once('exit', earlyExit)
    current.stdout!.on('data', chunk => { output += String(chunk); if (output.includes('M0_CRASH_POINT')) finish() })
  })
  const ended = once(current, 'close'); current.kill('SIGKILL'); await ended
  expect(current.signalCode).toBe('SIGKILL')
}

it.each(['before-enqueue', 'before-commit', 'after-commit'])('recovers the actual SQLite database after SIGKILL at %s', async point => {
  await crashAt(point)
  expect(rows()).toHaveLength(point === 'after-commit' ? 1 : 0)
  expect(nativeRows()).toHaveLength(point === 'after-commit' ? 1 : 0)
  const run = vi.fn(async () => {})
  effects.handle('relay', run); effects.start(); await effects.idle()
  expect(run).toHaveBeenCalledTimes(point === 'after-commit' ? 1 : 0)
  expect(nativeRows()).toEqual([])
}, 12000)

it('proves in-flight ownership is volatile: a crash after an external effect permits duplicate execution', async () => {
  store.atomic(() => { insert('in-flight'); effects.enqueue('relay', 'in-flight', { text: 'probe' }) })
  await crashAt('in-flight')
  const witness = join(directory, 'witness')
  expect(readFileSync(witness, 'utf8')).toBe('executed\n')
  expect(nativeRows()).toHaveLength(1)
  effects.handle('relay', async () => { appendFileSync(witness, 'executed\n') })
  effects.start(); await effects.idle()
  expect(readFileSync(witness, 'utf8')).toBe('executed\nexecuted\n')
  expect(nativeRows()).toEqual([])
}, 12000)
