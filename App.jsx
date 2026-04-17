import { useState } from 'react'
import { useDebateFlow } from './useDebateFlow.jsx'
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
    addConnection,
    removeConnection,
    exportFlow,
  } = useDebateFlow()

  const [drawingMode, setDrawingMode] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)

  const handleCellClick = useCallback((speechId, cellId) => {
    if (!drawingMode) return
    if (!selectedCell) {
      setSelectedCell({ speechId, cellId })
    } else {
      if (selectedCell.speechId === speechId && selectedCell.cellId === cellId) {
        setSelectedCell(null)
      } else {
        addConnection(selectedCell.speechId, selectedCell.cellId, speechId, cellId)
        setSelectedCell(null)
      }
    }
  }, [drawingMode, selectedCell, addConnection])

  if (!activeFlow) return null

  return (
    <div className={styles.app}>
      <h1 style={{color: 'white'}}>Hello World</h1>
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
            >All Speeches</button>
            <button
              className={`${styles.viewBtn} ${activeSpeechId !== 'all' ? styles.activeView : ''}`}
              onClick={() => {
                if (activeSpeechId === 'all') setActiveSpeechId('1ac')
              }}
            >Single Speech</button>
            <button
              className={`${styles.viewBtn} ${drawingMode ? styles.activeView : ''}`}
              onClick={() => setDrawingMode(!drawingMode)}
            >{drawingMode ? 'Exit Draw' : 'Draw Lines'}</button>
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
                  onCellClick={handleCellClick}
                />
              ))
            : (() => {
                const speech = activeFlow.speeches.find(s => s.id === activeSpeechId)
                if (!speech) return null
                return (
                  <div className={styles.singleView}>
                    <SpeechColumn
                      speech={speech}
                      onUpdateCell={updateCell}
                      onAddCell={addCell}
                      onDeleteCell={deleteCell}
                      onCellClick={handleCellClick}
                    />
                    <div className={styles.singleHint}>
                      <div className={styles.hintText}>
                        Navigate speeches from the sidebar or switch to All Speeches view
                      </div>
                      <div className={styles.shortcutsGrid}>
                        <kbd>Ctrl+Enter</kbd><span>New argument below</span>
                        <kbd>Ctrl+Backspace</kbd><span>Delete empty cell</span>
                        <kbd>Double-click</kbd><span>Rename flow</span>
                      </div>
                    </div>
                  </div>
                )
              })()
          }
        </div>
      </main>
    </div>
  )
}
