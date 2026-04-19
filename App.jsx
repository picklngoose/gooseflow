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
    reorderItems,
    addConnection, removeConnection,
    exportFlow,
  } = useDebateFlow()

  const [showHelp, setShowHelp] = useState(false)

  const deleteCellAndRedraw = useCallback((speechId, cellId) => {
    deleteCell(speechId, cellId)
    requestAnimationFrame(() => {
      forceUpdate(n => n + 1)
      requestAnimationFrame(() => forceUpdate(n => n + 1))
    })
  }, [deleteCell])
  const [pendingFrom, setPendingFrom] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hoveredSpeechId, setHoveredSpeechId] = useState(null)
  const [highlightConnId, setHighlightConnId] = useState(null) // visual only
  const hoveredConnRef = useRef(null) // always current — read by onKey without stale closure
  const [, forceUpdate] = useState(0)
  const hoveredCellRef = useRef(null) // { speechId, cellId, type }

  const cellRefsMap = useRef(new Map())
  const flowBoardRef = useRef(null)
  const svgRef = useRef(null)
  const connPathsRef = useRef(new Map()) // conn.id → <path> DOM element
  const activeFlowRef = useRef(activeFlow)
  useEffect(() => { activeFlowRef.current = activeFlow }, [activeFlow])

  // Redraw lines on scroll/resize
  useEffect(() => {
    const el = flowBoardRef.current
    if (!el) return
    const update = () => forceUpdate(n => n + 1)
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])



  useEffect(() => {
    const t = setTimeout(() => forceUpdate(n => n + 1), 50)
    return () => clearTimeout(t)
  }, [activeFlowId])

  useEffect(() => {
    const onMove = (e) => {
      // Update draft line cursor
      if (pendingFrom.length > 0) {
        const svgEl = svgRef.current
        if (svgEl) {
          const rect = svgEl.getBoundingClientRect()
          setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }
      }
      // Track nearest connection for x-to-delete hover
      const svgEl = svgRef.current
      if (!svgEl || connPathsRef.current.size === 0) {
        hoveredConnRef.current = null
        setHighlightConnId(null)
        return
      }
      const rect = svgEl.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      let bestId = null
      let bestDist = 12
      const connIds = (activeFlowRef.current?.connections || []).map(c => c.id)
      for (const connId of connIds) {
        const pathEl = connPathsRef.current.get(connId)
        if (!pathEl) continue
        const len = pathEl.getTotalLength()
        const steps = Math.max(20, Math.floor(len / 8))
        for (let i = 0; i <= steps; i++) {
          const pt = pathEl.getPointAtLength((i / steps) * len)
          const dist = Math.hypot(pt.x - mx, pt.y - my)
          if (dist < bestDist) { bestDist = dist; bestId = connId }
        }
      }
      hoveredConnRef.current = bestId
      setHighlightConnId(prev => prev === bestId ? prev : bestId)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setPendingFrom([]); setCursor(null) }
      if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (hoveredSpeechId) addCell(hoveredSpeechId)
      }
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (hoveredSpeechId) addEmptySpace(hoveredSpeechId)
      }
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const hovered = hoveredCellRef.current
        if (hovered) handleKnobClick(hovered.speechId, hovered.cellId)
      }
      if (e.key === 'x' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const connId = hoveredConnRef.current
        if (connId) {
          removeConnection(connId)
        } else {
          const hovered = hoveredCellRef.current
          if (hovered) {
            if (hovered.type === 'space') deleteEmptySpace(hovered.speechId, hovered.cellId)
            else deleteCellAndRedraw(hovered.speechId, hovered.cellId)
          }
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('keydown', onKey) }
  }, [pendingFrom.length, hoveredSpeechId, addCell, addEmptySpace, deleteEmptySpace, removeConnection, deleteCellAndRedraw])

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
    // Pick the correct edges depending on direction
    const goingRight = fromRect.left < toRect.left
    return {
      x1: (goingRight ? fromRect.right : fromRect.left) - svgRect.left,
      y1: fromRect.top + fromRect.height / 2 - svgRect.top,
      x2: (goingRight ? toRect.left : toRect.right) - svgRect.left,
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
      left: rect.left - svgRect.left,
      right: rect.right - svgRect.left,
      y: rect.top + rect.height / 2 - svgRect.top,
    }
  }, [])

  if (!activeFlow) return null

  const pendingCellIds = new Set(pendingFrom.map(p => p.cellId))
  const isPending = pendingFrom.length > 0

  return (
    <div className={styles.app}>
      <Sidebar
        flows={flows}
        activeFlowId={activeFlowId}
        onSelectFlow={setActiveFlowId}
        onAddFlow={addFlow}
        onDeleteFlow={deleteFlow}
        onRenameFlow={renameFlow}
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
            <button className={styles.helpBtn} onClick={() => setShowHelp(!showHelp)} title="Help">💡</button>
          </div>
        </div>

        <div
          ref={flowBoardRef}
          className={styles.flowBoard}
          onClick={(e) => { if (e.target === flowBoardRef.current) { setPendingFrom([]); setCursor(null) } }}
        >
          <svg ref={svgRef} className={styles.lineOverlay}>
            <defs>
              <marker id="arrowConn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
              <marker id="arrowDraft" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-yellow)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            {activeFlow.connections.map(conn => {
              const coords = getLineCoords(conn.fromCellId, conn.toCellId)
              if (!coords) return null
              const { x1, y1, x2, y2 } = coords
              const cx = (x1 + x2) / 2
              const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
              const isHovered = conn.id === highlightConnId
              return (
                <path
                  key={conn.id}
                  ref={el => { if (el) connPathsRef.current.set(conn.id, el); else connPathsRef.current.delete(conn.id) }}
                  d={d} fill="none"
                  stroke="var(--accent-yellow)"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity={isHovered ? 0.7 : 0.4}
                  markerEnd="url(#arrowConn)"
                />
              )
            })}
            {isPending && cursor && pendingFrom.map(src => {
              const from = getKnobCoords(src.cellId)
              if (!from) return null
              const goingRight = cursor.x > from.right
              const fromX = goingRight ? from.right : from.left
              const cx = (fromX + cursor.x) / 2
              const d = `M ${fromX} ${from.y} C ${cx} ${from.y}, ${cx} ${cursor.y}, ${cursor.x} ${cursor.y}`
              return <path key={`draft-${src.cellId}`} d={d} fill="none" stroke="var(--accent-yellow)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.35" markerEnd="url(#arrowDraft)" style={{ pointerEvents: 'none' }} />
            })}
          </svg>

          {activeFlow.speeches.map(speech => (
            <SpeechColumn
              key={speech.id}
              speech={speech}
              onUpdateCell={updateCell}
              onAddCell={addCell}
              onDeleteCell={deleteCellAndRedraw}
              onAddEmptySpace={addEmptySpace}
              onDeleteEmptySpace={deleteEmptySpace}
              onReorderItems={reorderItems}
              pendingCellIds={pendingCellIds}
              onKnobClick={handleKnobClick}
              cellRefsMap={cellRefsMap}
              onHover={setHoveredSpeechId}
              onCellHover={(speechId, cellId, type) => { hoveredCellRef.current = speechId && cellId ? { speechId, cellId, type } : null }}
              isHovered={hoveredSpeechId === speech.id}
              onDragMove={() => forceUpdate(n => n + 1)}
            />
          ))}
        </div>

        {isPending && (
          <div className={styles.drawHint}>
            {pendingFrom.length === 1
              ? 'click or press c on another cell to connect · x to delete hovered · Esc to cancel'
              : `${pendingFrom.length} selected · click or press c in another speech · Esc to cancel`}
          </div>
        )}

        {showHelp && (
          <div className={styles.helpModal} onClick={() => setShowHelp(false)}>
            <div className={styles.helpContent} onClick={e => e.stopPropagation()}>
              <h3>Shortcuts</h3>
              <div className={styles.helpSection}>
                <div className={styles.shortcut}><kbd>a</kbd><span>Add argument to hovered column</span></div>
                <div className={styles.shortcut}><kbd>b</kbd><span>Add spacer to hovered column</span></div>
                <div className={styles.shortcut}><kbd>c</kbd><span>Connect hovered cell (press again on target)</span></div>
                <div className={styles.shortcut}><kbd>x</kbd><span>Delete hovered cell, spacer, or connection</span></div>
                <div className={styles.shortcut}><kbd>Drag</kbd><span>Reorder items within column</span></div>
                <div className={styles.shortcut}><kbd>Esc</kbd><span>Cancel connection</span></div>
              </div>
              <button className={styles.closeHelp} onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
