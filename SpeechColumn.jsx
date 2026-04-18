import { useState, useRef, useCallback } from 'react'
import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, onReorderItems, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered }) {
  const [dragOverId, setDragOverId] = useState(null)
  const [dragOverPos, setDragOverPos] = useState(null) // 'before' | 'after'
  const dragItemId = useRef(null)

  const items = speech.items || speech.cells?.map(c => ({ ...c, type: 'cell' })) || []

  const handleDragStart = useCallback((e, itemId) => {
    dragItemId.current = itemId
    e.dataTransfer.effectAllowed = 'move'
    // Transparent drag image
    const ghost = document.createElement('div')
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }, [])

  const handleDragOver = useCallback((e, itemId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (itemId === dragItemId.current) { setDragOverId(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    setDragOverId(itemId)
    setDragOverPos(e.clientY < mid ? 'before' : 'after')
  }, [])

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault()
    const fromId = dragItemId.current
    if (!fromId || fromId === targetId) { setDragOverId(null); return }

    const oldItems = [...items]
    const fromIdx = oldItems.findIndex(it => it.id === fromId)
    const toIdx = oldItems.findIndex(it => it.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragOverId(null); return }

    const rect = e.currentTarget.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const insertAfter = e.clientY >= mid

    const newItems = oldItems.filter(it => it.id !== fromId)
    const insertIdx = newItems.findIndex(it => it.id === targetId)
    newItems.splice(insertAfter ? insertIdx + 1 : insertIdx, 0, oldItems[fromIdx])

    onReorderItems(speech.id, newItems)
    dragItemId.current = null
    setDragOverId(null)
    setDragOverPos(null)
  }, [items, speech.id, onReorderItems])

  const handleDragEnd = useCallback(() => {
    dragItemId.current = null
    setDragOverId(null)
    setDragOverPos(null)
  }, [])

  return (
    <div
      className={`${styles.column} ${styles[speech.side]} ${isHovered ? styles.hovered : ''}`}
      onMouseEnter={() => onHover && onHover(speech.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className={styles.header}>
        <span className={`${styles.label} ${styles[speech.side]}`}>{speech.label}</span>
        <Timer key={speech.id} duration={speech.time} side={speech.side} />
      </div>

      <div
        className={styles.cells}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // Drop onto empty area at end
          if (dragItemId.current && dragOverId === null) {
            const fromId = dragItemId.current
            const newItems = items.filter(it => it.id !== fromId)
            const moved = items.find(it => it.id === fromId)
            if (moved) onReorderItems(speech.id, [...newItems, moved])
            dragItemId.current = null
          }
        }}
      >
        {items.map(item => {
          const isOver = dragOverId === item.id
          return (
            <div
              key={item.id}
              className={`${styles.itemWrapper} ${isOver && dragOverPos === 'before' ? styles.dropBefore : ''} ${isOver && dragOverPos === 'after' ? styles.dropAfter : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
            >
              {item.type === 'space' ? (
                <div
                  className={styles.emptySpace}
                  onContextMenu={(e) => { e.preventDefault(); onDeleteEmptySpace(speech.id, item.id) }}
                />
              ) : (
                <FlowCell
                  cell={item}
                  speechId={speech.id}
                  side={speech.side}
                  onUpdate={(updates) => onUpdateCell(speech.id, item.id, updates)}
                  onDelete={() => onDeleteCell(speech.id, item.id)}
                  onAddBelow={() => onAddCell(speech.id)}
                  isSelected={pendingCellIds ? pendingCellIds.has(item.id) : false}
                  onKnobClick={onKnobClick ? () => onKnobClick(speech.id, item.id) : null}
                  ref={(el) => {
                    if (el) cellRefsMap.current.set(item.id, el)
                    else cellRefsMap.current.delete(item.id)
                  }}
                />
              )}
            </div>
          )
        })}
        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
      </div>
    </div>
  )
}
