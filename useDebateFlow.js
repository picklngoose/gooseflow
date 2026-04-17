import React, { useState, useCallback } from 'react'

// Policy debate speech order
export const SPEECH_ORDER = [
  { id: '1ac', label: '1AC', side: 'aff', type: 'constructive', time: 480, description: '1st Affirmative Constructive' },
  { id: '1nc_cx', label: '1AC CX', side: 'neg', type: 'cx', time: 180, description: 'Neg Cross-Ex of 1AC' },
  { id: '1nc', label: '1NC', side: 'neg', type: 'constructive', time: 480, description: '1st Negative Constructive' },
  { id: '2ac_cx', label: '1NC CX', side: 'aff', type: 'cx', time: 180, description: 'Aff Cross-Ex of 1NC' },
  { id: '2ac', label: '2AC', side: 'aff', type: 'constructive', time: 480, description: '2nd Affirmative Constructive' },
  { id: '2nc_cx', label: '2AC CX', side: 'neg', type: 'cx', time: 180, description: 'Neg Cross-Ex of 2AC' },
  { id: '2nc', label: '2NC', side: 'neg', type: 'constructive', time: 480, description: '2nd Negative Constructive' },
  { id: '1nr_cx', label: '2NC CX', side: 'aff', type: 'cx', time: 180, description: 'Aff Cross-Ex of 2NC' },
  { id: '1nr', label: '1NR', side: 'neg', type: 'rebuttal', time: 240, description: '1st Negative Rebuttal' },
  { id: '2ar_cx', label: '1NR CX', side: 'aff', type: 'cx', time: 180, description: 'Aff Cross-Ex of 1NR' },
  { id: '2ar', label: '2AR', side: 'aff', type: 'rebuttal', time: 240, description: '2nd Affirmative Rebuttal' },
  { id: '2nr_cx', label: '2AR CX', side: 'neg', type: 'cx', time: 180, description: 'Neg Cross-Ex of 2AR' },
  { id: '2nr', label: '2NR', side: 'neg', type: 'rebuttal', time: 240, description: '2nd Negative Rebuttal' },
]

const createCell = (id) => ({
  id,
  content: '',
  tags: [],
  dropped: false,
  extended: false,
})

const createSpeech = (speechDef) => ({
  ...speechDef,
  cells: [createCell(`${speechDef.id}-1`)],
})

const createFlow = (id) => ({
  id,
  name: 'New Flow',
  speeches: SPEECH_ORDER.map(createSpeech),
  connections: [],
  createdAt: Date.now(),
})

export function useDebateFlow() {
  const [flows, setFlows] = useState(() => {
    try {
      const saved = localStorage.getItem('debate-flows')
      if (saved) return JSON.parse(saved)
    } catch {}
    return [createFlow('flow-1')]
  })
  const [activeFlowId, setActiveFlowId] = useState(() => {
    try {
      const saved = localStorage.getItem('debate-active-flow')
      if (saved) return JSON.parse(saved)
    } catch {}
    return 'flow-1'
  })
  const [activeSpeechId, setActiveSpeechId] = useState('1ac')

  const save = useCallback((nextFlows, nextActiveId) => {
    const f = nextFlows || flows
    const a = nextActiveId !== undefined ? nextActiveId : activeFlowId
    try {
      localStorage.setItem('debate-flows', JSON.stringify(f))
      localStorage.setItem('debate-active-flow', JSON.stringify(a))
    } catch {}
    return f
  }, [flows, activeFlowId])

  const updateFlows = useCallback((updater) => {
    setFlows(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [save])

  const activeFlow = flows.find(f => f.id === activeFlowId) || flows[0]

  const addFlow = useCallback(() => {
    const id = `flow-${Date.now()}`
    const newFlow = createFlow(id)
    updateFlows(prev => [...prev, newFlow])
    setActiveFlowId(id)
    save(null, id)
  }, [updateFlows, save])

  const deleteFlow = useCallback((id) => {
    updateFlows(prev => {
      const next = prev.filter(f => f.id !== id)
      if (activeFlowId === id && next.length > 0) {
        setActiveFlowId(next[0].id)
        save(next, next[0].id)
      } else {
        save(next)
      }
      return next
    })
  }, [activeFlowId, updateFlows, save])

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
          return {
            ...s,
            cells: s.cells.map(c => c.id === cellId ? { ...c, ...updates } : c)
          }
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
          const newCell = createCell(`${speechId}-${Date.now()}`)
          return { ...s, cells: [...s.cells, newCell] }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const deleteCell = useCallback((speechId, cellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          if (s.cells.length <= 1) return s
          return { ...s, cells: s.cells.filter(c => c.id !== cellId) }
        })
      }
    }))
  }, [activeFlowId, updateFlows])

  const toggleCellTag = useCallback((speechId, cellId, tag) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return {
        ...f,
        speeches: f.speeches.map(s => {
          if (s.id !== speechId) return s
          return {
            ...s,
            cells: s.cells.map(c => {
              if (c.id !== cellId) return c
              const tags = c.tags.includes(tag)
                ? c.tags.filter(t => t !== tag)
                : [...c.tags, tag]
              return { ...c, tags }
            })
          }
        })
      }
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
      speech.cells.forEach((cell, i) => {
        const tags = cell.tags.length ? ` [${cell.tags.join(', ')}]` : ''
        const dropped = cell.dropped ? ' (DROPPED)' : ''
        lines.push(`${i + 1}.${tags}${dropped}`)
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

  const addConnection = useCallback((fromSpeechId, fromCellId, toSpeechId, toCellId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      const newConnection = { id: `${Date.now()}`, from: { speechId: fromSpeechId, cellId: fromCellId }, to: { speechId: toSpeechId, cellId: toCellId } }
      return { ...f, connections: [...f.connections, newConnection] }
    }))
  }, [activeFlowId, updateFlows])

  const removeConnection = useCallback((connectionId) => {
    updateFlows(prev => prev.map(f => {
      if (f.id !== activeFlowId) return f
      return { ...f, connections: f.connections.filter(c => c.id !== connectionId) }
    }))
  }, [activeFlowId, updateFlows])

  return {
    flows,
    activeFlow,
    activeFlowId,
    activeSpeechId,
    setActiveFlowId: (id) => { setActiveFlowId(id); save(null, id) },
    setActiveSpeechId,
    addFlow,
    deleteFlow,
    renameFlow,
    updateCell,
    addCell,
    deleteCell,
    toggleCellTag,
    addConnection,
    removeConnection,
    exportFlow,
  }
}
