import { TriangleAlert } from 'lucide-react'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return <Modal onClose={onCancel} backdropClassName="confirm-backdrop" panelClassName="overwrite-dialog" labelledBy="confirm-dialog-title">
    <div className="overwrite-dialog__icon"><TriangleAlert size={20} /></div>
    <div>
      <strong id="confirm-dialog-title">{title}</strong>
      <p>{description}</p>
      <div className="overwrite-dialog__actions">
        <button className="secondary-button" type="button" onClick={onCancel}>取消</button>
        <button className="primary-button" type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </Modal>
}
