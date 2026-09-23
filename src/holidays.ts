/**
 * 中国法定节假日与「调休上班日」配置表。
 *
 * 维护方式：
 * - STATUTORY_HOLIDAYS：日期 → 该日加班折算的调休天数（权重）。填 3 表示当天加班按 3 天调休计。
 * - MAKEUP_WORKDAYS：法定节假日前后的「调休上班日」—— 通常是周末但实际要上班。这些日期属于正常工作日，不计调休。
 *
 * 数据来源：国务院办公厅每年发布的《关于X年部分节假日安排的通知》。
 *
 * TODO: 表体暂为空 —— 尚未核实官方日期，填入前请勿凭印象猜测，以免把调休天数算错。
 */
export const STATUTORY_HOLIDAYS: Readonly<Record<string, number>> = {}

export const MAKEUP_WORKDAYS: ReadonlyArray<string> = []

export type HolidayTables = {
  statutoryHolidays: Readonly<Record<string, number>>
  makeupWorkdays: ReadonlySet<string>
}

export const DEFAULT_HOLIDAY_TABLES: HolidayTables = {
  statutoryHolidays: STATUTORY_HOLIDAYS,
  makeupWorkdays: new Set(MAKEUP_WORKDAYS),
}
