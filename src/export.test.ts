import { describe, expect, it } from 'vitest'
import { recordsToCsv, recordsToJson } from './export'
import type { OvertimeRecord } from './types'

const BOM = String.fromCharCode(0xfeff)

const records: OvertimeRecord[] = [
  { id: 'b', date: '2026-08-02', tookTaxi: true, taxiCost: 40, taxiProvider: 'other', taxiProviderOther: '顺风车,拼车', reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-10', note: '含"引号"的备注' },
  { id: 'a', date: '2026-08-01', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '' },
]

describe('records export', () => {
  it('writes a BOM, a header row and CRLF separated rows sorted by date', () => {
    const csv = recordsToCsv(records)
    const lines = csv.split('\r\n')

    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(lines[0]).toBe(`${BOM}${['日期', '是否加班', '回家方式', '打车方式', '打车费用', '报销状态', '到账日期', '备注'].join(',')}`)
    expect(lines[1]).toBe(['2026-08-01', '加班', '自行回家', '', '', '', '', ''].join(','))
    expect(lines[2]).toBe(['2026-08-02', '加班', '打车回家', '"顺风车,拼车"', '40', '已到账', '2026-08-10', '"含""引号""的备注"'].join(','))
  })

  it('exports JSON with an exportedAt stamp and records sorted by date', () => {
    const json = JSON.parse(recordsToJson(records, '2026-09-23T00:00:00.000Z')) as { exportedAt: string; records: OvertimeRecord[] }

    expect(json.exportedAt).toBe('2026-09-23T00:00:00.000Z')
    expect(json.records.map((record) => record.id)).toEqual(['a', 'b'])
  })
})
