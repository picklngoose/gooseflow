import { useRef, useCallback } from 'react'
import styles from './FlowCell.module.css'

const TAGS = [
  { id: 'xt', label: '✓ XT', title: 'Extended' },
  { id: 'drop', label: '⚠ DROP', title: 'Dropped' },
  { id: 'turn', label: '↩ Turn', title: 'Turn' },
  { id: 'nr', label: 'NR', title: 'No Response' },
  { id: 'cond', label: 'COND', title: 'Conditional' },
  { id: 'cw', label: 'CW', title: 'Counterwarrant' },
]

export function FlowCell({ cell, speechId, side, onUpdate, onDelete, onAddBelow, onClick, onKnobClick, isSelected = false }) {
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
    // Auto-grow
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [onUpdate])

  const toggleTag = useCallback((tagId) => {
    const tags = cell.tags.includes(tagId)
      ? cell.tags.filter(t => t !== tagId)
      : [...cell.tags, tagId]
    onUpdate({ tags })
  }, [cell.tags, onUpdate])

  const handleKnobClick = useCallback((direction, e) => {
    e.stopPropagation()
    if (onKnobClick) {
      onKnobClick(speechId, cell.id, direction)
    }
  }, [speechId, cell.id, onKnobClick])

  const isDrop = cell.tags.includes('drop')
  const isTurn = cell.tags.includes('turn')

  return (
    <div className={`${styles.cell} ${styles[side]} ${isDrop ? styles.dropped : ''} ${isTurn ? styles.turned : ''} ${isSelected ? styles.selected : ''}`} onClick={onClick}>
      <div className={styles.knobLeft} onClick={(e) => handleKnobClick('left', e)} title="Connect from left"></div>
      <div className={styles.main}>
        <textarea
          ref={textRef}
          value={cell.content}
          onChange={handleChange}
          onKeyDown={handleKey}
          placeholder="Flow..."
          rows={1}
          className={styles.textarea}
        />
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete cell">×</button>
      </div>
      <div className={styles.knobRight} onClick={(e) => handleKnobClick('right', e)} title="Connect from right"></div>
      <div className={styles.tags}>
        {TAGS.map(tag => (
          <button
            key={tag.id}
            className={`${styles.tag} ${styles[`tag_${tag.id}`]} ${cell.tags.includes(tag.id) ? styles.active : ''}`}
            onClick={() => toggleTag(tag.id)}
            title={tag.title}
          >
            {tag.label}
          </button>
        ))}
        <button className={styles.addBtn} onClick={onAddBelow} title="Add cell below (Ctrl+Enter)">
          + arg
        </button>
      </div>
    </div>
  )
}
