import { useState, useCallback } from 'react'
import { useDebateFlow } from './useDebateFlow'
import { Sidebar } from './Sidebar'
import { SpeechColumn } from './SpeechColumn'
import styles from './App.module.css'

export default function App() {
  const {
    flows,
    activeFlow,
    activeFlowId,
    activeSpeechId,
    setActiveFlowId,
    setActiveSpeechId,
    addFlow,
    deleteFlow,
    renameFlow,
    updateCell,
    addCell,
    deleteCell,
    exportFlow,
  } = useDebateFlow()

  if (!activeFlow) return null

  return (
    <div className={styles.app}>
      <Sidebar
        flows={flows}
        activeFlowId={activeFlowId}
        activeSpeechId={activeSpeechId}
        onSelectFlow={setActiveFlowId}
        onAddFlow={addFlow}
        onDeleteFlow={deleteFlow}
        onRenameFlow={renameFlow}
        onSelectSpeech={setActiveSpeechId}
        onExport={exportFlow}
      />

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <h1 className={styles.flowTitle}>{activeFlow.name}</h1>
            <span className={styles.flowDate}>
              {new Date(activeFlow.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${activeSpeechId === 'all' ? styles.activeView : ''}`}
              onClick={() => setActiveSpeechId('all')}
            >All</button>
            <button
              className={`${styles.viewBtn} ${activeSpeechId !== 'all' ? styles.activeView : ''}`}
              onClick={() => { if (activeSpeechId === 'all') setActiveSpeechId('1ac') }}
            >Single</button>
          </div>
        </div>

        <div className={styles.flowBoard}>
          {activeSpeechId === 'all'
            ? activeFlow.speeches.map(speech => (
                <SpeechColumn
                  key={speech.id}
                  speech={speech}
                  onUpdateCell={updateCell}
                  onAddCell={addCell}
                  onDeleteCell={deleteCell}
                />
              ))
            : (() => {
                const speech = activeFlow.speeches.find(s => s.id === activeSpeechId)
                if (!speech) return null
                return (
                  <SpeechColumn
                    speech={speech}
                    onUpdateCell={updateCell}
                    onAddCell={addCell}
                    onDeleteCell={deleteCell}
                  />
                )
              })()
          }
        </div>
      </main>
    </div>
  )
}
