/** Real child process for the M0 SQLite/Effects crash probes; never starts an agent or uses credentials. */
import { appendFileSync } from 'node:fs'
import { Effects } from '../../src/app/effects.ts'
import { Store } from '../../src/app/store.ts'
import { HealthBoard } from '../../src/infra/health.ts'

const [path, point, witness] = process.argv.slice(2)
if (!path || !point || !witness) throw new Error('Missing crash probe arguments')
const store = new Store(path)
const effects = new Effects(store, new HealthBoard(), () => 1000)
// This timer keeps a committed or in-flight child alive until its parent kills it.
setInterval(() => {}, 1000)
const pause = (): never => {
  process.stdout.write('M0_CRASH_POINT\n')
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0)
  throw new Error('Unexpected wakeup')
}
if (point === 'in-flight') {
  effects.handle('relay', async () => { appendFileSync(witness, 'executed\n'); pause() })
  effects.start()
} else {
  store.atomic(() => {
    store.db.prepare('INSERT INTO mesh_m0_probe (id, value) VALUES (?, ?)').run('crash', 'committed')
    if (point === 'before-enqueue') pause()
    effects.enqueue('relay', 'mesh-m0:crash', { text: 'probe' })
    if (point === 'before-commit') pause()
  })
  pause()
}
