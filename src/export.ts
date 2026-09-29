import { formatCurrency, reimbursementStatusLabel, taxiProviderLabel } from './records'
import type { OvertimeRecord, ReimbursementBatch } from './types'

const CSV_HEADER = ['日期', '是否加班', '回家方式', '打车方式', '打车费用', '报销状态', '到账日期', '备注']
const BATCH_CSV_HEADER = [...CSV_HEADER, '批次编号', '申报周期', '批次申报日期', '预计申报金额', '实际到账金额', '差额']
// 前缀 UTF-8 BOM，否则 Excel 打开中文会乱码。
const UTF8_BOM = String.fromCharCode(0xfeff)

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function sortByDateAscending(records: OvertimeRecord[]): OvertimeRecord[] {
  return [...records].sort((left, right) => left.date.localeCompare(right.date))
}

export function recordsToCsv(records: OvertimeRecord[], batches: ReimbursementBatch[] = []): string {
  const batchById = new Map(batches.map((batch) => [batch.id, batch]))
  const rows = sortByDateAscending(records).map((record) => [
    record.date,
    '加班',
    record.tookTaxi ? '打车回家' : '自行回家',
    record.tookTaxi ? taxiProviderLabel(record) : '',
    record.tookTaxi ? formatCurrency(record.taxiCost) : '',
    record.tookTaxi ? reimbursementStatusLabel(record.reimbursementStatus) : '',
    record.tookTaxi && record.reimbursementStatus === 'paid' ? record.reimbursementPaidAt ?? '' : '',
    record.note,
    ...(batches.length > 0 ? (() => {
      const batch = record.reimbursementBatchId ? batchById.get(record.reimbursementBatchId) : undefined
      return [batch?.id ?? '', batch ? `${batch.periodStart} ~ ${batch.periodEnd}` : '', batch?.submittedAt ?? '', batch ? formatCurrency(batch.expectedAmount) : '', batch?.actualPaidAmount === undefined ? '' : formatCurrency(batch.actualPaidAmount), batch?.actualPaidAmount === undefined ? '' : formatCurrency(batch.actualPaidAmount - batch.expectedAmount)]
    })() : []),
  ].map(escapeCsvCell).join(','))
  return `${UTF8_BOM}${[(batches.length > 0 ? BATCH_CSV_HEADER : CSV_HEADER).join(','), ...rows].join('\r\n')}\r\n`
}

export function recordsToJson(records: OvertimeRecord[], exportedAt = new Date().toISOString(), batches: ReimbursementBatch[] = []): string {
  return JSON.stringify({ exportedAt, records: sortByDateAscending(records), ...(batches.length > 0 ? { reimbursementBatches: batches } : {}) }, null, 2)
}

export function downloadTextFile(fileName: string, mimeType: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
