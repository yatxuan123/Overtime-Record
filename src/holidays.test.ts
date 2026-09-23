import { describe, expect, it } from 'vitest'
import { MAKEUP_WORKDAYS, STATUTORY_HOLIDAYS } from './holidays'
import { isWeekendDate } from './records'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRealDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

describe('holiday tables', () => {
  it('only contains well-formed real dates', () => {
    for (const key of [...Object.keys(STATUTORY_HOLIDAYS), ...MAKEUP_WORKDAYS]) {
      expect(isRealDateKey(key), `${key} 不是合法的 YYYY-MM-DD 日期`).toBe(true)
    }
  })

  it('only lists weekend days as make-up workdays', () => {
    // 调休上班日的定义就是「本该休息的周末被调成工作日」，配成工作日多半是填错了。
    for (const key of MAKEUP_WORKDAYS) {
      expect(isWeekendDate(key), `${key} 是工作日，不像调休上班日`).toBe(true)
    }
  })

  it('uses positive whole-day weights for statutory holidays', () => {
    for (const [key, weight] of Object.entries(STATUTORY_HOLIDAYS)) {
      expect(Number.isInteger(weight) && weight > 0, `${key} 的调休权重应为正整数`).toBe(true)
    }
  })
})
