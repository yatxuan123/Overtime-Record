import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PendingReimbursementList } from './PendingReimbursementList'
import { listUnpaidReimbursements, type UnpaidReimbursement } from '../records'
import type { OvertimeRecord } from '../types'

const records: OvertimeRecord[] = [
  { id: 'submitted', date: '2026-08-01', tookTaxi: true, taxiCost: 103.5, taxiProvider: 'didi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '' },
  { id: 'unsubmitted', date: '2026-08-05', tookTaxi: true, taxiCost: 20, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '' },
  { id: 'rejected', date: '2026-08-10', tookTaxi: true, taxiCost: 30, taxiProvider: 'amap', taxiProviderOther: '', reimbursementStatus: 'rejected', note: '' },
]

const render = (entries: UnpaidReimbursement[]) =>
  renderToStaticMarkup(<PendingReimbursementList entries={entries} onSelect={() => undefined} />)

describe('PendingReimbursementList', () => {
  it('gives every unpaid state its own sub-label and colour', () => {
    const markup = render(listUnpaidReimbursements(records, '2026-09-01'))

    // 已申报：等了多少天 + 蓝色徽章色。
    expect(markup).toContain('已等待 31 天')
    expect(markup).toContain('record-status record-status--submitted')
    // 未申报：从没提交过，没有等待期可言。
    expect(markup).toContain('尚未申报')
    expect(markup).toContain('record-status record-status--unsubmitted')
    // 被驳回：要我们重新提交。
    expect(markup).toContain('需重新提交')
    expect(markup).toContain('record-status record-status--rejected')
    // 行上仍然带日期、方式与金额。
    expect(markup).toContain('2026-08-01')
    expect(markup).toContain('滴滴')
    expect(markup).toContain('¥103.5')
  })

  it('flags a submission that blew past the normal waiting window', () => {
    const stale: OvertimeRecord[] = [{ ...records[0], id: 'stale', date: '2026-01-01' }]

    const markup = render(listUnpaidReimbursements(stale, '2026-09-01'))

    expect(markup).toContain('已等待 243 天 · 已超期')
    expect(markup).toContain('is-overdue')
  })

  it('offers sorting by amount and by status', () => {
    const markup = render(listUnpaidReimbursements(records, '2026-09-01'))

    expect(markup).toContain('aria-label="未到账费用排序方式"')
    expect(markup).toContain('>默认</button>')
    expect(markup).toContain('>金额↓</button>')
    expect(markup).toContain('>金额↑</button>')
    expect(markup).toContain('>按状态</button>')
    // 默认选中「默认」，也就是紧急度顺序。
    expect(markup).toContain('is-active" aria-pressed="true">默认</button>')
  })

  it('renders an empty state rather than a bare list', () => {
    const markup = render([])

    expect(markup).toContain('暂无未到账费用')
    // 没有记录时不显示排序控件。
    expect(markup).not.toContain('未到账费用排序方式')
  })
})
