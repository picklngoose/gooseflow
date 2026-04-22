import { useState, useCallback, useRef, useEffect } from 'react'

let _uid = 0
const uid = () => `${Date.now()}-${++_uid}`

export const SPEECH_ORDER = [
  { id: '1ac', label: '1AC', side: 'aff', type: 'constructive', time: 480, description: '1st Affirmative Constructive' },
  { id: '1nc', label: '1NC', side: 'neg', type: 'constructive', time: 480, description: '1st Negative Constructive' },
  { id: '2ac', label: '2AC', side: 'aff', type: 'constructive', time: 480, description: '2nd Affirmative Constructive' },
  { id: '2nc', label: '2NC', side: 'neg', type: 'constructive', time: 480, description: '2nd Negative Constructive' },
  { id: '1nr', label: '1NR', side: 'neg', type: 'rebuttal',     time: 300, description: '1st Negative Rebuttal' },
  { id: '1ar', label: '1AR', side: 'aff', type: 'rebuttal',     time: 300, description: '1st Affirmative Rebuttal' },
  { id: '2nr', label: '2NR', side: 'neg', type: 'rebuttal',     time: 300, description: '2nd Negative Rebuttal' },
  { id: '2ar', label: '2AR', side: 'aff', type: 'rebuttal',     time: 300, description: '2nd Affirmative Rebuttal' },
]

const VALID_SPEECH_IDS = new Set(SPEECH_ORDER.map(s => s.id))

const createCell  = (id) => ({ id, type: 'cell',  content: '' })
const createSpace = (id) => ({ id, type: 'space' })

const createSpeech = (speechDef) => ({
  ...speechDef,
  items: [createCell(`${speechDef.id}-1`)],
})

const createFlow = (id) => ({
  id,
  name: 'New Flow',
  speeches: SPEECH_ORDER.map(createSpeech),
  connections: [],
  createdAt: Date.now(),
})

const migrateFlow = (flow) => ({
  ...flow,
  connections: (flow.connections || []).map(c =>
    c.fromCellId ? c : { id: c.id, fromCellId: c.from?.cellId, toCellId: c.to?.cellId }
  ).filter(c => c.fromCellId && c.toCellId),
  speeches: flow.speeches
    .filter(s => VALID_SPEECH_IDS.has(s.id))
    .map(s => {
      const speechDef = SPEECH_ORDER.find(def => def.id === s.id)
      let items
      if (s.items) {
        items = s.items.map(it =>
          it.type === 'space' ? { id: it.id, type: 'space' }
                              : { id: it.id, type: 'cell', content: it.content || '' }
        )
      } else {
        const cells  = (s.cells       || []).map(c  => ({ id: c.id,  type: 'cell',  content: c.content || '' }))
        const spaces = (s.emptySpaces || []).map(sp => ({ id: sp.id, type: 'space' }))
        items = [...cells, ...spaces]
      }
      return { ...s, ...speechDef, items }
    }),
})

const load = () => {
  try {
    const saved = localStorage.getItem('debate-flows')
    if (saved) return JSON.parse(saved).map(migrateFlow)
  } catch {}
  return [createFlow('flow-1')]
}

const loadActiveId = () => {
  try {
    const saved = localStorage.getItem('debate-active-flow')
    if (saved) return JSON.parse(saved)
  } catch {}
  return 'flow-1'
}

const persist = (flows, activeId) => {
  try {
    if (flows !== null && flows !== undefined) {
      localStorage.setItem('debate-flows', JSON.stringify(flows))
    }
    if (activeId !== undefined) localStorage.setItem('debate-active-flow', JSON.stringify(activeId))
  } catch {}
}

// Build a cell-label map and connection summary for exports
const buildExportMeta = (flow) => {
  const cellLabel = {} // cellId -> "1AC #2"
  flow.speeches.forEach(speech => {
    speech.items.filter(it => it.type === 'cell' && it.content).forEach((cell, i) => {
      cellLabel[cell.id] = `${speech.label} #${i + 1}`
    })
  })
  const fromMap = {} // cellId -> [targetLabel]
  const toMap   = {} // cellId -> [sourceLabel]
  flow.connections.forEach(c => {
    if (cellLabel[c.fromCellId] && cellLabel[c.toCellId]) {
      ;(fromMap[c.fromCellId] = fromMap[c.fromCellId] || []).push(cellLabel[c.toCellId])
      ;(toMap[c.toCellId]     = toMap[c.toCellId]     || []).push(cellLabel[c.fromCellId])
    }
  })
  return { cellLabel, fromMap, toMap }
}

export function useDebateFlow() {
  const [flows, setFlows] = useState(load)
  const [activeFlowId, setActiveFlowId] = useState(loadActiveId)
  const [activeSpeechId, setActiveSpeechId] = useState('1ac')
  const undoStack = useRef([]) // stores previous flow arrays

  const updateFlows = useCallback((updater) => {
    setFlows(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      undoStack.current.push(prev)
      if (undoStack.current.length > 50) undoStack.current.shift()
      persist(next)
      return next
    })
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (prev) {
      setFlows(prev)
      persist(prev)
    }
  }, [])

  // Global Ctrl+Z / Cmd+Z
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const activeFlow = flows.find(f => f.id === activeFlowId) || flows[0]

  const addFlow = useCallback(() => {
    const id = `flow-${uid()}`
    updateFlows(prev => [...prev, createFlow(id)])
    setActiveFlowId(id)
    persist(null, id)
  }, [updateFlows])

  const deleteFlow = useCallback((id) => {
    updateFlows(prev => {
      const next = prev.filter(f => f.id !== id)
      if (activeFlowId === id && next.length > 0) {
        setActiveFlowId(next[0].id)
        persist(next, next[0].id)
      } else {
        persist(next)
      }
      return next
    })
  }, [activeFlowId, updateFlows])

  const renameFlow = useCallback((id, name) => {
    updateFlows(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }, [updateFlows])

  const activeFlowIdRef = useRef(activeFlowId)
  useEffect(() => { activeFlowIdRef.current = activeFlowId }, [activeFlowId])

  const updateSpeechItems = useCallback((speechId, fn) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowIdRef.current) return f
      return { ...f, speeches: f.speeches.map(s => s.id !== speechId ? s : { ...s, items: fn(s.items) }) }
    }))
  }, [updateFlows])

  const updateCell = useCallback((speechId, cellId, updates) => {
    updateSpeechItems(speechId, items => items.map(it => it.id === cellId ? { ...it, ...updates } : it))
  }, [updateSpeechItems])

  const addCell = useCallback((speechId) => {
    updateSpeechItems(speechId, items => [...items, createCell(`${speechId}-${uid()}`)])
  }, [updateSpeechItems])

  const deleteCell = useCallback((speechId, cellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowIdRef.current) return f
      return {
        ...f,
        connections: f.connections.filter(c => c.fromCellId !== cellId && c.toCellId !== cellId),
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          const cellCount = s.items.filter(it => it.type === 'cell').length
          if (cellCount <= 1) {
            // Replace the last cell with a fresh empty one instead of blocking
            return { ...s, items: s.items.map(it => it.id === cellId ? createCell(`${speechId}-${uid()}`) : it) }
          }
          return { ...s, items: s.items.filter(it => it.id !== cellId) }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const addEmptySpace = useCallback((speechId) => {
    updateSpeechItems(speechId, items => [...items, createSpace(`${speechId}-space-${uid()}`)])
  }, [updateSpeechItems])

  const deleteEmptySpace = useCallback((speechId, spaceId) => {
    updateSpeechItems(speechId, items => items.filter(it => it.id !== spaceId))
  }, [updateSpeechItems])

  const reorderItems = useCallback((speechId, newItems) => {
    updateSpeechItems(speechId, () => newItems)
  }, [updateSpeechItems])

  const addConnection = useCallback((fromCellId, toCellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowIdRef.current) return f
      if (f.connections.some(c => c.fromCellId === fromCellId && c.toCellId === toCellId)) return f
      return { ...f, connections: [...f.connections, { id: `conn-${uid()}`, fromCellId, toCellId }] }
    }))
  }, [activeFlowId, updateFlows])

  const removeConnection = useCallback((connId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowIdRef.current) return f
      return { ...f, connections: f.connections.filter(c => c.id !== connId) }
    }))
  }, [activeFlowId, updateFlows])

  // --- Text export (filled cells only, with connections) ---
  const buildTextExport = useCallback((flow) => {
    const { fromMap, toMap } = buildExportMeta(flow)
    const lines = [`DEBATE FLOW: ${flow.name}`, `Exported: ${new Date().toLocaleString()}`, '='.repeat(60)]
    flow.speeches.forEach(speech => {
      const filledCells = speech.items.filter(it => it.type === 'cell' && it.content.trim())
      if (filledCells.length === 0) return
      lines.push(`\n[${speech.label}] ${speech.description}`, '-'.repeat(40))
      filledCells.forEach((cell, i) => {
        lines.push(`${i + 1}. ${cell.content.replace(/\n/g, '\n   ')}`)
        if (fromMap[cell.id]) lines.push(`   → responds to: ${fromMap[cell.id].join(', ')}`)
        if (toMap[cell.id])   lines.push(`   ← answered by: ${toMap[cell.id].join(', ')}`)
      })
    })
    return lines.join('\n')
  }, [])

  const exportFlow = useCallback(() => {
    if (!activeFlow) return
    const text = buildTextExport(activeFlow)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeFlow.name.replace(/\s+/g, '-').toLowerCase()}-flow.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeFlow, buildTextExport])

  const copyToClipboard = useCallback(async () => {
    if (!activeFlow) return false
    const text = buildTextExport(activeFlow)
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }, [activeFlow, buildTextExport])

  // --- PDF export ---
  const exportPDF = useCallback(() => {
    if (!activeFlow) return
    const { fromMap, toMap } = buildExportMeta(activeFlow)

    const cols = activeFlow.speeches.map(speech => {
      const cells = speech.items.filter(it => it.type === 'cell' && it.content.trim())
      const isAff = speech.side === 'aff'
      const cellsHtml = cells.length === 0
        ? '<div class="empty">—</div>'
        : cells.map((cell, i) => {
            const conns = [
              ...(fromMap[cell.id] || []).map(l => `→ ${l}`),
              ...(toMap[cell.id]   || []).map(l => `← ${l}`),
            ]
            return `<div class="cell ${speech.side}">
              <div class="cell-content">${cell.content.replace(/\n/g, '<br>')}</div>
              ${conns.length ? `<div class="cell-conns">${conns.join(' · ')}</div>` : ''}
            </div>`
          }).join('')
      return `<div class="col">
        <div class="col-header ${speech.side}">${speech.label}<span class="col-desc">${speech.description}</span></div>
        <div class="col-cells">${cellsHtml}</div>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>gooseflow — ${activeFlow.name}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'IBM Plex Mono', monospace; font-size: 9px; background: #fff; color: #111; }
      h1 { font-size: 13px; font-weight: 700; padding: 8px 12px; border-bottom: 1px solid #ccc; }
      .meta { font-size: 8px; color: #888; padding: 4px 12px 8px; border-bottom: 1px solid #eee; }
      .board { display: flex; gap: 6px; padding: 10px 12px; align-items: flex-start; }
      .col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .col-header { font-size: 11px; font-weight: 700; padding: 4px 6px; border-radius: 3px; margin-bottom: 2px; display: flex; flex-direction: column; gap: 1px; }
      .col-header.aff { background: #e6fff7; color: #007a50; border-left: 3px solid #00a872; }
      .col-header.neg { background: #e6f0ff; color: #1a5fc8; border-left: 3px solid #3d7fcc; }
      .col-desc { font-size: 7px; font-weight: 400; opacity: 0.7; }
      .col-cells { display: flex; flex-direction: column; gap: 3px; }
      .cell { border: 1px solid #ddd; border-radius: 3px; padding: 4px 5px; background: #fafafa; }
      .cell.aff { border-left: 2px solid #00a872; }
      .cell.neg { border-left: 2px solid #3d7fcc; }
      .cell-content { line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
      .cell-conns { font-size: 7px; color: #999; margin-top: 2px; font-style: italic; }
      .empty { color: #ccc; font-style: italic; font-size: 8px; padding: 4px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <h1>gooseflow — ${activeFlow.name}</h1>
    <div class="meta">Exported ${new Date().toLocaleString()}</div>
    <div class="board">${cols}</div>
    </body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }, [activeFlow])

  return {
    flows, activeFlow, activeFlowId, activeSpeechId,
    setActiveFlowId: (id) => { setActiveFlowId(id); persist(null, id) },
    setActiveSpeechId,
    addFlow, deleteFlow, renameFlow,
    updateCell, addCell, deleteCell,
    addEmptySpace, deleteEmptySpace,
    reorderItems,
    addConnection, removeConnection,
    exportFlow, exportPDF, copyToClipboard,
    undo,
  }
}
