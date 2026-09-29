export type TaxiProvider = 'taxi' | 'didi' | 'amap' | 'other' | ''
export type ReimbursementStatus = 'unsubmitted' | 'submitted' | 'rejected' | 'paid'
export type ReimbursementBatchStatus = 'draft' | 'submitted' | 'rejected' | 'paid'
export type ReconciliationStatus = 'unrecorded' | 'matched' | 'short_paid' | 'overpaid'

export type OvertimeRecord = {
  id: string
  date: string
  tookTaxi: boolean
  taxiCost: number
  taxiProvider?: TaxiProvider
  taxiProviderOther?: string
  reimbursementStatus?: ReimbursementStatus
  reimbursementPaidAt?: string
  reimbursementBatchId?: string
  note: string
  // 旧版本字段仅用于兼容历史 JSON，不再参与展示或统计。
  hours?: number
  leaveTime?: string
}

export type ReimbursementBatch = {
  id: string
  periodStart: string
  periodEnd: string
  recordIds: string[]
  expectedAmount: number
  submittedAt?: string
  actualPaidAmount?: number
  paidAt?: string
  status: ReimbursementBatchStatus
  reconciliation?: ReconciliationStatus
  note?: string
}

export type ReimbursementPolicy = {
  mode: 'legacy' | 'batch'
  lastClaimDate?: string
  nextClaimDate?: string
}

export type ReimbursementSnapshot = {
  records: OvertimeRecord[]
  reimbursementBatches: ReimbursementBatch[]
  reimbursementPolicy: ReimbursementPolicy
}

export type RecordFormValue = Omit<OvertimeRecord, 'id' | 'hours' | 'leaveTime' | 'taxiCost' | 'reimbursementPaidAt'> & {
  taxiCost: string
  taxiProvider: TaxiProvider
  taxiProviderOther: string
  reimbursementStatus: ReimbursementStatus
  reimbursementPaidAt: string
}
