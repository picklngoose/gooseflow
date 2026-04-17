import { Timer } from './Timer'
import { FlowCell } from './FlowCell'
import styles from './SpeechColumn.module.css'

export function SpeechColumn({ speech, onUpdateCell, onAddCell, onDeleteCell }) {
  return (
    <div className={`${styles.column} ${styles[speech.side]}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={`${styles.label} ${styles[speech.side]}`}>{speech.label}</span>
          <span className={`${styles.side} ${styles[speech.side]}`}>{speech.side.toUpperCase()}</span>
        </div>
        <Timer
          key={speech.id}
          duration={speech.time}
          label={speech.label}
          side={speech.side}
        />
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
          />
        ))}
        <button className={styles.addCell} onClick={() => onAddCell(speech.id)}>
          + add
        </button>
      </div>
    </div>
  )
}
