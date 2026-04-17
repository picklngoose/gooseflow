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
  // selectedCells is now an array of { speechId, cellId } to support group-response
  const [selectedCells, setSelectedCells] = useState([])
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

  // Re-render connection lines after flow switch — cell DOM refs need one tick to populate
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 50)
    return () => clearTimeout(timer)
  }, [activeFlowId])

  // Exit drawing mode on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setDrawingMode(false); setSelectedCells([]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCellClick = useCallback((speechId, cellId) => {
    if (selectedCells.length === 0) {
      // Nothing selected — start a new selection
      setSelectedCells([{ speechId, cellId }])
      return
    }

    const firstSpeechId = selectedCells[0].speechId

    if (speechId === firstSpeechId) {
      // Same speech as current selection — toggle this cell in/out of the group
      const alreadySelected = selectedCells.some(s => s.cellId === cellId)
      if (alreadySelected) {
        const next = selectedCells.filter(s => s.cellId !== cellId)
        setSelectedCells(next)
      } else {
        setSelectedCells(prev => [...prev, { speechId, cellId }])
      }
      return
    }

    // Different speech — fire connections from every selected cell to this target
    selectedCells.forEach(src => {
      addConnection(src.cellId, cellId)
    })
    setSelectedCells([])
  }, [selectedCells, addConnection])

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

  const selectedCellIds = new Set(selectedCells.map(s => s.cellId))

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
            {activeSpeechId === 'all' && (
              <button
                className={`${styles.viewBtn} ${drawingMode ? styles.drawActive : ''}`}
                onClick={() => { setDrawingMode(d => !d); setSelectedCells([]) }}
                title="Draw connection lines between arguments (Esc to exit)"
              >{drawingMode ? 'done' : 'connect'}</button>
            )}
          </div>
        </div>

        <div
          ref={flowBoardRef}
          className={styles.flowBoard}
          onClick={(e) => {
            if (drawingMode && e.target === flowBoardRef.current) setSelectedCells([])
          }}
        >
          {/* SVG overlay for connection lines */}
          <svg
            ref={svgRef}
            className={styles.lineOverlay}
            style={{ pointerEvents: drawingMode ? 'none' : 'none' }}
          >
            <defs>
              <marker id="arrowConn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-purple)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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
                    stroke="var(--accent-purple)"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    opacity="0.55"
                    markerEnd="url(#arrowConn)"
                  />
                  {/* Delete hit area — only active in connect mode */}
                  {drawingMode && (
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      onClick={(e) => { e.stopPropagation(); removeConnection(conn.id) }}
                      title="Click to remove"
                    />
                  )}
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
              selectedCellIds={selectedCellIds}
              onCellClick={handleCellClick}
              cellRefsMap={cellRefsMap}
            />
          ))}
        </div>

        {drawingMode && (
          <div className={styles.drawHint}>
            {selectedCells.length > 0
              ? `${selectedCells.length} selected · click more in same speech to add to group, or click target in another speech · Esc to cancel`
              : 'click argument(s) to select (multi-select in same speech), then click target in another speech · click line to delete · Esc to exit'}
          </div>
        )}
      </main>
    </div>
  )
}
