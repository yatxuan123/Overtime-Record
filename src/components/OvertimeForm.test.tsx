import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OvertimeForm } from './OvertimeForm'
import type { RecordFormValue } from '../types'

const value: RecordFormValue = {
  date: '2026-08-05',
  tookTaxi: true,
  taxiCost: '102',
  taxiProvider: 'taxi',
  taxiProviderOther: '',
  reimbursementStatus: 'unsubmitted',
  reimbursementPaidAt: '',
  note: '',
}

describe('OvertimeForm', () => {
  it('shows taxi and reimbursement fields for weekend overtime', () => {
    const markup = renderToStaticMarkup(
      <OvertimeForm
        value={{ ...value, date: '2026-08-08' }}
        isEditing
        error=""
        embedded
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(markup).toContain('回家方式')
    expect(markup).toContain('打车方式')
    expect(markup).toContain('打车费用')
    expect(markup).toContain('报销状态')
  })

  it('shows taxi and reimbursement fields for weekday overtime', () => {
    const markup = renderToStaticMarkup(
      <OvertimeForm
        value={value}
        isEditing
        error=""
        embedded
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(markup).toContain('回家方式')
    expect(markup).toContain('打车方式')
    expect(markup).toContain('打车费用')
    expect(markup).toContain('报销状态')
  })

  it('labels a weekday holiday as a rest day with comp time', () => {
    // 2026-10-01 是周四，属于国庆放假日，提示语应走「休息日」而不是「工作日」。
    const markup = renderToStaticMarkup(
      <OvertimeForm
        value={{ ...value, date: '2026-10-01' }}
        isEditing
        error=""
        embedded
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(markup).toContain('休息日加班')
    expect(markup).toContain('自动计入 1 天调休')
  })

  it('labels a weekend make-up workday as a workday without comp time', () => {
    // 2026-02-14 是周六，但是春节调休上班日，不计调休。
    const markup = renderToStaticMarkup(
      <OvertimeForm
        value={{ ...value, date: '2026-02-14' }}
        isEditing
        error=""
        embedded
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(markup).toContain('工作日加班')
    expect(markup).not.toContain('自动计入')
  })

  it('does not render a second close button while editing', () => {
    const markup = renderToStaticMarkup(
      <OvertimeForm
        value={value}
        isEditing
        error=""
        embedded
        onChange={() => undefined}
        onSubmit={() => undefined}
      />,
    )

    expect(markup).not.toContain('取消编辑')
    expect(markup).not.toContain('记录一笔')
  })
})
