import { describe, expect, it } from 'vitest'
import { closedRecordModalState } from './modalState'

describe('record modal state', () => {
  it('closes the form and clears the editing record after saving', () => {
    expect(closedRecordModalState()).toEqual({ isOpen: false, editingId: null })
  })
})
