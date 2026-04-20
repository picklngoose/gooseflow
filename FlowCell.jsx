import { useRef, useCallback, useState, forwardRef } from 'react'
import styles from './FlowCell.module.css'

const TAG_COLORS = [
  '#ffd166',
  '#00e5a0',
  '#4d9fff',
  '#b580ff',
  '#ff9f5a',
  '#ff6b9d',
]

function detectTag(content) {
  if (!content) return null
  const firstWord = content.trimStart().split(/\s/)[0]
  // Trigger as soon as first word ends with : or - and has at least 1 char before it
  const match = firstWord.match(/^(.+)[:–-]$/)
  if (!match) return null
  const label = match[1]
  let hash = 0
  for (let i = 0; i < label.length; i++) hash += label.charCodeAt(i)
  return { label, firstWord, color: TAG_COLORS[hash % TAG_COLORS.length] }
}

export const FlowCell = forwardRef(function FlowCell(
  { cell, speechId, side, onUpdate, onDelete, onAddBelow, isSelected, onKnobClick, onCellHover },
  ref
) {
  const textareaRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  const tag = detectTag(cell.content)

  const handleChange = useCallback((e) => {
    onUpdate({ content: e.target.value })
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [onUpdate])

  const handleKeyDown = useCallback((e) => {
    // Only Cmd/Ctrl+Enter adds a new cell — plain Enter is just a newline
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onAddBelow()
    }
  }, [onAddBelow])

  const handleKnobClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onKnobClick) onKnobClick()
  }, [onKnobClick])

  // Build overlay spans: colored first word + plain rest
  const renderOverlay = () => {
    if (!tag) return null
    const { firstWord } = tag
    const idx = cell.content.indexOf(firstWord)
    const rest = cell.content.slice(idx + firstWord.length)
    return (
      <div className={styles.tagOverlay} aria-hidden="true">
        <span style={{ color: tag.color, fontWeight: 600 }}>{firstWord}</span>
        <span style={{ color: 'transparent' }}>{rest}</span>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${styles.cell} ${styles[side]} ${isSelected ? styles.selected : ''}`}
      style={tag ? { borderLeftColor: tag.color } : undefined}
      onMouseEnter={() => { setHovered(true); onCellHover && onCellHover(true) }}
      onMouseLeave={() => { setHovered(false); onCellHover && onCellHover(false) }}
    >
      <div className={styles.textareaWrapper}>
        {renderOverlay()}
        <textarea
          ref={textareaRef}
          value={cell.content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={hovered ? "type '[tag]:' to label" : "flow..."}
          rows={1}
          className={`${styles.textarea} ${tag ? styles.textareaTagged : ''}`}
        />
      </div>
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
