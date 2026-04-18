import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, onReorderItems, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered, onDragMove }) {
  const items = speech.items || []
  const [drag, setDrag] = useState(null)
  const itemRefs = useRef({})
  const dragRef = useRef(null)

  const startDrag = useCallback((e, itemId) => {
    if (e.button !== 0) return
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
    e.preventDefault()

    const el = itemRefs.current[itemId]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const item = items.find(it => it.id === itemId)
    const offsetY = e.clientY - rect.top

    // Cache ALL item positions at drag start — prevents oscillation from placeholder shifting
    const cachedRects = {}
    for (const it of items) {
      const itEl = itemRefs.current[it.id]
      if (itEl) cachedRects[it.id] = itEl.getBoundingClientRect()
    }

    // Create a fake element whose getBoundingClientRect returns live drag position.
    // This is synchronous — no React render timing dependency.
    let currentY = e.clientY - offsetY
    const fakeEl = {
      getBoundingClientRect: () => ({
        left: rect.left,
        right: rect.right,
        top: currentY,
        bottom: currentY + rect.height,
        height: rect.height,
        width: rect.width,
      })
    }
    cellRefsMap.current.set(itemId, fakeEl)

    const calcPlaceholder = (clientY) => {
      const others = items.filter(it => it.id !== itemId)
      for (let i = 0; i < others.length; i++) {
        const r = cachedRects[others[i].id]
        if (!r) continue
        if (clientY - offsetY + rect.height / 2 < r.top + r.height / 2) return i
      }
      return others.length
    }

    const initialPlaceholder = calcPlaceholder(e.clientY)
    dragRef.current = { itemId, offsetY, placeholderIndex: initialPlaceholder }

    setDrag({
      itemId,
      x: rect.left,
      y: currentY,
      width: rect.width,
      placeholderIndex: initialPlaceholder,
      content: item?.content ?? null,
      isSpace: item?.type === 'space',
      side: speech.side,
    })

    const onMove = (e) => {
      if (!dragRef.current) return
      currentY = e.clientY - dragRef.current.offsetY
      const newPlaceholder = calcPlaceholder(e.clientY)
      dragRef.current.placeholderIndex = newPlaceholder

      // Move floating div directly — synchronous, no React lag
      const floatingEl = document.getElementById('gooseflow-drag-ghost')
      if (floatingEl) floatingEl.style.top = currentY + 'px'

      setDrag(prev => prev ? { ...prev, y: currentY, placeholderIndex: newPlaceholder } : null)
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
      if (dragged) {
        const without = items.filter(it => it.id !== itemId)
        without.splice(Math.min(placeholderIndex, without.length), 0, dragged)
        onReorderItems(speech.id, without)
      }
      // cellRefsMap will be restored by FlowCell ref on next render.
      // Fire onDragMove on the next two animation frames so the SVG lines
      // redraw after React has committed the real DOM refs.
      if (onDragMove) {
        requestAnimationFrame(() => {
          onDragMove()
          requestAnimationFrame(() => onDragMove())
        })
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [items, speech.id, speech.side, cellRefsMap, onReorderItems, onDragMove])

  // Build display list with placeholder
  let displayItems = items
  if (drag) {
    const without = items.filter(it => it.id !== drag.itemId)
    without.splice(Math.min(drag.placeholderIndex, without.length), 0, { id: '__placeholder__', type: 'placeholder' })
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
      </div>

      <div className={styles.cells}>
        {displayItems.map(item => {
          if (item.type === 'placeholder') {
            return (
              <div key="__placeholder__" className={`${styles.placeholder} ${drag?.isSpace ? styles.placeholderSpace : ''}`}>
                {!drag?.isSpace && <span className={styles.placeholderText}>{drag?.content || ''}</span>}
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
                <div className={styles.emptySpace} onContextMenu={(e) => { e.preventDefault(); onDeleteEmptySpace(speech.id, item.id) }} />
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
                    if (el) {
                      cellRefsMap.current.set(item.id, el)
                    } else if (!dragRef.current || dragRef.current.itemId !== item.id) {
                      // Only delete if we're NOT currently dragging this item
                      // (otherwise we'd overwrite our fake getBoundingClientRect object)
                      cellRefsMap.current.delete(item.id)
                    }
                  }}
                />
              )}
            </div>
          )
        })}
        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
      </div>

      {drag && createPortal(
        <div
          id="gooseflow-drag-ghost"
          className={`${styles.floatingCell} ${drag.isSpace ? styles.floatingSpace : ''} ${styles[drag.side]}`}
          style={{ top: drag.y, left: drag.x, width: drag.width }}
        >
          {!drag.isSpace && <span className={styles.floatingText}>{drag.content || <em className={styles.floatingPlaceholder}>flow...</em>}</span>}
        </div>,
        document.body
      )}
    </div>
  )
}
