import { Cloud, CloudOff, KeyRound, RefreshCw, Unplug, X } from 'lucide-react'
import { useState } from 'react'
import type { SyncStatus } from '../sync/controller'

type SyncControlProps = {
  status: SyncStatus
  message: string
  workerUrl: string
  isPasswordConfigured: boolean
  onConnect: (url: string, password: string) => Promise<void>
  onDisconnect: () => void
  onSync: () => Promise<void>
}

const statusLabel: Record<SyncStatus, string> = {
  disconnected: '未连接', syncing: '同步中', synced: '已同步', pending: '待同步', conflict: '有冲突', unauthorized: '需验证',
}

export function SyncControl({ status, message, workerUrl, isPasswordConfigured, onConnect, onDisconnect, onSync }: SyncControlProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(workerUrl)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    if (!url.trim() || !password.trim()) return
    setBusy(true)
    try {
      await onConnect(url, password)
      setPassword('')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button className={`sync-status sync-status--${status}`} type="button" onClick={() => setOpen(true)} title={message} aria-label={`云端同步：${statusLabel[status]}`}>
      {status === 'disconnected' ? <CloudOff size={15} /> : <Cloud size={15} />}
      <span>{statusLabel[status]}</span>
    </button>
    {open && <div className="sync-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="sync-modal" role="dialog" aria-modal="true" aria-label="云端同步设置">
        <header className="sync-modal__header"><div><span className="section-kicker">CLOUD SYNC</span><h2>连接私有数据</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="关闭同步设置"><X size={18} /></button></header>
        <p className="sync-modal__message">{message}</p>
        <label className="sync-field"><span>Worker 地址</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://your-worker.workers.dev" /></label>
        <label className="sync-field"><span>同步密码</span><div className="input-wrap"><KeyRound size={16} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isPasswordConfigured ? '输入新密码以重新验证' : '输入 Worker 同步密码'} /></div></label>
        <div className="sync-actions"><button className="secondary-button" type="button" onClick={onDisconnect}><Unplug size={15} />断开</button><button className="secondary-button" type="button" onClick={() => void onSync()} disabled={busy}><RefreshCw size={15} />立即同步</button><button className="primary-button" type="button" onClick={() => void connect()} disabled={busy}>{busy ? '连接中…' : '连接云端'}</button></div>
      </section>
    </div>}
  </>
}
