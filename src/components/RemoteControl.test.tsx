import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TokenSecretField } from './RemoteControl'

describe('TokenSecretField', () => {
  it('masks the token by default and offers show and copy controls', () => {
    const markup = renderToStaticMarkup(<TokenSecretField value="" onChange={() => undefined} onCopy={() => undefined} />)
    expect(markup).toContain('type="password"')
    expect(markup).toContain('aria-label="显示 Token"')
    expect(markup).toContain('aria-label="复制 Token"')
  })
})
