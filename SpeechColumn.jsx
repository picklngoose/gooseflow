import { useState, useRef, useCallback } from 'react'
import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, onReorderItems, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered }) {
  const items = speech.items || []

  // dragState: which item is being dragged and where the placeholder sits
  const [dragItemId, setDragItemId] = useState(null)
  const [placeholderIndex, setPlaceholderIndex] = useState(null)

  const itemRefs = useRef({})        // itemId → DOM el
  const dragInfo = useRef(null)      // mutable drag data

  const onPointerDown = useCallback((e, itemId) => {
    if (e.button !== 0) return
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
    e.preventDefault()

    const el = itemRefs.current[itemId]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const idx = items.findIndex(it => it.id === itemId)

    dragInfo.current = {
      itemId,
      originIndex: idx,
      offsetY: e.clientY - rect.top,   // cursor offset within the element
      height: rect.height,
    }

    setDragItemId(itemId)
    setPlaceholderIndex(idx)

    // Move the element to fixed position immediately
    el.style.position = 'fixed'
    el.style.zIndex = '9999'
    el.style.width = `${rect.width}px`
    el.style.left = `${rect.left}px`
    el.style.top = `${e.clientY - dragInfo.current.offsetY}px`
    el.style.pointerEvents = 'none'
    el.style.opacity = '0.9'
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'

    el.setPointerCapture(e.pointerId)
  }, [items])

  const onPointerMove = useCallback((e) => {
    if (!dragInfo.current) return
    const { itemId, offsetY, height } = dragInfo.current
    const el = itemRefs.current[itemId]
    if (!el) return

    // Move element with cursor
    el.style.top = `${e.clientY - offsetY}px`

    // Find new placeholder index by checking midpoints of other items
    const dragCenter = e.clientY - offsetY + height / 2
    let newIndex = items.length - 1  // default to last

    for (let i = 0; i < items.length; i++) {
      if (items[i].id === itemId) continue
      const otherEl = itemRefs.current[items[i].id]
      if (!otherEl) continue
      const otherRect = otherEl.getBoundingClientRect()
      if (dragCenter < otherRect.top + otherRect.height / 2) {
        newIndex = i
        break
      }
    }

    setPlaceholderIndex(newIndex)
    dragInfo.current.placeholderIndex = newIndex
  }, [items])

  const onPointerUp = useCallback((e) => {
    if (!dragInfo.current) return
    const { itemId, placeholderIndex: finalIndex } = dragInfo.current

    // Restore element styles
    const el = itemRefs.current[itemId]
    if (el) {
      el.style.position = ''
      el.style.zIndex = ''
      el.style.width = ''
      el.style.left = ''
      el.style.top = ''
      el.style.pointerEvents = ''
      el.style.opacity = ''
      el.style.boxShadow = ''
    }

    // Commit reorder
    if (finalIndex !== null) {
      const without = items.filter(it => it.id !== itemId)
      const dragged = items.find(it => it.id === itemId)
      if (dragged) {
        // finalIndex is the index in the original array, adjust for removal
        const insertAt = Math.min(finalIndex, without.length)
        without.splice(insertAt, 0, dragged)
        onReorderItems(speech.id, without)
      }
    }

    dragInfo.current = null
    setDragItemId(null)
    setPlaceholderIndex(null)
  }, [items, speech.id, onReorderItems])

  // Build the rendered list: insert a placeholder at placeholderIndex
  const renderItems = []
  let itemsWithoutDragged = items
  const dragged = dragItemId ? items.find(it => it.id === dragItemId) : null

  if (dragItemId && placeholderIndex !== null) {
    itemsWithoutDragged = items.filter(it => it.id !== dragItemId)
    const clampedIdx = Math.min(placeholderIndex, itemsWithoutDragged.length)
    itemsWithoutDragged = [
      ...itemsWithoutDragged.slice(0, clampedIdx),
      { id: '__placeholder__', type: 'placeholder', height: dragInfo.current?.height || 36 },
      ...itemsWithoutDragged.slice(clampedIdx),
    ]
  }

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

      <div className={styles.cells}>
        {itemsWithoutDragged.map(item => {
          if (item.type === 'placeholder') {
            return (
              <div
                key="__placeholder__"
                className={styles.placeholder}
                style={{ height: item.height }}
              />
            )
          }

          return (
            <div
              key={item.id}
              ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id] }}
              className={styles.itemWrapper}
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
                    if (el) cellRefsMap.current.set(item.id, el)
                    else cellRefsMap.current.delete(item.id)
                  }}
                />
              )}
            </div>
          )
        })}

        {/* The dragged item is still rendered (now fixed-position) so its ref stays valid */}
        {dragged && (
          <div
            key={dragged.id}
            ref={el => { if (el) itemRefs.current[dragged.id] = el; else delete itemRefs.current[dragged.id] }}
            className={styles.itemWrapper}
            style={{ position: 'fixed', visibility: 'hidden' }} // hidden clone to keep ref alive
            aria-hidden
          >
            {dragged.type === 'space' ? (
              <div className={styles.emptySpace} />
            ) : (
              <FlowCell
                cell={dragged}
                speechId={speech.id}
                side={speech.side}
                onUpdate={() => {}}
                onDelete={() => {}}
                onAddBelow={() => {}}
                isSelected={false}
                onKnobClick={null}
                ref={(el) => {
                  if (el) cellRefsMap.current.set(dragged.id, el)
                  else cellRefsMap.current.delete(dragged.id)
                }}
              />
            )}
          </div>
        )}

        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
      </div>
    </div>
  )
}
