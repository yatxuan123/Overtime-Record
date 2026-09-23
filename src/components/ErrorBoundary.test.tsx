import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CrashScreen, ErrorBoundary } from './ErrorBoundary'

describe('ErrorBoundary', () => {
  it('renders its children while nothing has thrown', () => {
    expect(renderToStaticMarkup(<ErrorBoundary><p>正常内容</p></ErrorBoundary>)).toContain('正常内容')
  })

  it('tells the user their records are safe in the fallback screen', () => {
    const markup = renderToStaticMarkup(<CrashScreen />)

    expect(markup).toContain('页面渲染出错了')
    expect(markup).toContain('记录是安全的')
    expect(markup).toContain('重新加载页面')
  })
})
