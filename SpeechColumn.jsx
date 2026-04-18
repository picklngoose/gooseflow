import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, onAddEmptySpace, onDeleteEmptySpace, pendingCellIds, onKnobClick, cellRefsMap, onHover, isHovered }) {
  const cells = speech.items.filter(it => it.type === 'cell')

  return (
    <div
      className={`${styles.column} ${styles[speech.side]} ${isHovered ? styles.hovered : ''}`}
      onMouseEnter={() => onHover(speech.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={styles.header}>
        <span className={`${styles.label} ${styles[speech.side]}`}>{speech.label}</span>
        <Timer key={speech.id} duration={speech.time} side={speech.side} />
      </div>

      <div className={styles.cells}>
        {speech.items.map(item => {
          if (item.type === 'space') {
            return (
              <div
                key={item.id}
                className={styles.emptySpace}
                onContextMenu={(e) => { e.preventDefault(); onDeleteEmptySpace(speech.id, item.id) }}
                title="Right-click to delete"
              />
            )
          }
          return (
            <FlowCell
              key={item.id}
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
          )
        })}
        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
      </div>
    </div>
  )
}
