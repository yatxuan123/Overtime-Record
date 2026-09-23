import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

export function CrashScreen() {
  return <div className="crash-screen">
    <section className="crash-screen__card">
      <span className="section-kicker">SOMETHING BROKE</span>
      <h2>页面渲染出错了</h2>
      <p><strong>记录是安全的。</strong>数据保存在本机的浏览器存储和 GitHub 仓库里，这次报错不会删掉任何记录。</p>
      <p>重新加载页面通常就能继续使用。如果反复出现，请保留控制台里的报错信息。</p>
      <button className="primary-button" type="button" onClick={() => window.location.reload()}>重新加载页面</button>
    </section>
  </div>
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染出错', error, info.componentStack)
  }

  render() {
    return this.state.hasError ? <CrashScreen /> : this.props.children
  }
}
