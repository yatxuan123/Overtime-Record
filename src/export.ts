import { formatCurrency, reimbursementStatusLabel, taxiProviderLabel } from './records'
import type { OvertimeRecord } from './types'

const CSV_HEADER = ['日期', '是否加班', '回家方式', '打车方式', '打车费用', '报销状态', '到账日期', '备注']
// 前缀 UTF-8 BOM，否则 Excel 打开中文会乱码。
const UTF8_BOM = String.fromCharCode(0xfeff)

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function sortByDateAscending(records: OvertimeRecord[]): OvertimeRecord[] {
  return [...records].sort((left, right) => left.date.localeCompare(right.date))
}

export function recordsToCsv(records: OvertimeRecord[]): string {
  const rows = sortByDateAscending(records).map((record) => [
    record.date,
    '加班',
    record.tookTaxi ? '打车回家' : '自行回家',
    record.tookTaxi ? taxiProviderLabel(record) : '',
    record.tookTaxi ? formatCurrency(record.taxiCost) : '',
    record.tookTaxi ? reimbursementStatusLabel(record.reimbursementStatus) : '',
    record.tookTaxi && record.reimbursementStatus === 'paid' ? record.reimbursementPaidAt ?? '' : '',
    record.note,
  ].map(escapeCsvCell).join(','))
  return `${UTF8_BOM}${[CSV_HEADER.join(','), ...rows].join('\r\n')}\r\n`
}

export function recordsToJson(records: OvertimeRecord[], exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ exportedAt, records: sortByDateAscending(records) }, null, 2)
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
