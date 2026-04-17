import { useState } from 'react'
import { PrepTimer } from './Timer'
import styles from './Sidebar.module.css'
import { SPEECH_ORDER } from './useDebateFlow'

export function Sidebar({
  flows,
  activeFlowId,
  activeSpeechId,
  onSelectFlow,
  onAddFlow,
  onDeleteFlow,
  onRenameFlow,
  onSelectSpeech,
  onExport,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const startEdit = (flow) => {
    setEditingId(flow.id)
    setEditingName(flow.name)
  }

  const commitEdit = () => {
    if (editingName.trim()) onRenameFlow(editingId, editingName.trim())
    setEditingId(null)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>⬡</span>
        <span className={styles.logoText}>gooseflow</span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Prep Time</div>
        <div className={styles.prepTimers}>
          <PrepTimer side="aff" label="Aff" />
          <PrepTimer side="neg" label="Neg" />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Flows</div>
        <div className={styles.flows}>
          {flows.map(flow => (
            <div
              key={flow.id}
              className={`${styles.flowItem} ${flow.id === activeFlowId ? styles.active : ''}`}
            >
              {editingId === flow.id ? (
                <input
                  className={styles.flowNameInput}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  autoFocus
                />
              ) : (
                <button
                  className={styles.flowName}
                  onClick={() => onSelectFlow(flow.id)}
                  onDoubleClick={() => startEdit(flow)}
                >
                  {flow.name}
                </button>
              )}
              <div className={styles.flowActions}>
                <button className={styles.flowAction} onClick={() => startEdit(flow)} title="Rename">✎</button>
                {flows.length > 1 && (
                  <button
                    className={`${styles.flowAction} ${styles.danger}`}
                    onClick={() => onDeleteFlow(flow.id)}
                    title="Delete"
                  >×</button>
                )}
              </div>
            </div>
          ))}
          <button className={styles.addFlow} onClick={onAddFlow}>+ new flow</button>
        </div>
      </div>

      <div className={`${styles.section} ${styles.speechNav}`}>
        <div className={styles.sectionLabel}>Speeches</div>
        <div className={styles.speeches}>
          {SPEECH_ORDER.map(s => (
            <button
              key={s.id}
              className={`${styles.speechBtn} ${styles[s.side]} ${s.id === activeSpeechId ? styles.activeSpeech : ''}`}
              onClick={() => onSelectSpeech(s.id)}
              title={s.description}
            >
              <span className={styles.speechLabel}>{s.label}</span>
              <span className={styles.speechTime}>{s.time / 60}m</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.exportBtn} onClick={onExport}>↓ export</button>
      </div>
    </aside>
  )
}
