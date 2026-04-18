import { useState } from 'react'
import { PrepTimer, SidebarTimer } from './Timer'
import styles from './Sidebar.module.css'

export function Sidebar({ flows, activeFlowId, onSelectFlow, onAddFlow, onDeleteFlow, onRenameFlow, onExport }) {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const startEdit = (flow) => { setEditingId(flow.id); setEditingName(flow.name) }
  const commitEdit = () => { if (editingName.trim()) onRenameFlow(editingId, editingName.trim()); setEditingId(null) }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>⬡</span>
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
        <div className={styles.sectionLabel}>Constructives · 8m</div>
        <div className={styles.timerStack}>
          <SidebarTimer label="1AC" duration={480} side="aff" />
          <SidebarTimer label="1NC" duration={480} side="neg" />
          <SidebarTimer label="2AC" duration={480} side="aff" />
          <SidebarTimer label="2NC" duration={480} side="neg" />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Rebuttals · 5m</div>
        <div className={styles.timerStack}>
          <SidebarTimer label="1NR" duration={300} side="neg" />
          <SidebarTimer label="1AR" duration={300} side="aff" />
          <SidebarTimer label="2NR" duration={300} side="neg" />
          <SidebarTimer label="2AR" duration={300} side="aff" />
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
        <button className={styles.exportBtn} onClick={onExport}>↓ export</button>
      </div>
    </aside>
  )
}
