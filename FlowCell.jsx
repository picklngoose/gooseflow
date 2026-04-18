import { useRef, useCallback, forwardRef } from 'react'
import styles from './FlowCell.module.css'

export const FlowCell = forwardRef(function FlowCell(
  { cell, speechId, side, onUpdate, onDelete, onAddBelow, isSelected, onKnobClick, onCellHover },
  ref
) {
  const textRef = useRef(null)

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onAddBelow()
    }
  }, [onAddBelow])

  const handleChange = useCallback((e) => {
    onUpdate({ content: e.target.value })
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [onUpdate])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    onDelete()
  }, [onDelete])

  const handleKnobClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onKnobClick) onKnobClick()
  }, [onKnobClick])

  return (
    <div
      ref={ref}
      className={`${styles.cell} ${styles[side]} ${isSelected ? styles.selected : ''}`}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => onCellHover && onCellHover(true)}
      onMouseLeave={() => onCellHover && onCellHover(false)}
    >
      <textarea
        ref={textRef}
        value={cell.content}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder="flow..."
        rows={1}
        className={styles.textarea}
      />
      {onKnobClick && (
        <>
          <button
            className={`${styles.knob} ${styles.knobLeft} ${isSelected ? styles.knobActive : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleKnobClick}
            title={isSelected ? 'Deselect' : 'Connect from left'}
          />
          <button
            className={`${styles.knob} ${styles.knobRight} ${isSelected ? styles.knobActive : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleKnobClick}
            title={isSelected ? 'Deselect' : 'Connect from right'}
          />
        </>
      )}
    </div>
  )
})
