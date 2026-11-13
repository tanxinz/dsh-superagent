import { expect, it, vi } from 'vitest'
import { RestrictedSessions } from '../src/extensions/mesh/restricted-session.ts'

function host() {
  let current = 'danger-full-access'
  const presets = { resolve: vi.fn(() => ({ sandbox: 'read-only', approval: 'ask' })),
    current: vi.fn(() => current), set: vi.fn((_session: unknown, name: string) => { current = name }) }
  const lifetime = new AbortController(), guard = new RestrictedSessions({ permissionPresets: presets } as never, lifetime.signal)
  const agent = { id: 'managed', session: {} } as never
  return { presets, lifetime, guard, agent, change: (value: string) => { current = value } }
}
it('reduces new/restored sessions to read-only and verifies actual effective facts', () => {
  const { presets, guard, agent } = host()
  guard.apply(agent)
  expect(presets.set).toHaveBeenCalledExactlyOnceWith((agent as { session: object }).session, 'read-only')
  expect(guard.refusal(agent)).toBeUndefined()
})
it('refuses same-ID replacement, role-related overrides and unsafe definitions before executing work', () => {
  const { presets, guard, agent, change } = host(); guard.apply(agent)
  change('danger-full-access')
  expect(() => guard.apply({ ...(agent as object) } as never)).toThrow('permission override')
  expect(guard.refusal(agent)).toContain('denied')
  change('read-only'); presets.resolve.mockReturnValue({ sandbox: 'danger-full-access', approval: 'never' })
  expect(() => guard.apply(agent)).toThrow('definition is unsafe')
})
it('does not accept a setter which leaves the effective state unrestricted, and refuses disposed owners', () => {
  const { guard, agent, presets, lifetime } = host()
  presets.set.mockImplementation(() => {})
  expect(() => guard.apply(agent)).toThrow('permission override')
  lifetime.abort()
  expect(guard.refusal(agent)).toContain('owner stopped')
})
