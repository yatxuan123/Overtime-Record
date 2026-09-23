import { describe, expect, it } from 'vitest'
import { HOLIDAY_DATES, MAKEUP_WORKDAYS } from './holidays'
import { isWeekendDate } from './records'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRealDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

describe('holiday tables', () => {
  it('only contains well-formed real dates', () => {
    for (const key of [...Object.keys(HOLIDAY_DATES), ...MAKEUP_WORKDAYS]) {
      expect(isRealDateKey(key), `${key} 不是合法的 YYYY-MM-DD 日期`).toBe(true)
    }
  })

  it('only lists weekend days as make-up workdays', () => {
    // 调休上班日的定义就是「本该休息的周末被调成工作日」，配成工作日基本是填错了。
    for (const key of MAKEUP_WORKDAYS) {
      expect(isWeekendDate(key), `${key} 是工作日，不像调休上班日`).toBe(true)
    }
  })

  it('never lists the same date as both a holiday and a make-up workday', () => {
    for (const key of MAKEUP_WORKDAYS) {
      expect(HOLIDAY_DATES[key], `${key} 同时出现在两张表里`).toBeUndefined()
    }
  })

  it('uses positive whole-day weights for holiday dates', () => {
    for (const [key, weight] of Object.entries(HOLIDAY_DATES)) {
      expect(Number.isInteger(weight) && weight > 0, `${key} 的调休权重应为正整数`).toBe(true)
    }
  })

  it('matches the 2026 国务院办公厅 notice', () => {
    // 元旦 3 + 春节 9 + 清明 3 + 劳动节 5 + 端午 3 + 中秋 3 + 国庆 7
    expect(Object.keys(HOLIDAY_DATES)).toHaveLength(33)
    // 1月4日、2月14日、2月28日、5月9日、9月20日、10月10日
    expect([...MAKEUP_WORKDAYS].sort()).toEqual(['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'])
    // 每个节假日的放假首尾
    expect(HOLIDAY_DATES['2026-01-01']).toBe(1)
    expect(HOLIDAY_DATES['2026-01-03']).toBe(1)
    expect(HOLIDAY_DATES['2026-02-15']).toBe(1)
    expect(HOLIDAY_DATES['2026-02-23']).toBe(1)
    expect(HOLIDAY_DATES['2026-04-04']).toBe(1)
    expect(HOLIDAY_DATES['2026-04-06']).toBe(1)
    expect(HOLIDAY_DATES['2026-05-01']).toBe(1)
    expect(HOLIDAY_DATES['2026-05-05']).toBe(1)
    expect(HOLIDAY_DATES['2026-06-19']).toBe(1)
    expect(HOLIDAY_DATES['2026-06-21']).toBe(1)
    expect(HOLIDAY_DATES['2026-09-25']).toBe(1)
    expect(HOLIDAY_DATES['2026-09-27']).toBe(1)
    expect(HOLIDAY_DATES['2026-10-01']).toBe(1)
    expect(HOLIDAY_DATES['2026-10-07']).toBe(1)
  })
})
