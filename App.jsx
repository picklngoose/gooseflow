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
    addEmptySpace, deleteEmptySpace,
    addConnection, removeConnection,
    exportFlow,
  } = useDebateFlow()

  const [showHelp, setShowHelp] = useState(false)
  const [, forceUpdate] = useState(0)
  const [pendingFrom, setPendingFrom] = useState([])
  const [cursor, setCursor] = useState(null)

  const cellRefsMap = useRef(new Map())
  const flowBoardRef = useRef(null)
  const svgRef = useRef(null)

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

  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 50)
    return () => clearTimeout(timer)
  }, [activeFlowId, activeSpeechId])

  useEffect(() => {
    const onMove = (e) => {
      if (pendingFrom.length === 0) return
      const svgEl = svgRef.current
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setPendingFrom([]); setCursor(null) }
      // Only handle shortcuts when no input is focused
      if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return
      
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        // Add cell to the current speech (default to 1ac if none selected)
        const speechId = activeSpeechId === 'all' ? '1ac' : activeSpeechId
        addCell(speechId)
      }
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        // Add empty space to the current speech
        const speechId = activeSpeechId === 'all' ? '1ac' : activeSpeechId
        addEmptySpace(speechId)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [pendingFrom.length])

  const handleKnobClick = useCallback((speechId, cellId) => {
    if (pendingFrom.length === 0) {
      setPendingFrom([{ speechId, cellId }])
      return
    }
    const fromSpeechId = pendingFrom[0].speechId
    if (speechId === fromSpeechId) {
      const already = pendingFrom.some(p => p.cellId === cellId)
      if (already) {
        const next = pendingFrom.filter(p => p.cellId !== cellId)
        setPendingFrom(next)
        if (next.length === 0) setCursor(null)
      } else {
        setPendingFrom(prev => [...prev, { speechId, cellId }])
      }
      return
    }
    pendingFrom.forEach(src => addConnection(src.cellId, cellId))
    setPendingFrom([])
    setCursor(null)
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

  const getKnobCoords = useCallback((cellId) => {
    const el = cellRefsMap.current.get(cellId)
    const svgEl = svgRef.current
    if (!el || !svgEl) return null
    const svgRect = svgEl.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    return {
      x: rect.right - svgRect.left,
      y: rect.top + rect.height / 2 - svgRect.top,
    }
  }, [])

  if (!activeFlow) return null

  const showAll = activeSpeechId === 'all'
  const speeches = showAll
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
              className={`${styles.viewBtn} ${showAll ? styles.activeView : ''}`}
              onClick={() => setActiveSpeechId('all')}
            >All</button>
            <button
              className={`${styles.viewBtn} ${!showAll ? styles.activeView : ''}`}
              onClick={() => { if (showAll) setActiveSpeechId('1ac') }}
            >Single</button>
            <button
              className={styles.helpBtn}
              onClick={() => setShowHelp(!showHelp)}
              title="Help & Shortcuts"
            >💡</button>
          </div>
        </div>

        <div
          ref={flowBoardRef}
          className={styles.flowBoard}
          onClick={(e) => {
            if (e.target === flowBoardRef.current) { setPendingFrom([]); setCursor(null) }
          }}
        >
          {showAll && (
            <svg ref={svgRef} className={styles.lineOverlay}>
              <defs>
                <marker id="arrowConn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
                <marker id="arrowDraft" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              {/* Committed connections */}
              {activeFlow.connections.map(conn => {
                const coords = getLineCoords(conn.fromCellId, conn.toCellId)
                if (!coords) return null
                const { x1, y1, x2, y2 } = coords
                const cx = (x1 + x2) / 2
                const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
                return (
                  <g key={conn.id}>
                    {/* Visible line - no pointer events */}
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--accent-yellow)"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                      opacity="0.5"
                      markerEnd="url(#arrowConn)"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Wide invisible hit area - right-click to delete */}
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                      style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        removeConnection(conn.id)
                      }}
                    />
                  </g>
                )
              })}

              {/* Live draft lines */}
              {isPending && cursor && pendingFrom.map(src => {
                const from = getKnobCoords(src.cellId)
                if (!from) return null
                const cx = (from.x + cursor.x) / 2
                const d = `M ${from.x} ${from.y} C ${cx} ${from.y}, ${cx} ${cursor.y}, ${cursor.x} ${cursor.y}`
                return (
                  <path
                    key={`draft-${src.cellId}`}
                    d={d}
                    fill="none"
                    stroke="var(--accent-yellow)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.35"
                    markerEnd="url(#arrowDraft)"
                    style={{ pointerEvents: 'none' }}
                  />
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
              onAddEmptySpace={addEmptySpace}
              onDeleteEmptySpace={deleteEmptySpace}
              pendingCellIds={pendingCellIds}
              onKnobClick={showAll ? handleKnobClick : null}
              cellRefsMap={cellRefsMap}
            />
          ))}
        </div>

        {isPending && showAll && (
          <div className={styles.drawHint}>
            {pendingFrom.length === 1
              ? 'click a knob on another speech to connect · right-click a line to delete · Esc to cancel'
              : `${pendingFrom.length} grouped · click a knob in another speech to connect all · Esc to cancel`}
          </div>
        )}

        {showHelp && (
          <div className={styles.helpModal} onClick={() => setShowHelp(false)}>
            <div className={styles.helpContent} onClick={(e) => e.stopPropagation()}>
              <h3>Keyboard Shortcuts & Help</h3>
              <div className={styles.helpSection}>
                <h4>Adding Content</h4>
                <div className={styles.shortcut}>
                  <kbd>a</kbd>
                  <span>Add a new argument cell below</span>
                </div>
                <div className={styles.shortcut}>
                  <kbd>b</kbd>
                  <span>Add an empty space</span>
                </div>
              </div>
              <div className={styles.helpSection}>
                <h4>Cells</h4>
                <div className={styles.shortcut}>
                  <kbd>Ctrl+Enter</kbd>
                  <span>Add argument below (when editing)</span>
                </div>
                <div className={styles.shortcut}>
                  <kbd>Ctrl+Backspace</kbd>
                  <span>Delete empty cell (when editing)</span>
                </div>
                <div className={styles.shortcut}>
                  <kbd>Right-click</kbd>
                  <span>Delete cell</span>
                </div>
              </div>
              <div className={styles.helpSection}>
                <h4>Empty Spaces</h4>
                <div className={styles.shortcut}>
                  <kbd>Right-click</kbd>
                  <span>Delete empty space</span>
                </div>
              </div>
              <div className={styles.helpSection}>
                <h4>Connections</h4>
                <div className={styles.shortcut}>
                  <span>Hover over cell knobs</span>
                  <span>Click knobs to create connections</span>
                </div>
                <div className={styles.shortcut}>
                  <kbd>Right-click</kbd>
                  <span>Delete connection line</span>
                </div>
                <div className={styles.shortcut}>
                  <kbd>Esc</kbd>
                  <span>Cancel connection drawing</span>
                </div>
              </div>
              <div className={styles.helpSection}>
                <h4>Navigation</h4>
                <div className={styles.shortcut}>
                  <kbd>Double-click</kbd>
                  <span>Rename flow (on flow title)</span>
                </div>
              </div>
              <button className={styles.closeHelp} onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
