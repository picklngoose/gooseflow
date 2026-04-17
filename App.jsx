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

  // pendingFrom: array of { speechId, cellId } — cells whose knob has been clicked
  const [pendingFrom, setPendingFrom] = useState([])
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

  // Re-render connection lines after flow or view switch
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 50)
    return () => clearTimeout(timer)
  }, [activeFlowId, activeSpeechId])

  // Cancel pending on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPendingFrom([]) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Clicking the connect knob on a cell
  const handleKnobClick = useCallback((speechId, cellId) => {
    if (pendingFrom.length === 0) {
      // Start: select this cell as source
      setPendingFrom([{ speechId, cellId }])
      return
    }

    const fromSpeechId = pendingFrom[0].speechId

    if (speechId === fromSpeechId) {
      // Same speech — toggle in/out of the source group
      const already = pendingFrom.some(p => p.cellId === cellId)
      if (already) {
        setPendingFrom(prev => prev.filter(p => p.cellId !== cellId))
      } else {
        setPendingFrom(prev => [...prev, { speechId, cellId }])
      }
      return
    }

    // Different speech — fire all connections and clear
    pendingFrom.forEach(src => addConnection(src.cellId, cellId))
    setPendingFrom([])
  }, [pendingFrom, addConnection])

  const getLineCoords = useCallback((fromCellId, toCellId) => {
    const fromEl = cellRefsMap.current.get(fromCellId)
    const toEl = cellRefsMap.current.get(toCellId)
    const svgEl = svgRef.current
    if (!fromEl || !toEl || !svgEl) return null
    const svgRect = svgEl.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()
    return {
      x1: fromRect.right - svgRect.left,
      y1: fromRect.top + fromRect.height / 2 - svgRect.top,
      x2: toRect.left - svgRect.left,
      y2: toRect.top + toRect.height / 2 - svgRect.top,
    }
  }, [])

  if (!activeFlow) return null

  const speeches = activeSpeechId === 'all'
    ? activeFlow.speeches
    : activeFlow.speeches.filter(s => s.id === activeSpeechId)

  const pendingCellIds = new Set(pendingFrom.map(p => p.cellId))
  const isPending = pendingFrom.length > 0

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
          </div>
        </div>

        <div
          ref={flowBoardRef}
          className={styles.flowBoard}
          onClick={(e) => { if (e.target === flowBoardRef.current) setPendingFrom([]) }}
        >
          {/* SVG overlay — only in all-speeches view */}
          {activeSpeechId === 'all' && (
            <svg ref={svgRef} className={styles.lineOverlay}>
              <defs>
                <marker id="arrowConn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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
                    <path d={d} fill="none" stroke="var(--accent-yellow)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" markerEnd="url(#arrowConn)" />
                    {/* Always-active hit area to delete by clicking the line */}
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      onClick={() => removeConnection(conn.id)}
                    />
                  </g>
                )
              })}
            </svg>
          )}

          {speeches.map(speech => (
            <SpeechColumn
              key={speech.id}
              speech={speech}
              onUpdateCell={updateCell}
              onAddCell={addCell}
              onDeleteCell={deleteCell}
              pendingCellIds={pendingCellIds}
              isPending={isPending}
              onKnobClick={handleKnobClick}
              cellRefsMap={cellRefsMap}
              showKnobs={activeSpeechId === 'all'}
            />
          ))}
        </div>

        {isPending && activeSpeechId === 'all' && (
          <div className={styles.drawHint}>
            {pendingFrom.length === 1
              ? 'click knob on another speech to connect, or more knobs here to group · Esc to cancel'
              : `${pendingFrom.length} selected · click knob in another speech to connect all · Esc to cancel`}
          </div>
        )}
      </main>
    </div>
  )
}
