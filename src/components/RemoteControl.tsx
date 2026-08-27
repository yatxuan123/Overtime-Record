import { Download, GitCommit, Save, X } from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_REMOTE_URL, type RemoteRecordsSnapshot } from '../remote'
import { loadRemoteToken, saveRemoteToken } from '../storage'
import type { OvertimeRecord } from '../types'

type RemoteControlProps = {
  records: OvertimeRecord[]
  onLoad: () => Promise<RemoteRecordsSnapshot>
  onLoaded: (snapshot: RemoteRecordsSnapshot) => void
  onSave: (token: string) => Promise<void>
}

export function RemoteControl({ records, onLoad, onLoaded, onSave }: RemoteControlProps) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState(() => loadRemoteToken(window.sessionStorage))
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    setBusy('load'); setMessage('')
    try {
      const remoteSnapshot = await onLoad()
      if (records.length && !window.confirm(`远程数据共 ${remoteSnapshot.records.length} 条，将替换当前本地记录，继续吗？`)) return
      onLoaded(remoteSnapshot)
      setMessage(`已读取 ${remoteSnapshot.records.length} 条记录（v${remoteSnapshot.version}）`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取失败')
    } finally { setBusy(null) }
  }

  const save = async () => {
    setBusy('save'); setMessage('')
    try {
      saveRemoteToken(window.sessionStorage, token)
      await onSave(token)
      setOpen(false)
      setMessage('已提交到 GitHub')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally { setBusy(null) }
  }

  return <>
    <div className="remote-actions" title={DEFAULT_REMOTE_URL}>
      <button className="remote-button" type="button" onClick={() => void load()} disabled={busy !== null}><Download size={14} />{busy === 'load' ? '读取中' : '读取 GitHub'}</button>
      <button className="remote-button remote-button--save" type="button" onClick={() => setOpen(true)} disabled={busy !== null}><GitCommit size={14} />保存 GitHub</button>
    </div>
    {message && <span className="remote-message" role="status">{message}</span>}
    {open && <div className="sync-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="sync-modal" role="dialog" aria-modal="true" aria-label="保存到 GitHub">
        <header className="sync-modal__header"><div><span className="section-kicker">GITHUB COMMIT</span><h2>保存到项目仓库</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="关闭"><X size={18} /></button></header>
        <p className="sync-modal__message">将把 {records.length} 条记录提交到 `data/overtime-records.json`。Token 只保存在本次浏览器会话，关闭浏览器后自动失效。</p>
        <label className="sync-field"><span>Fine-grained GitHub Token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="粘贴 Token" autoComplete="off" /></label>
        <div className="sync-actions"><button className="secondary-button" type="button" onClick={() => setOpen(false)}>取消</button><button className="primary-button" type="button" onClick={() => void save()} disabled={!token.trim() || busy !== null}><Save size={15} />{busy === 'save' ? '提交中' : '提交 JSON'}</button></div>
      </section>
    </div>}
  </>
}
