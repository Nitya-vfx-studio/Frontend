import { useState, useCallback } from 'react'

/**
 * A standard custom hook for managing Modal open/close state transitions.
 * @param {boolean} initialOpen 
 * @returns {[boolean, () => void, () => void, () => void]}
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return [isOpen, open, close, toggle]
}
