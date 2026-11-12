import { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it } from 'vitest'
import { CognitiveMeshService } from '../src/extensions/mesh/service.ts'
import { MESH_DEPENDENCIES } from '../src/extensions/mesh/contracts.ts'
const roots: Context[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose())) })
function host() {
  const ctx = new Context(); roots.push(ctx)
  for (const name of MESH_DEPENDENCIES) if (name !== 'sessionController') ctx.reflect.provide(name, {})
  ctx.reflect.provide('sessionController', {})
  return ctx
}
it('registers through the native Service and is actually called by an injected consumer', async () => {
  const ctx = host()
  const provider = await ctx.plugin(CognitiveMeshService)
  let consumed = false
  const consumer = await ctx.plugin({ name: 'mesh-consumer', inject: ['cognitiveMesh'], apply(child) {
    child.cognitiveMesh.assertReady()
    expect(child.cognitiveMesh.health()).toEqual({ state: 'ready', missing: [] })
    consumed = true
  } })
  expect(consumed).toBe(true)
  const retained = ctx.cognitiveMesh
  await provider.dispose()
  expect(() => retained.assertReady()).toThrow('owning-fiber')
  expect(ctx.get('cognitiveMesh')).toBeUndefined()
  await consumer.dispose()
})
it.each(MESH_DEPENDENCIES)('refuses missing %s and becomes usable only after restoration', missing => {
  const ctx = new Context(); roots.push(ctx)
  for (const name of MESH_DEPENDENCIES) if (name !== missing) ctx.reflect.provide(name, {})
  const service = new CognitiveMeshService(ctx)
  expect(() => service.assertReady()).toThrow(missing)
  expect(service.health().state).toBe('blocked')
  ctx.reflect.provide(missing, {})
  expect(() => service.assertReady()).not.toThrow()
})
it('rejects retained handles after Runtime shutdown even while the host fiber lives', () => {
  const ctx = host(); const lifetime = new AbortController()
  const service = new CognitiveMeshService(ctx, { lifetime: lifetime.signal })
  lifetime.abort()
  expect(() => service.assertReady()).toThrow('runtime-lifetime')
  expect(service).not.toHaveProperty('store')
})

it('can consume its own service during native plugin loading before publication', async () => {
  const ctx = host()
  let checked = false
  await ctx.plugin({ name: 'mesh-startup-consumer', apply(child) {
    new CognitiveMeshService(child)
    expect(child.get('cognitiveMesh')).toBeUndefined()
    child.get('cognitiveMesh', false)!.assertReady()
    checked = true
  } })
  expect(checked).toBe(true)
  expect(ctx.cognitiveMesh.health().state).toBe('ready')
})
