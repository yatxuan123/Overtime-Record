export type TaxiProvider = 'taxi' | 'didi' | 'amap' | 'other' | ''

export type OvertimeRecord = {
  id: string
  date: string
  tookTaxi: boolean
  taxiCost: number
  taxiProvider?: TaxiProvider
  taxiProviderOther?: string
  note: string
  // 旧版本字段仅用于兼容历史 JSON，不再参与展示或统计。
  hours?: number
  leaveTime?: string
}

export type RecordFormValue = Omit<OvertimeRecord, 'id' | 'hours' | 'leaveTime' | 'taxiCost'> & {
  taxiCost: string
  taxiProvider: TaxiProvider
  taxiProviderOther: string
}
