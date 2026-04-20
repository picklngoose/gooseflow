import { useRef, useCallback, forwardRef } from 'react'
import styles from './FlowCell.module.css'

// 6 distinct colors cycling through the existing palette
const TAG_COLORS = [
  '#ffd166', // yellow
  '#00e5a0', // aff green
  '#4d9fff', // blue
  '#b580ff', // purple
  '#ff9f5a', // orange
  '#ff6b9d', // pink
]

function detectTag(content) {
  if (!content) return null
  const firstWord = content.trimStart().split(/\s/)[0]
  if (firstWord.length >= 1 && (firstWord.endsWith(':') || firstWord.endsWith('-'))) {
    const label = firstWord.slice(0, -1)
    if (!label) return null
    // hash label to a stable color
    let hash = 0
    for (let i = 0; i < label.length; i++) hash += label.charCodeAt(i)
    const color = TAG_COLORS[hash % TAG_COLORS.length]
    return { label, color }
  }
  return null
}

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

  const handleKnobClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onKnobClick) onKnobClick()
  }, [onKnobClick])

  const tag = detectTag(cell.content)

  return (
    <div
      ref={ref}
      className={`${styles.cell} ${styles[side]} ${isSelected ? styles.selected : ''}`}
      style={tag ? { borderLeftColor: tag.color } : undefined}
      onMouseEnter={() => onCellHover && onCellHover(true)}
      onMouseLeave={() => onCellHover && onCellHover(false)}
    >
      {tag && (
        <span className={styles.tagPill} style={{ color: tag.color, borderColor: tag.color }}>
          {tag.label}
        </span>
      )}
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
