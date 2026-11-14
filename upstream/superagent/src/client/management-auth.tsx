/** Page-local management login; the credential is never persisted or put in navigation URLs. */
import { useEffect, useState, type ReactNode } from 'react'
import { setManagementCredential } from './api.ts'

export function ManagementAuth({ children }: { children: ReactNode }) {
  const [credential, setCredential] = useState(''), [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  useEffect(() => () => { setManagementCredential('') }, [])
  if (unlocked) return <><button type="button" onClick={() => {
    setManagementCredential(''); setUnlocked(false); setCredential('')
  }}>锁定管理面板 / Lock management panel</button>{children}</>
  return <form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setFailed(false)
    try {
      const response = await fetch('/orchestrator/api/mesh/security', { headers: {
        'x-orchestrator-request': '1', authorization: `Bearer ${credential}`,
      }, signal: AbortSignal.timeout(10000) })
      if (!response.ok) { setFailed(true); return }
      setManagementCredential(credential); setCredential(''); setUnlocked(true)
    } catch { setFailed(true) } finally { setBusy(false) }
  }}>
    <label>管理凭据 / Management credential <input type="password" autoComplete="off" required
      value={credential} onChange={event => { setCredential(event.target.value) }} /></label>
    <button type="submit" disabled={busy}>解锁 / Unlock</button>
    {failed && <p role="alert">无法认证或服务尚未就绪 / Authentication failed or service unavailable</p>}
  </form>
}
