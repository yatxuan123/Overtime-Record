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
