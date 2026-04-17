import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell, drawingMode, selectedCellId, onCellClick, cellRefsMap }) {
  return (
    <div className={`${styles.column} ${styles[speech.side]}`}>
      <div className={styles.header}>
        <span className={`${styles.label} ${styles[speech.side]}`}>{speech.label}</span>
        <Timer key={speech.id} duration={speech.time} side={speech.side} />
      </div>

      <div className={styles.cells}>
        {speech.cells.map(cell => (
          <FlowCell
            key={cell.id}
            cell={cell}
            speechId={speech.id}
            side={speech.side}
            onUpdate={(updates) => onUpdateCell(speech.id, cell.id, updates)}
            onDelete={() => onDeleteCell(speech.id, cell.id)}
            onAddBelow={() => onAddCell(speech.id)}
            drawingMode={drawingMode}
            isSelected={selectedCellId === cell.id}
            onClick={() => onCellClick && onCellClick(cell.id)}
            ref={(el) => {
              if (el) cellRefsMap.current.set(cell.id, el)
              else cellRefsMap.current.delete(cell.id)
            }}
          />
        ))}
        {!drawingMode && (
          <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>+ add</button>
        )}
      </div>
    </div>
  )
}
