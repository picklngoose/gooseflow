import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, onReorderItems, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered }) {
  const items = speech.items || []

  const [dragState, setDragState] = useState(null)
  // dragState: { itemId, ghostContent, ghostHeight, cursorY, insertBeforeId }

  const itemRefs = useRef({})
  const columnRef = useRef(null)
  const ghostRef = useRef(null)
  const dragData = useRef(null) // live mutable drag data to avoid stale closures

  const getInsertTarget = useCallback((clientY) => {
    // Find which item the cursor is nearest to and whether to insert before/after
    let best = null
    let bestDist = Infinity
    for (const item of items) {
      const el = itemRefs.current[item.id]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(clientY - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = { id: item.id, before: clientY < mid }
      }
    }
    return best
  }, [items])

  const onPointerDown = useCallback((e, itemId) => {
    // Only trigger on the drag handle (left button, not inside textarea)
    if (e.button !== 0) return
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
    e.preventDefault()

    const el = itemRefs.current[itemId]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const item = items.find(it => it.id === itemId)

    dragData.current = { itemId, startY: e.clientY, insertBeforeId: null, moved: false }

    setDragState({
      itemId,
      ghostHeight: rect.height,
      ghostContent: item?.type === 'cell' ? item.content : null,
      cursorY: e.clientY,
      insertBeforeId: null,
    })

    el.setPointerCapture(e.pointerId)
  }, [items])

  const onPointerMove = useCallback((e) => {
    if (!dragData.current) return
    dragData.current.moved = true

    const target = getInsertTarget(e.clientY)
    const insertBeforeId = target
      ? (target.before ? target.id : getNextId(target.id))
      : null

    dragData.current.insertBeforeId = insertBeforeId

    setDragState(prev => prev ? { ...prev, cursorY: e.clientY, insertBeforeId } : null)

    // Move ghost
    if (ghostRef.current) {
      ghostRef.current.style.top = `${e.clientY}px`
    }
  }, [getInsertTarget])

  const getNextId = (id) => {
    const idx = items.findIndex(it => it.id === id)
    return idx >= 0 && idx < items.length - 1 ? items[idx + 1].id : null
  }

  const onPointerUp = useCallback((e) => {
    if (!dragData.current) return
    const { itemId, insertBeforeId, moved } = dragData.current
    dragData.current = null

    if (moved) {
      // Reorder
      const oldItems = [...items]
      const draggedItem = oldItems.find(it => it.id === itemId)
      if (draggedItem) {
        const without = oldItems.filter(it => it.id !== itemId)
        if (insertBeforeId === null) {
          onReorderItems(speech.id, [...without, draggedItem])
        } else {
          const insertIdx = without.findIndex(it => it.id === insertBeforeId)
          if (insertIdx === -1) {
            onReorderItems(speech.id, [...without, draggedItem])
          } else {
            without.splice(insertIdx, 0, draggedItem)
            onReorderItems(speech.id, without)
          }
        }
      }
    }

    setDragState(null)
  }, [items, speech.id, onReorderItems])

  return (
    <div
      ref={columnRef}
      className={`${styles.column} ${styles[speech.side]} ${isHovered ? styles.hovered : ''}`}
      onMouseEnter={() => onHover && onHover(speech.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className={styles.header}>
        <span className={`${styles.label} ${styles[speech.side]}`}>{speech.label}</span>
        <Timer key={speech.id} duration={speech.time} side={speech.side} />
      </div>

      <div className={styles.cells}>
        {items.map(item => {
          const isDragging = dragState?.itemId === item.id
          const isInsertBefore = dragState?.insertBeforeId === item.id

          return (
            <div
              key={item.id}
              ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id] }}
              className={`${styles.itemWrapper} ${isDragging ? styles.dragging : ''} ${isInsertBefore ? styles.insertBefore : ''}`}
              onPointerDown={(e) => onPointerDown(e, item.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
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
                    if (el) { cellRefsMap.current.set(item.id, el); }
                    else { cellRefsMap.current.delete(item.id) }
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Drop indicator at end of list */}
        {dragState && dragState.insertBeforeId === null && (
          <div className={styles.insertBefore} style={{ marginTop: 2 }} />
        )}

        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
      </div>

      {/* Ghost element that follows cursor */}
      {dragState && (
        <div
          ref={ghostRef}
          className={`${styles.ghost} ${dragState.ghostContent === null ? styles.ghostSpace : ''}`}
          style={{ top: dragState.cursorY, height: dragState.ghostHeight }}
        >
          {dragState.ghostContent !== null && (
            <span className={styles.ghostText}>{dragState.ghostContent || 'flow...'}</span>
          )}
        </div>
      )}
    </div>
  )
}
