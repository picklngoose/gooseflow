import { useRef, useCallback, forwardRef } from 'react'
import styles from './FlowCell.module.css'

export const FlowCell = forwardRef(function FlowCell(
  { cell, speechId, side, onUpdate, onDelete, onAddBelow, drawingMode, isSelected, onClick },
  ref
) {
  const textRef = useRef(null)

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onAddBelow()
    }
    if (e.key === 'Backspace' && cell.content === '' && e.ctrlKey) {
      e.preventDefault()
      onDelete()
    }
  }, [cell.content, onAddBelow, onDelete])

  const handleChange = useCallback((e) => {
    onUpdate({ content: e.target.value })
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [onUpdate])

  const handleClick = useCallback((e) => {
    if (drawingMode) {
      e.stopPropagation()
      onClick()
    }
  }, [drawingMode, onClick])

  return (
    <div
      ref={ref}
      className={`${styles.cell} ${styles[side]} ${drawingMode ? styles.drawable : ''} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
    >
      <textarea
        ref={textRef}
        value={cell.content}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder="flow..."
        rows={1}
        className={styles.textarea}
        readOnly={drawingMode}
      />
      {!drawingMode && (
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete">×</button>
      )}
    </div>
  )
})
