import { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it } from 'vitest'
import { installMeshM0 } from '../src/extensions/mesh/index.ts'

const roots: Context[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose())) })

function host() {
  const ctx = new Context()
  roots.push(ctx)
  const messages: string[] = []
  ctx.logger.exporter({ export: message => { messages.push(String(message.args[0])) } })
  return { ctx, messages }
}

it('installs once on the owning fiber and disposes once without disposing the host', async () => {
  const { ctx, messages } = host()
  const fiber = await ctx.plugin({ name: 'mesh-bridge-test', apply(child) {
    installMeshM0(child)
    installMeshM0(child)
  } })
  expect(messages).toEqual(['[cognitive-mesh] m0 bridge installed'])
  await fiber.dispose()
  await fiber.dispose()
  expect(messages).toEqual(['[cognitive-mesh] m0 bridge installed', '[cognitive-mesh] m0 bridge disposed'])
  expect(() => ctx.fiber.assertActive()).not.toThrow()
})

it('reinstalls and cleans up on plugin restart', async () => {
  const { ctx, messages } = host()
  const fiber = await ctx.plugin({ name: 'mesh-bridge-restart', apply: installMeshM0 })
  await fiber.restart()
  expect(messages).toEqual([
    '[cognitive-mesh] m0 bridge installed', '[cognitive-mesh] m0 bridge disposed',
    '[cognitive-mesh] m0 bridge installed',
  ])
  await fiber.dispose()
  expect(messages.filter(message => message.endsWith('disposed'))).toHaveLength(2)
})

it('keeps separate plugin lifetimes independent', async () => {
  const { ctx, messages } = host()
  const first = await ctx.plugin({ name: 'mesh-bridge-first', apply: installMeshM0 })
  const second = await ctx.plugin({ name: 'mesh-bridge-second', apply: installMeshM0 })
  await first.dispose()
  expect(messages.filter(message => message.endsWith('installed'))).toHaveLength(2)
  expect(messages.filter(message => message.endsWith('disposed'))).toHaveLength(1)
  await second.dispose()
  expect(messages.filter(message => message.endsWith('disposed'))).toHaveLength(2)
})

it('rejects installation after disposal', async () => {
  const { ctx } = host()
  let disposed: Context | undefined
  const fiber = await ctx.plugin({ name: 'mesh-bridge-disposed', apply(child) { disposed = child } })
  await fiber.dispose()
  expect(disposed).toBeDefined()
  expect(() => installMeshM0(disposed!)).toThrow('cannot create effect on inactive context')
})
