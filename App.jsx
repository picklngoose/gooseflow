import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebateFlow } from './useDebateFlow'
import { Sidebar } from './Sidebar'
import { SpeechColumn } from './SpeechColumn'
import styles from './App.module.css'

export default function App() {
  const {
    flows, activeFlow, activeFlowId, activeSpeechId,
    setActiveFlowId, setActiveSpeechId,
    addFlow, deleteFlow, renameFlow,
    updateCell, addCell, deleteCell,
    addConnection, removeConnection,
    exportFlow,
  } = useDebateFlow()

  const [drawingMode, setDrawingMode] = useState(false)
  const [selectedCellId, setSelectedCellId] = useState(null)
  const [, forceUpdate] = useState(0)

  const cellRefsMap = useRef(new Map())
  const flowBoardRef = useRef(null)
  const svgRef = useRef(null)

  // Rerender lines on scroll or resize
  useEffect(() => {
    const el = flowBoardRef.current
    if (!el) return
    const update = () => forceUpdate(n => n + 1)
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Exit drawing mode on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setDrawingMode(false); setSelectedCellId(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCellClick = useCallback((cellId) => {
    if (!selectedCellId) {
      setSelectedCellId(cellId)
    } else if (selectedCellId === cellId) {
      setSelectedCellId(null)
    } else {
      addConnection(selectedCellId, cellId)
      setSelectedCellId(null)
    }
  }, [selectedCellId, addConnection])

  const getLineCoords = useCallback((fromCellId, toCellId) => {
    const fromEl = cellRefsMap.current.get(fromCellId)
    const toEl = cellRefsMap.current.get(toCellId)
    const svgEl = svgRef.current
    if (!fromEl || !toEl || !svgEl) return null

    const svgRect = svgEl.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    const x1 = fromRect.right - svgRect.left
    const y1 = fromRect.top + fromRect.height / 2 - svgRect.top
    const x2 = toRect.left - svgRect.left
    const y2 = toRect.top + toRect.height / 2 - svgRect.top

    return { x1, y1, x2, y2 }
  }, [])

  if (!activeFlow) return null

  const speeches = activeSpeechId === 'all'
    ? activeFlow.speeches
    : activeFlow.speeches.filter(s => s.id === activeSpeechId)

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
              {new Date(activeFlow.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
            <button
              className={`${styles.viewBtn} ${drawingMode ? styles.drawActive : ''}`}
              onClick={() => { setDrawingMode(d => !d); setSelectedCellId(null) }}
              title="Draw connection lines between arguments (Esc to exit)"
            >{drawingMode ? 'done' : 'connect'}</button>
          </div>
        </div>

        <div
          ref={flowBoardRef}
          className={styles.flowBoard}
          onClick={() => drawingMode && setSelectedCellId(null)}
        >
          {/* SVG overlay for connection lines */}
          <svg
            ref={svgRef}
            className={styles.lineOverlay}
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <marker id="arrowAff" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--accent-aff-dim)" />
              </marker>
              <marker id="arrowNeg" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--accent-neg-dim)" />
              </marker>
            </defs>
            {activeFlow.connections.map(conn => {
              const coords = getLineCoords(conn.fromCellId, conn.toCellId)
              if (!coords) return null
              const { x1, y1, x2, y2 } = coords
              const cx = (x1 + x2) / 2
              const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
              return (
                <g key={conn.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--border-bright)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.6"
                    markerEnd="url(#arrowNeg)"
                  />
                  {/* Invisible wider hit area for clicking to delete */}
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={() => removeConnection(conn.id)}
                    title="Click to remove"
                  />
                </g>
              )
            })}
          </svg>

          {speeches.map(speech => (
            <SpeechColumn
              key={speech.id}
              speech={speech}
              onUpdateCell={updateCell}
              onAddCell={addCell}
              onDeleteCell={deleteCell}
              drawingMode={drawingMode}
              selectedCellId={selectedCellId}
              onCellClick={handleCellClick}
              cellRefsMap={cellRefsMap}
            />
          ))}
        </div>

        {drawingMode && (
          <div className={styles.drawHint}>
            {selectedCellId ? 'now click another argument to connect → click line to delete · Esc to cancel' : 'click an argument to start a connection · Esc to exit'}
          </div>
        )}
      </main>
    </div>
  )
}
