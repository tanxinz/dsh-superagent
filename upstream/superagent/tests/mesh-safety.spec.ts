import { Context } from '@deepseek-ai/cordis'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { Store } from '../src/app/store.ts'
import { MeshSecurityStore } from '../src/extensions/mesh/security-store.ts'
import { LocalSafetyGate, effectiveAllows, type SafetyBinding, type PermissionSet } from '../src/extensions/mesh/safety.ts'

let directory: string, store: Store, facts: MeshSecurityStore, lifetime: AbortController, gate: LocalSafetyGate
const permissions = (): PermissionSet => ({ tools: { allow: ['probe'], deny: [] }, resources: { allow: ['fixture'], deny: [] }, environments: { allow: ['SANDBOX'], deny: [] } })
const binding = (sessionId = 'root'): SafetyBinding => ({ sessionId, tenantId: 'a', actorRef: 'worker', role: 'worker', expiresAt: 2000,
  identityVersion: 1, safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 0, trusted: permissions(), current: permissions() })
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mesh-gate-')); store = new Store(join(directory, 'state.sqlite'))
  facts = new MeshSecurityStore(store); lifetime = new AbortController(); gate = new LocalSafetyGate(facts, lifetime.signal, () => 1000)
  facts.grant({ tenantId: 'a', actorRef: 'worker', roles: ['worker'], expiresAt: 2000, version: 1 })
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 0 })
})
afterEach(() => { try { store.close() } catch {} rmSync(directory, { recursive: true, force: true }) })

it('requires every allow and removes every deny, separately for tool, resource and environment', () => {
  expect(effectiveAllows('x', { allow: ['x'], deny: [] }, { allow: ['x'], deny: ['x'] })).toBe(false)
  expect(effectiveAllows('x', undefined)).toBe(false)
  expect(effectiveAllows('x')).toBe(false)
  facts.bind(binding()); expect(() => gate.assert('root', 'probe', 'fixture', 'SANDBOX')).not.toThrow()
  for (const [tool, resource, env] of [['other', 'fixture', 'SANDBOX'], ['probe', 'other', 'SANDBOX'], ['probe', 'fixture', 'ACTIVE']]) {
    expect(() => gate.assert('root', tool!, resource!, env!)).toThrow('Mesh safety denied')
  }
  expect(gate.executionReady()).toBe(false)
})
it('persists exact bindings and refuses conflicting Session reuse, expiry, tenant mismatch and parent denial', () => {
  const parent = binding('parent'), child = { ...binding('child'), parentSessionId: 'parent' }
  facts.bind({ ...parent, current: { ...permissions(), tools: { allow: ['probe'], deny: ['probe'] } } })
  facts.bind(child)
  expect(() => gate.assert('child', 'probe', 'fixture', 'SANDBOX')).toThrow()
  expect(() => facts.bind({ ...child, actorRef: 'other' })).toThrow('Conflicting')
  facts.bind({ ...binding('expired'), expiresAt: 1000 }); expect(() => gate.assert('expired', 'probe', 'fixture', 'SANDBOX')).toThrow()
  facts.bind({ ...binding('foreign'), tenantId: 'b', parentSessionId: 'parent' }); expect(() => gate.assert('foreign', 'probe', 'fixture', 'SANDBOX')).toThrow()
  store.close(); store = new Store(join(directory, 'state.sqlite')); facts = new MeshSecurityStore(store)
  expect(facts.binding('child')).toEqual(child)
})
it('rejects missing, cyclic, revoked and unloaded bindings; failed audit cannot allow a direct gateway body', () => {
  facts.bind({ ...binding('cycle'), parentSessionId: 'cycle' })
  expect(() => gate.assert('cycle', 'probe', 'fixture', 'SANDBOX')).toThrow()
  facts.bind(binding()); facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 })
  expect(() => gate.assert('root', 'probe', 'fixture', 'SANDBOX')).toThrow()
  let entered = 0
  const gateway = () => { gate.assert('missing', 'probe', 'fixture', 'SANDBOX'); entered++ }
  expect(gateway).toThrow(); expect(entered).toBe(0)
  store.db.exec('DROP TABLE mesh_gate_audit'); expect(gateway).toThrow(); expect(entered).toBe(0)
})
it('uses the real native ToolRuntime final guard after permissive pre-listeners; denied tool body never runs', async () => {
  const ctx = new Context()
  ctx.reflect.provide('systemPrompt', { tools: () => () => {} })
  const tools = new ToolRuntime(ctx)
  let entered = 0
  tools.register({ name: 'probe', description: 'Harmless counter', parameters: { type: 'object', properties: {} },
    output: { schema: { type: 'number' }, render: () => [] }, execute: async () => ++entered })
  tools.guard(exec => gate.refusal('root', exec.name, 'fixture', 'SANDBOX'))
  ctx.on('tools/pre-execute', async () => ({ kind: 'allow' as const }))
  const execute = () => tools.execute({ callId: ToolCallId('guard-probe'), name: 'probe', arguments: {}, signal: lifetime.signal })
  expect((await execute()).isError).toBe(true); expect(entered).toBe(0)
  facts.bind(binding()); expect((await execute()).isError).not.toBe(true); expect(entered).toBe(1)
  facts.setPolicy({ tenantId: 'a', safetyPolicyVersion: 'v1', emergencyRevocationEpoch: 1 })
  expect((await execute()).isError).toBe(true); expect(entered).toBe(1)
  expect(facts.auditCount('a')).toBeGreaterThanOrEqual(1)
  await ctx.fiber.dispose()
})
