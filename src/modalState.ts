export type RecordModalState = { isOpen: boolean; editingId: string | null }

export function closedRecordModalState(): RecordModalState {
  return { isOpen: false, editingId: null }
}
