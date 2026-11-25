import { Copy, Download, Eye, EyeOff, GitCommit, KeyRound, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_REMOTE_URL, type RemoteRecordsSnapshot } from '../remote'
import { loadRemoteToken, saveRemoteToken } from '../storage'
import type { OvertimeRecord } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'

type RemoteControlProps = {
  records: OvertimeRecord[]
  onLoad: () => Promise<RemoteRecordsSnapshot>
  onLoaded: (snapshot: RemoteRecordsSnapshot) => void
  onSave: (token: string) => Promise<void>
}

export function RemoteControl({ records, onLoad, onLoaded, onSave }: RemoteControlProps) {
  const [openMode, setOpenMode] = useState<'configure' | 'save' | null>(null)
  const [token, setToken] = useState(() => loadRemoteToken())
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [message, setMessage] = useState('')
  const [pendingSnapshot, setPendingSnapshot] = useState<RemoteRecordsSnapshot | null>(null)

  const applyLoaded = (snapshot: RemoteRecordsSnapshot) => {
    onLoaded(snapshot)
    const fallbackHint = snapshot.usedTokenFallback ? ' · 匿名读取无权限，已改用 Token' : ''
    setMessage(`已读取 ${snapshot.records.length} 条记录（v${snapshot.version}）${fallbackHint}`)
  }

  const copyToken = async () => {
    const trimmed = token.trim()
    if (!trimmed) return
    try {
      await navigator.clipboard.writeText(trimmed)
      setMessage('Token 已复制到剪贴板')
    } catch {
      setMessage('复制失败，请手动选中复制')
    }
  }

  const load = async () => {
    setBusy('load'); setMessage('')
    try {
      const remoteSnapshot = await onLoad()
      if (records.length) {
        setPendingSnapshot(remoteSnapshot)
        return
      }
      applyLoaded(remoteSnapshot)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取失败')
    } finally { setBusy(null) }
  }

  const save = async () => {
    setBusy('save'); setMessage('')
    try {
      saveRemoteToken(token)
      await onSave(token)
      setOpenMode(null)
      setMessage('已提交到 GitHub')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally { setBusy(null) }
  }

  const configureToken = () => {
    saveRemoteToken(token)
    setOpenMode(null)
    setMessage('GitHub Token 已保存到当前浏览器')
  }

  const clearToken = () => {
    setToken('')
    saveRemoteToken('')
    setOpenMode(null)
    setMessage('已从本机浏览器清除 Token')
  }

  const handleSaveClick = () => {
    if (token.trim()) void save()
    else setOpenMode('save')
  }

  const isConfiguring = openMode === 'configure'

  return <>
    <div className="remote-actions" title={DEFAULT_REMOTE_URL}>
      <button className="remote-button" type="button" onClick={() => void load()} disabled={busy !== null}><Download size={14} />{busy === 'load' ? '读取中' : '读取 GitHub'}</button>
      <button className="remote-button" type="button" onClick={() => setOpenMode('configure')} disabled={busy !== null}><KeyRound size={14} />配置 Token</button>
      <button className="remote-button remote-button--save" type="button" onClick={handleSaveClick} disabled={busy !== null}><GitCommit size={14} />{busy === 'save' ? '保存中' : '保存 GitHub'}</button>
    </div>
    {message && <span className="remote-message" role="status">{message}</span>}

    {openMode && <Modal onClose={() => setOpenMode(null)} backdropClassName="sync-modal-backdrop" panelClassName="sync-modal" ariaLabel={isConfiguring ? '配置 GitHub Token' : '保存到 GitHub'}>
      <header className="sync-modal__header">
        <div><span className="section-kicker">GITHUB ACCESS</span><h2>{isConfiguring ? '配置 GitHub Token' : '保存到项目仓库'}</h2></div>
        <button className="icon-button" type="button" onClick={() => setOpenMode(null)} aria-label="关闭"><X size={18} /></button>
      </header>
      <p className="sync-modal__message">{isConfiguring
        ? '配置后，新增、编辑和删除记录会自动同步到 GitHub。Token 会保存在本机浏览器里，关闭页面后仍然保留 —— 这是静态站点，任何注入脚本都能读到它，所以请把 Token 的权限限制到这个仓库的 Contents 读写，共用电脑上用完请清除。'
        : `将把 ${records.length} 条记录提交到 data/overtime-records.json，并先校验远程版本。`}</p>
      <div className="sync-field">
        <label htmlFor="github-token">Fine-grained GitHub Token</label>
        <TokenSecretField value={token} onChange={setToken} onCopy={() => void copyToken()} />
      </div>
      <div className="sync-actions">
        {isConfiguring && token.trim() && <button className="secondary-button" type="button" onClick={clearToken}><Trash2 size={15} />清除 Token</button>}
        <button className="secondary-button" type="button" onClick={() => setOpenMode(null)}>取消</button>
        {isConfiguring
          ? <button className="primary-button" type="button" onClick={configureToken} disabled={!token.trim()}><KeyRound size={15} />保存 Token</button>
          : <button className="primary-button" type="button" onClick={() => void save()} disabled={!token.trim() || busy !== null}><Save size={15} />{busy === 'save' ? '提交中' : '提交 JSON'}</button>}
      </div>
    </Modal>}

    {pendingSnapshot && <ConfirmDialog
      title="覆盖当前本地记录？"
      description={`远程数据共 ${pendingSnapshot.records.length} 条，将替换当前本地的 ${records.length} 条记录。`}
      confirmLabel="覆盖本地"
      onConfirm={() => { applyLoaded(pendingSnapshot); setPendingSnapshot(null) }}
      onCancel={() => { setPendingSnapshot(null); setMessage('已取消覆盖，本地记录未变') }}
    />}
  </>
}

export function TokenSecretField({ value, onChange, onCopy }: { value: string; onChange: (value: string) => void; onCopy: () => void }) {
  const [isVisible, setIsVisible] = useState(false)
  return <div className="sync-secret">
    <input id="github-token" type={isVisible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder="粘贴 Token" autoComplete="off" />
    <div className="sync-secret__buttons">
      <button className="sync-secret__button" type="button" onClick={() => setIsVisible((visible) => !visible)} aria-label={isVisible ? '隐藏 Token' : '显示 Token'} title={isVisible ? '隐藏 Token' : '显示 Token'}>{isVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      <button className="sync-secret__button" type="button" onClick={onCopy} disabled={!value.trim()} aria-label="复制 Token" title="复制 Token"><Copy size={16} /></button>
    </div>
  </div>
}
