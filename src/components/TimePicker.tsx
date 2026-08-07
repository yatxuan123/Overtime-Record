import { Clock3 } from 'lucide-react'
import { selectableLeaveTimes, STANDARD_END_TIME } from '../overtime'

type TimePickerProps = { value: string; onChange: (value: string) => void }

const timeOptions = selectableLeaveTimes()

export function TimePicker({ value, onChange }: TimePickerProps) {
  const selectedValue = timeOptions.includes(value) ? value : STANDARD_END_TIME

  return <div className="time-radio-group" role="radiogroup" aria-label="实际下班时间">
    {timeOptions.map((time) => <label className={`time-radio-option ${selectedValue === time ? 'is-selected' : ''}`} key={time}>
      <input type="radio" name="leave-time" value={time} checked={selectedValue === time} onChange={() => onChange(time)} />
      <Clock3 size={15} />
      <span>{time}</span>
    </label>)}
    <small className="time-radio-hint">仅可选择 {STANDARD_END_TIME} 之后的时间</small>
  </div>
}
