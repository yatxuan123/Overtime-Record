import { memo } from 'react'
import { CarFront, FileText, Plus, Save } from 'lucide-react'
import { REIMBURSEMENT_STATUS_OPTIONS, TAXI_PROVIDER_OPTIONS } from '../records'
import { localDateKey } from '../overtime'
import type { RecordFormValue } from '../types'
import { DatePicker } from './DatePicker'

type OvertimeFormProps = {
  value: RecordFormValue
  isEditing: boolean
  error: string
  embedded?: boolean
  onChange: (next: Partial<RecordFormValue>) => void
  onSubmit: () => void
}

export const OvertimeForm = memo(function OvertimeForm({ value, isEditing, error, embedded = false, onChange, onSubmit }: OvertimeFormProps) {
  const todayKey = localDateKey()
  const toggleTaxi = () => onChange(value.tookTaxi
    ? { tookTaxi: false, taxiCost: '', taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', reimbursementPaidAt: '' }
    : { tookTaxi: true, taxiProvider: 'taxi', reimbursementStatus: 'unsubmitted', reimbursementPaidAt: '' })

  return (
    <section className={`form-panel ${embedded ? 'form-panel--embedded' : ''}`}>
      {!embedded && <div className="panel-heading"><div><span className="section-kicker">记录一笔</span><h2>{isEditing ? '编辑加班记录' : '新增加班记录'}</h2></div></div>}

      <div className="form-fields">
        <label className="field">
          <span>加班日期</span>
          <DatePicker value={value.date} onChange={(date) => onChange({ date })} />
        </label>
        <div className="field">
          <span>回家方式</span>
          <button className={`taxi-toggle ${value.tookTaxi ? 'is-active' : ''}`} type="button" onClick={toggleTaxi} aria-pressed={value.tookTaxi}>
            <CarFront size={17} />
            <span>{value.tookTaxi ? '打车回家' : '自行回家'}</span>
            <span className="toggle-dot" />
          </button>
        </div>
        {value.tookTaxi && <fieldset className="field field--full fieldset-reset">
          <legend>打车方式</legend>
          <div className="option-radio-group">
            {TAXI_PROVIDER_OPTIONS.map((option) => <label className={`option-radio ${value.taxiProvider === option.value ? 'is-selected' : ''}`} key={option.value}><input type="radio" name="taxi-provider" value={option.value} checked={value.taxiProvider === option.value} onChange={() => onChange({ taxiProvider: option.value, taxiProviderOther: option.value === 'other' ? value.taxiProviderOther : '' })} /><span>{option.label}</span></label>)}
          </div>
        </fieldset>}
        {value.tookTaxi && <label className="field">
          <span>打车费用 <em>元</em></span>
          <div className="input-wrap"><span className="currency">¥</span><input type="number" min="0" step="1" placeholder="0" value={value.taxiCost} onChange={(event) => onChange({ taxiCost: event.target.value })} /></div>
        </label>}
        {value.tookTaxi && value.taxiProvider === 'other' && <label className="field field--full">
          <span>其他打车方式</span>
          <div className="input-wrap"><input type="text" placeholder="例如：顺风车、网约车" value={value.taxiProviderOther} onChange={(event) => onChange({ taxiProviderOther: event.target.value })} /></div>
        </label>}
        {value.tookTaxi && <fieldset className="field field--full fieldset-reset">
          <legend>报销状态</legend>
          <div className="option-radio-group option-radio-group--status">
            {REIMBURSEMENT_STATUS_OPTIONS.map((option) => <label className={`option-radio ${value.reimbursementStatus === option.value ? 'is-selected' : ''}`} key={option.value}><input type="radio" name="reimbursement-status" value={option.value} checked={value.reimbursementStatus === option.value} onChange={() => onChange({ reimbursementStatus: option.value, reimbursementPaidAt: option.value === 'paid' ? (value.reimbursementPaidAt || todayKey) : '' })} /><span>{option.label}</span></label>)}
          </div>
        </fieldset>}
        {value.tookTaxi && value.reimbursementStatus === 'paid' && <label className="field field--full">
          <span>到账日期</span>
          <div className="input-wrap"><input type="date" max={todayKey} value={value.reimbursementPaidAt} onChange={(event) => onChange({ reimbursementPaidAt: event.target.value })} /></div>
        </label>}
        <label className="field field--full">
          <span>备注 <em>可选</em></span>
          <div className="input-wrap input-wrap--textarea"><FileText size={17} /><textarea rows={3} placeholder="记录项目、原因或其他备注" value={value.note} onChange={(event) => onChange({ note: event.target.value })} /></div>
        </label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="button" onClick={onSubmit}>{isEditing ? <Save size={17} /> : <Plus size={17} />}<span>{isEditing ? '更新记录' : '保存记录'}</span></button>
    </section>
  )
})
