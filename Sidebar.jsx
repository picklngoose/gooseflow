import { useState } from 'react'
import { PrepTimer } from './Timer'
import styles from './Sidebar.module.css'
import logoSrc from './logo.png'

export function Sidebar({ flows, activeFlowId, onSelectFlow, onAddFlow, onDeleteFlow, onRenameFlow, onExport, onExportPDF, onCopyClipboard, width }) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const startEdit = (flow) => { setEditingId(flow.id); setEditingName(flow.name) }
  const commitEdit = () => { if (editingName.trim()) onRenameFlow(editingId, editingName.trim()); setEditingId(null) }

  return (
    <aside className={styles.sidebar} style={width ? { width } : {}}>
      <div className={styles.logo}>
        <img src={logoSrc} alt="gooseflow" className={styles.logoMark} />
        <span className={styles.logoText}>gooseflow</span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Prep Time</div>
        <div className={styles.timerStack}>
          <PrepTimer side="aff" label="Aff" />
          <PrepTimer side="neg" label="Neg" />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Speech Timers</div>
        <div className={styles.timerStack}>
          <PrepTimer side="aff" label="Constructive" duration={480} />
          <PrepTimer side="neg" label="Rebuttal" duration={300} />
        </div>
      </div>

      <div className={styles.section} style={{ flex: 1 }}>
        <div className={styles.sectionLabel}>Flows</div>
        <div className={styles.flows}>
          {flows.map(flow => (
            <div key={flow.id} className={`${styles.flowItem} ${flow.id === activeFlowId ? styles.active : ''}`}>
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
                <button className={styles.flowName} onClick={() => onSelectFlow(flow.id)} onDoubleClick={() => startEdit(flow)}>
                  {flow.name}
                </button>
              )}
              <div className={styles.flowActions}>
                <button className={styles.flowAction} onClick={() => startEdit(flow)} title="Rename">✎</button>
                {flows.length > 1 && (
                  <button className={`${styles.flowAction} ${styles.danger}`} onClick={() => onDeleteFlow(flow.id)} title="Delete">×</button>
                )}
              </div>
            </div>
          ))}
          <button className={styles.addFlow} onClick={onAddFlow}>+ new flow</button>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.exportBtn} onClick={onExportPDF} title="Export as PDF">⎙ pdf</button>
        <button className={styles.exportBtn} onClick={onExport} title="Download as .txt">↓ txt</button>
        <button className={styles.exportBtn} onClick={onCopyClipboard} title="Copy to clipboard">⎘ copy</button>
      </div>
    </aside>
  )
}
