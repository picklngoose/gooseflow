import { useRef, useCallback, useState, useEffect, forwardRef } from 'react'
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
  if (firstWord.length >= 2 && (firstWord.endsWith(':') || firstWord.endsWith('-'))) {
    const label = firstWord.slice(0, -1)
    if (!label) return null
    let hash = 0
    for (let i = 0; i < label.length; i++) hash += label.charCodeAt(i)
    return { label, suffix: firstWord.slice(-1), color: TAG_COLORS[hash % TAG_COLORS.length] }
  }
  return null
}

export const FlowCell = forwardRef(function FlowCell(
  { cell, speechId, side, onUpdate, onDelete, onAddBelow, isSelected, onKnobClick, onCellHover },
  ref
) {
  const editRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const tag = detectTag(cell.content)

  // Sync contenteditable content when cell.content changes externally
  useEffect(() => {
    const el = editRef.current
    if (!el) return
    // Only update DOM if it differs — avoids caret jumping
    if (el.innerText !== cell.content) {
      el.innerText = cell.content
    }
  }, [cell.content])

  const handleInput = useCallback((e) => {
    const text = e.currentTarget.innerText
    onUpdate({ content: text })
    // Auto-resize is handled by CSS (min-height + word-wrap)
  }, [onUpdate])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onAddBelow()
    }
    // Prevent actual newlines — this is a single-line-ish flow cell
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAddBelow()
    }
  }, [onAddBelow])

  const handleKnobClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onKnobClick) onKnobClick()
  }, [onKnobClick])

  // Build the rendered content with colored first word if tag detected
  const renderContent = () => {
    if (!tag || !cell.content) return null
    const firstWord = cell.content.trimStart().split(/\s/)[0]
    const rest = cell.content.slice(cell.content.indexOf(firstWord) + firstWord.length)
    return (
      <>
        <span style={{ color: tag.color, fontWeight: 600 }}>{firstWord}</span>
        {rest}
      </>
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
      {tag ? (
        // Colored first word: render as a div with a hidden real contenteditable
        // We use a layered approach: display div on top, real input underneath
        <div className={styles.tagTextWrapper}>
          <div className={styles.tagDisplay} aria-hidden="true">
            <span style={{ color: tag.color, fontWeight: 600 }}>
              {cell.content.trimStart().split(/\s/)[0]}
            </span>
            {cell.content.slice(cell.content.indexOf(cell.content.trimStart().split(/\s/)[0]) + cell.content.trimStart().split(/\s/)[0].length)}
          </div>
          <textarea
            value={cell.content}
            onChange={(e) => {
              onUpdate({ content: e.target.value })
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className={`${styles.textarea} ${styles.textareaTagged}`}
            spellCheck={false}
          />
        </div>
      ) : (
        <textarea
          value={cell.content}
          onChange={(e) => {
            onUpdate({ content: e.target.value })
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder={hovered ? "type '[tag]:' to label" : "flow..."}
          rows={1}
          className={styles.textarea}
        />
      )}
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
