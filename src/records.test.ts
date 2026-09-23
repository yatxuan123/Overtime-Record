import { describe, expect, it } from 'vitest'
import { buildRecordSummary, buildYearBreakdown, filterRecords, filterRecordsByPeriod, formatCurrency, getCompTimeDays, getPendingReimbursements, getRejectedReimbursements, isWeekendDate, listCompTimeEntries, paginateRecords, normalizeRecord, REIMBURSEMENT_STATUS_OPTIONS, sumCompTimeDays, sumPendingReimbursementAmount, summarizeReimbursementTiming, TAXI_PROVIDER_OPTIONS } from './records'
import type { OvertimeRecord } from './types'

describe('record data', () => {
  it('recognizes Saturday and Sunday as weekend overtime days', () => {
    expect(isWeekendDate('2026-08-08')).toBe(true)
    expect(isWeekendDate('2026-08-09')).toBe(true)
    expect(isWeekendDate('2026-08-10')).toBe(false)
  })

  it('calculates one compensatory day for each weekend record in a period', () => {
    const records: OvertimeRecord[] = [
      { id: 'sat', date: '2026-08-08', tookTaxi: false, taxiCost: 0, note: '' },
      { id: 'sun', date: '2026-08-09', tookTaxi: false, taxiCost: 0, note: '' },
      { id: 'weekday', date: '2026-08-10', tookTaxi: false, taxiCost: 0, note: '' },
    ]

    expect(getCompTimeDays(records[0])).toBe(1)
    expect(getCompTimeDays(records[2])).toBe(0)
    expect(sumCompTimeDays(records, '2026-08')).toBe(2)
    expect(sumCompTimeDays(records)).toBe(2)
  })

  it('formats taxi costs without rounding away decimal amounts', () => {
    expect(formatCurrency(103.5)).toBe('103.5')
    expect(formatCurrency(103.50)).toBe('103.5')
    expect(formatCurrency(104)).toBe('104')
    expect(formatCurrency(103.56)).toBe('103.56')
  })

  it('summarizes the currently displayed month without overtime hours', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-07-05', tookTaxi: true, taxiCost: 30, taxiProvider: 'didi', taxiProviderOther: '', reimbursementStatus: 'paid', note: '' },
      { id: '2', date: '2026-07-10', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '' },
      { id: '4', date: '2026-07-20', tookTaxi: true, taxiCost: 12, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '' },
      { id: '3', date: '2026-08-01', tookTaxi: true, taxiCost: 50, taxiProvider: 'amap', taxiProviderOther: '', note: '' },
    ]

    expect(buildRecordSummary(records, '2026-07')).toEqual({ days: 3, taxiDays: 2, taxiCost: 42, taxiPaidCost: 30, taxiPendingCost: 12 })
  })

  it('summarizes all months in a selected year', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-01-05', tookTaxi: true, taxiCost: 20, taxiProvider: 'taxi', taxiProviderOther: '', note: '' },
      { id: '2', date: '2026-12-10', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '' },
      { id: '3', date: '2025-12-31', tookTaxi: true, taxiCost: 60, taxiProvider: 'other', taxiProviderOther: '顺风车', note: '' },
    ]

    expect(buildRecordSummary(records, '2026')).toEqual({ days: 2, taxiDays: 1, taxiCost: 20, taxiPaidCost: 0, taxiPendingCost: 20 })
  })

  it('filters details by the selected month or year', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-07-01', tookTaxi: false, taxiCost: 0, note: '' },
      { id: '2', date: '2026-08-01', tookTaxi: false, taxiCost: 0, note: '' },
      { id: '3', date: '2025-08-01', tookTaxi: false, taxiCost: 0, note: '' },
    ]

    expect(filterRecordsByPeriod(records, '2026-08').map((record) => record.id)).toEqual(['2'])
    expect(filterRecordsByPeriod(records, '2026').map((record) => record.id)).toEqual(['1', '2'])
  })

  it('paginates the filtered detail records', () => {
    const records: OvertimeRecord[] = Array.from({ length: 10 }, (_, index) => ({ id: String(index), date: `2026-08-${String(index + 1).padStart(2, '0')}`, tookTaxi: false, taxiCost: 0, note: '' }))

    expect(paginateRecords(records, 1, 8).map((record) => record.id)).toHaveLength(8)
    expect(paginateRecords(records, 2, 8).map((record) => record.id)).toEqual(['8', '9'])
  })

  it('converts old records into the simplified format', () => {
    expect(normalizeRecord({ id: 'legacy', date: '2026-08-08', leaveTime: '22:00', hours: 1, tookTaxi: true, taxiCost: 36, note: '旧记录' })).toEqual({
      id: 'legacy', date: '2026-08-08', tookTaxi: true, taxiCost: 36, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '旧记录',
    })
  })

  it('clears reimbursement status when no taxi cost exists', () => {
    expect(normalizeRecord({ id: 'no-taxi', date: '2026-08-08', tookTaxi: false, taxiCost: 0, reimbursementStatus: 'paid', note: '' })?.reimbursementStatus).toBe('unsubmitted')
  })

  it('offers the requested taxi provider choices', () => {
    expect(TAXI_PROVIDER_OPTIONS.map((option) => option.value)).toEqual(['taxi', 'didi', 'amap', 'other'])
  })

  it('offers the four reimbursement states', () => {
    expect(REIMBURSEMENT_STATUS_OPTIONS.map((option) => option.label)).toEqual(['未申报', '已申报', '被驳回', '已到账'])
  })

  it('keeps the paid date for paid reimbursement records', () => {
    expect(normalizeRecord({ id: 'paid', date: '2026-01-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-01-30', note: '' })).toMatchObject({
      reimbursementStatus: 'paid',
      reimbursementPaidAt: '2026-01-30',
    })
  })

  it('finds submitted reimbursements that have not arrived and calculates waiting days', () => {
    const records: OvertimeRecord[] = [
      { id: 'old', date: '2026-01-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'submitted', note: '' },
      { id: 'recent', date: '2026-08-15', tookTaxi: true, taxiCost: 20, reimbursementStatus: 'submitted', note: '' },
      { id: 'paid', date: '2026-01-02', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-01-30', note: '' },
    ]

    expect(getPendingReimbursements(records, '2026-08-20')).toEqual([
      { record: records[0], waitingDays: 231 },
      { record: records[1], waitingDays: 5 },
    ])
  })

  it('sums every unpaid reimbursement, including not-yet-submitted ones', () => {
    const records: OvertimeRecord[] = [
      { id: 'aug-pending', date: '2026-08-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'submitted', note: '' },
      { id: 'aug-paid', date: '2026-08-02', tookTaxi: true, taxiCost: 20, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-10', note: '' },
      { id: 'jul-pending', date: '2026-07-01', tookTaxi: true, taxiCost: 40, reimbursementStatus: 'submitted', note: '' },
      { id: 'aug-unsubmitted', date: '2026-08-03', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'unsubmitted', note: '' },
    ]

    // 口径是「公司还欠我多少」，所以未申报的 10 元也计入。
    expect(sumPendingReimbursementAmount(records, '2026-08')).toBe(40)
    expect(sumPendingReimbursementAmount(records, '2026')).toBe(80)
    expect(sumPendingReimbursementAmount(records)).toBe(80)

    // 刻意与上面的口径不同：提醒只列「已申报、正在等待打款」的记录。
    expect(getPendingReimbursements(records, '2026-08-31').map((item) => item.record.id).sort()).toEqual(['aug-pending', 'jul-pending'])
  })

  it('counts holiday dates by configured weight and skips make-up workdays', () => {
    const tables = { holidayDates: { '2026-10-01': 3 }, makeupWorkdays: new Set(['2026-08-08']) }

    expect(getCompTimeDays({ date: '2026-10-01' }, tables)).toBe(3)
    expect(getCompTimeDays({ date: '2026-08-08' }, tables)).toBe(0)
    expect(getCompTimeDays({ date: '2026-08-09' }, tables)).toBe(1)
    expect(getCompTimeDays({ date: '2026-08-10' }, tables)).toBe(0)
    expect(sumCompTimeDays([{ id: 'a', date: '2026-10-01', tookTaxi: false, taxiCost: 0, note: '' }], '2026-10', tables)).toBe(3)
  })

  it('applies the shipped 2026 holiday tables', () => {
    // 国庆当天（周四）是放假日，加班计 1 天。
    expect(getCompTimeDays({ date: '2026-10-01' })).toBe(1)
    // 1月4日（周日）是调休上班日，加班不计调休。
    expect(getCompTimeDays({ date: '2026-01-04' })).toBe(0)
    // 春节假期内的周五 2月20日 是放假日，计 1 天。
    expect(getCompTimeDays({ date: '2026-02-20' })).toBe(1)
    // 春节假期内的周六 2月21日 按周末计 1 天。
    expect(getCompTimeDays({ date: '2026-02-21' })).toBe(1)
    // 普通工作日不计调休。
    expect(getCompTimeDays({ date: '2026-03-10' })).toBe(0)
  })

  it('flags comp-time days that already expired or are about to expire', () => {
    const records: OvertimeRecord[] = [
      { id: 'expired', date: '2026-01-03', tookTaxi: false, taxiCost: 0, note: '' },
      { id: 'soon', date: '2026-07-04', tookTaxi: false, taxiCost: 0, note: '' },
      { id: 'later', date: '2026-08-08', tookTaxi: false, taxiCost: 0, note: '' },
    ]

    const entries = listCompTimeEntries(records, '2026-09-23')
    const byId = (id: string) => entries.find((entry) => entry.record.id === id)

    expect(byId('expired')).toMatchObject({ expiresAt: '2026-04-03', daysLeft: -173, isExpired: true })
    expect(byId('soon')).toMatchObject({ expiresAt: '2026-10-04', daysLeft: 11, isExpired: false })
    expect(byId('later')).toMatchObject({ expiresAt: '2026-11-08', daysLeft: 46, isExpired: false })
  })

  it('filters records by reimbursement status and keyword', () => {
    const records: OvertimeRecord[] = [
      { id: 'a', date: '2026-08-01', tookTaxi: true, taxiCost: 30, taxiProvider: 'didi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '团建' },
      { id: 'b', date: '2026-08-02', tookTaxi: true, taxiCost: 40, taxiProvider: 'other', taxiProviderOther: '顺风车,拼车', reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-10', note: '' },
      { id: 'c', date: '2026-08-03', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '自行回家' },
    ]

    expect(filterRecords(records, { status: 'submitted', keyword: '' }).map((record) => record.id)).toEqual(['a'])
    expect(filterRecords(records, { status: 'all', keyword: '顺风车' }).map((record) => record.id)).toEqual(['b'])
    expect(filterRecords(records, { status: 'all', keyword: '2026-08-10' }).map((record) => record.id)).toEqual(['b'])
    // 没打车的记录不参与报销状态筛选。
    expect(filterRecords(records, { status: 'unsubmitted', keyword: '' }).map((record) => record.id)).toEqual([])
  })

  it('keeps rejected reimbursements in their own actionable bucket', () => {
    const records: OvertimeRecord[] = [
      { id: 'rejected', date: '2026-08-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'rejected', note: '' },
      { id: 'submitted', date: '2026-08-02', tookTaxi: true, taxiCost: 20, reimbursementStatus: 'submitted', note: '' },
    ]

    expect(getRejectedReimbursements(records).map((record) => record.id)).toEqual(['rejected'])
    // 被驳回的钱还没到账，所以计入总额；但它不在「等待打款」列表里。
    expect(sumPendingReimbursementAmount(records)).toBe(50)
    expect(getPendingReimbursements(records, '2026-09-23').map((item) => item.record.id)).toEqual(['submitted'])
  })

  it('breaks a year down by month with overtime, comp time, taxi and pending cost', () => {
    const records: OvertimeRecord[] = [
      { id: 'jul-weekday', date: '2026-07-08', tookTaxi: false, taxiCost: 0, note: '' },
      { id: 'jul-sat', date: '2026-07-11', tookTaxi: true, taxiCost: 30, taxiProvider: 'didi', taxiProviderOther: '', reimbursementStatus: 'paid', reimbursementPaidAt: '2026-07-20', note: '' },
      { id: 'aug-sat', date: '2026-08-08', tookTaxi: true, taxiCost: 50, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '' },
      { id: 'last-year', date: '2025-08-09', tookTaxi: true, taxiCost: 99, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '' },
    ]

    const breakdown = buildYearBreakdown(records, '2026')

    expect(breakdown.months).toHaveLength(12)
    // 7月：周三加班不计调休，周六计 1 天；已到账的打车费不算未到账。
    expect(breakdown.months[6]).toEqual({ month: 7, days: 2, compDays: 1, taxiCost: 30, pendingCost: 0 })
    // 8月：周六 1 天调休，已申报的 50 元计入未到账。
    expect(breakdown.months[7]).toEqual({ month: 8, days: 1, compDays: 1, taxiCost: 50, pendingCost: 50 })
    // 全年合计只算 2026 年，其他年份的记录不进任何一格。
    expect(breakdown.days).toBe(3)
    expect(breakdown.compDays).toBe(2)
    expect(breakdown.taxiCost).toBe(80)
    expect(breakdown.pendingCost).toBe(50)
  })

  it('returns twelve zeroed months for a year without records', () => {
    const breakdown = buildYearBreakdown([], '2026')

    expect(breakdown.months).toHaveLength(12)
    expect(breakdown.months.map((month) => month.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(breakdown.months.every((month) => month.days === 0 && month.compDays === 0 && month.taxiCost === 0 && month.pendingCost === 0)).toBe(true)
    expect(breakdown.days).toBe(0)
    expect(breakdown.pendingCost).toBe(0)
  })

  it('counts rejected and unsubmitted fares as pending but not paid ones', () => {
    const records: OvertimeRecord[] = [
      { id: 'paid', date: '2026-08-03', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-10', note: '' },
      { id: 'submitted', date: '2026-08-04', tookTaxi: true, taxiCost: 20, reimbursementStatus: 'submitted', note: '' },
      { id: 'rejected', date: '2026-08-05', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'rejected', note: '' },
      { id: 'unsubmitted', date: '2026-08-06', tookTaxi: true, taxiCost: 40, reimbursementStatus: 'unsubmitted', note: '' },
    ]

    const breakdown = buildYearBreakdown(records, '2026')

    expect(breakdown.months[7].taxiCost).toBe(100)
    // 与 sumPendingReimbursementAmount 同口径：只有已到账的 10 元不算「公司还欠我」。
    expect(breakdown.months[7].pendingCost).toBe(90)
    expect(breakdown.pendingCost).toBe(90)
  })

  it('measures how long reimbursements took to arrive', () => {
    const records: OvertimeRecord[] = [
      { id: 'fast', date: '2026-08-18', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-24', note: '' },
      { id: 'slow', date: '2026-07-21', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-24', note: '' },
      { id: 'still-waiting', date: '2026-08-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'submitted', note: '' },
      { id: 'no-paid-date', date: '2026-08-02', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'paid', note: '' },
    ]

    // 只统计真正到账的：6 天与 34 天，平均 20 天。
    expect(summarizeReimbursementTiming(records)).toEqual({ average: 20, longest: 34, sampleSize: 2 })
    // 按加班日期所属周期筛选，与年视图其余数字口径一致。
    expect(summarizeReimbursementTiming(records, '2026-08')).toEqual({ average: 6, longest: 6, sampleSize: 1 })
  })

  it('rounds the average reimbursement cycle to one decimal place', () => {
    const records: OvertimeRecord[] = [
      { id: 'a', date: '2026-08-01', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-02', note: '' },
      { id: 'b', date: '2026-08-01', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-03', note: '' },
      { id: 'c', date: '2026-08-01', tookTaxi: true, taxiCost: 10, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-03', note: '' },
    ]

    // (1 + 2 + 2) / 3 = 1.666…，展示成 1.7 而不是 1.6666666666666667。
    expect(summarizeReimbursementTiming(records)).toEqual({ average: 1.7, longest: 2, sampleSize: 3 })
  })

  it('reports no reimbursement timing when nothing has been paid yet', () => {
    const records: OvertimeRecord[] = [
      { id: 'pending', date: '2026-08-01', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'submitted', note: '' },
    ]

    // 没有样本时给 null，避免页面显示 NaN 天。
    expect(summarizeReimbursementTiming(records)).toEqual({ average: null, longest: null, sampleSize: 0 })
  })

  it('ignores paid records whose paid date precedes the overtime date', () => {
    const records: OvertimeRecord[] = [
      { id: 'backwards', date: '2026-08-10', tookTaxi: true, taxiCost: 30, reimbursementStatus: 'paid', reimbursementPaidAt: '2026-08-01', note: '' },
    ]

    // 手工改过的 JSON 可能出现倒挂日期，既不算样本也不产生负数天数。
    expect(summarizeReimbursementTiming(records)).toEqual({ average: null, longest: null, sampleSize: 0 })
  })
})
