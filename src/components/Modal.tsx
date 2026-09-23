import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = {
  onClose: () => void
  backdropClassName: string
  panelClassName: string
  labelledBy?: string
  ariaLabel?: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 弹层可以叠加（例如表单弹层之上再弹覆盖确认框），只有最上层那个才处理 Esc 与焦点循环。
const openModalStack: symbol[] = []

// 刻意不使用 createPortal：这些弹层需要能被 renderToStaticMarkup 静态渲染用于测试。
export function Modal({ onClose, backdropClassName, panelClassName, labelledBy, ariaLabel, children }: ModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef<Element | null>(null)
  const tokenRef = useRef<symbol>(Symbol('modal'))

  useEffect(() => {
    const token = tokenRef.current
    openModalStack.push(token)
    restoreFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(firstFocusable ?? panel)?.focus()
    return () => {
      openModalStack.splice(openModalStack.indexOf(token), 1)
      document.body.style.overflow = previousOverflow
      if (restoreFocusRef.current instanceof HTMLElement) restoreFocusRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openModalStack[openModalStack.length - 1] !== tokenRef.current) return
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
        return
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div className={backdropClassName} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={panelRef} className={panelClassName} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={ariaLabel} tabIndex={-1}>
      {children}
    </section>
  </div>
}
