export type OvertimeRecord = {
  id: string
  date: string
  hours: number
  leaveTime: string
  tookTaxi: boolean
  taxiCost: number
  note: string
}

export type RecordFormValue = Omit<OvertimeRecord, 'id' | 'hours' | 'taxiCost'> & {
  leaveTime: string
  taxiCost: string
}
