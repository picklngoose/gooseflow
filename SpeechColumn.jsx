import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, onReorderItems, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered, onDragMove }) {
  const items = speech.items || []

  const [drag, setDrag] = useState(null)
  // drag: { itemId, x, y, width, placeholderIndex, content, side }

  const itemRefs = useRef({})
  const dragRef = useRef(null) // mutable, avoids stale closures

  const calcPlaceholderIndex = useCallback((clientY, excludeId) => {
    const others = items.filter(it => it.id !== excludeId)
    for (let i = 0; i < others.length; i++) {
      const el = itemRefs.current[others[i].id]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return others.length
  }, [items])

  const startDrag = useCallback((e, itemId) => {
    if (e.button !== 0) return
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
    e.preventDefault()

    const el = itemRefs.current[itemId]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const item = items.find(it => it.id === itemId)

    const initialPlaceholder = calcPlaceholderIndex(e.clientY, itemId)

    dragRef.current = {
      itemId,
      offsetY: e.clientY - rect.top,
      placeholderIndex: initialPlaceholder,
    }

    setDrag({
      itemId,
      x: rect.left,
      y: e.clientY - (e.clientY - rect.top),
      width: rect.width,
      placeholderIndex: initialPlaceholder,
      content: item?.content ?? null,
      isSpace: item?.type === 'space',
      side: speech.side,
    })

    const onMove = (e) => {
      if (!dragRef.current) return
      const newY = e.clientY - dragRef.current.offsetY
      const newPlaceholder = calcPlaceholderIndex(e.clientY, dragRef.current.itemId)
      dragRef.current.placeholderIndex = newPlaceholder
      setDrag(prev => prev ? { ...prev, y: newY, placeholderIndex: newPlaceholder } : null)
      if (onDragMove) onDragMove()
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      if (!dragRef.current) return
      const { itemId, placeholderIndex } = dragRef.current
      dragRef.current = null
      setDrag(null)

      const dragged = items.find(it => it.id === itemId)
      if (!dragged) return
      const without = items.filter(it => it.id !== itemId)
      const clamp = Math.min(placeholderIndex, without.length)
      without.splice(clamp, 0, dragged)
      onReorderItems(speech.id, without)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [items, speech.id, speech.side, calcPlaceholderIndex, onReorderItems])

  // Build display list: remove dragged item, insert placeholder at new index
  let displayItems = items
  if (drag) {
    const without = items.filter(it => it.id !== drag.itemId)
    const clamp = Math.min(drag.placeholderIndex, without.length)
    without.splice(clamp, 0, { id: '__placeholder__', type: 'placeholder' })
    displayItems = without
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
        {displayItems.map(item => {
          if (item.type === 'placeholder') {
            return (
              <div key="__placeholder__" className={`${styles.placeholder} ${drag?.isSpace ? styles.placeholderSpace : ''}`}>
                {!drag?.isSpace && drag?.content !== null && (
                  <span className={styles.placeholderText}>{drag?.content || ''}</span>
                )}
              </div>
            )
          }

          return (
            <div
              key={item.id}
              ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id] }}
              className={styles.itemWrapper}
              onPointerDown={(e) => startDrag(e, item.id)}
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
                  ref={el => {
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

      {/* Floating drag element rendered into body via portal */}
      {drag && createPortal(
        <div
          className={`${styles.floatingCell} ${drag.isSpace ? styles.floatingSpace : ''} ${styles[drag.side]}`}
          style={{ top: drag.y, left: drag.x, width: drag.width }}
        >
          {!drag.isSpace && (
            <span className={styles.floatingText}>{drag.content || <em className={styles.floatingPlaceholder}>flow...</em>}</span>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
