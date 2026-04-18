import { useState, useCallback } from 'react'

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

const createCell = (id) => ({ id, type: 'cell', content: '' })
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
  connections: (flow.connections || []).map(c => {
    if (c.fromCellId) return c
    return { id: c.id, fromCellId: c.from?.cellId, toCellId: c.to?.cellId }
  }).filter(c => c.fromCellId && c.toCellId),
  speeches: flow.speeches
    .filter(s => VALID_SPEECH_IDS.has(s.id))
    .map(s => {
      const speechDef = SPEECH_ORDER.find(def => def.id === s.id)
      const cells = (s.cells || []).map(c => ({ id: c.id, type: 'cell', content: c.content || '' }))
      const spaces = (s.emptySpaces || []).map(sp => ({ id: sp.id, type: 'space' }))
      const items = s.items
        ? s.items.map(it => it.type === 'cell'
            ? { id: it.id, type: 'cell', content: it.content || '' }
            : { id: it.id, type: 'space' })
        : [...cells, ...spaces]
      return { ...s, ...speechDef, items }
    }),
})

const loadFlows = () => {
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
    localStorage.setItem('debate-flows', JSON.stringify(flows))
    if (activeId !== undefined) localStorage.setItem('debate-active-flow', JSON.stringify(activeId))
  } catch {}
}

export function useDebateFlow() {
  const [flows, setFlows] = useState(loadFlows)
  const [activeFlowId, setActiveFlowId] = useState(loadActiveId)
  const [activeSpeechId, setActiveSpeechId] = useState('1ac')

  const updateFlows = useCallback((updater) => {
    setFlows(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      persist(next)
      return next
    })
  }, [])

  const activeFlow = flows.find(f => f.id === activeFlowId) || flows[0]

  const addFlow = useCallback(() => {
    const id = `flow-${Date.now()}`
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

  const updateCell = useCallback((speechId, cellId, updates) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          return { ...s, items: s.items.map(it => it.id === cellId ? { ...it, ...updates } : it) }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const addCell = useCallback((speechId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          return { ...s, items: [...s.items, createCell(`${speechId}-${Date.now()}`)] }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const deleteCell = useCallback((speechId, cellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        connections: f.connections.filter(c => c.fromCellId !== cellId && c.toCellId !== cellId),
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          const cellCount = s.items.filter(it => it.type === 'cell').length
          if (cellCount <= 1) return s
          return { ...s, items: s.items.filter(it => it.id !== cellId) }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const addEmptySpace = useCallback((speechId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          return { ...s, items: [...s.items, createSpace(`${speechId}-space-${Date.now()}`)] }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const deleteEmptySpace = useCallback((speechId, spaceId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          return { ...s, items: s.items.filter(it => it.id !== spaceId) }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const addConnection = useCallback((fromCellId, toCellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      const exists = f.connections.some(c => c.fromCellId === fromCellId && c.toCellId === toCellId)
      if (exists) return f
      return {
        ...f,
        connections: [...f.connections, { id: `conn-${Date.now()}`, fromCellId, toCellId }]
      }
    }))
  }, [activeFlowId, updateFlows])

  const removeConnection = useCallback((connId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return { ...f, connections: f.connections.filter(c => c.id !== connId) }
    }))
  }, [activeFlowId, updateFlows])

  const exportFlow = useCallback(() => {
    if (!activeFlow) return
    const lines = []
    lines.push(`DEBATE FLOW: ${activeFlow.name}`)
    lines.push(`Exported: ${new Date().toLocaleString()}`)
    lines.push('='.repeat(60))
    activeFlow.speeches.forEach(speech => {
      lines.push(`\n[${speech.label}] ${speech.description}`)
      lines.push('-'.repeat(40))
      speech.items.filter(it => it.type === 'cell').forEach((cell, i) => {
        lines.push(`${i + 1}.`)
        if (cell.content) lines.push(`   ${cell.content.replace(/\n/g, '\n   ')}`)
      })
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeFlow.name.replace(/\s+/g, '-').toLowerCase()}-flow.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeFlow])

  return {
    flows, activeFlow, activeFlowId, activeSpeechId,
    setActiveFlowId: (id) => { setActiveFlowId(id); persist(null, id) },
    setActiveSpeechId,
    addFlow, deleteFlow, renameFlow,
    updateCell, addCell, deleteCell,
    addEmptySpace, deleteEmptySpace,
    addConnection, removeConnection,
    exportFlow,
  }
}
