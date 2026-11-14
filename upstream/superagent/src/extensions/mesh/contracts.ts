/** Read-only M0 service surface; no Store or domain mutation capability. */
export interface MeshHealth {
  readonly state: 'ready' | 'blocked'
  readonly missing: readonly string[]
}
/** Host services used before creating Sessions or dispatching work. */
export const MESH_DEPENDENCIES = ['agents', 'sessionController', 'sessionPersistence', 'workspaceRegistry', 'permissionPresets', 'llm', 'subprocess', 'webServer', 'tools', 'systemPrompt', 'skills'] as const
