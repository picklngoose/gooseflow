import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Timer.module.css'

function formatTime(seconds) {
  const s = Math.abs(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Sidebar timer used for prep time, constructives, and rebuttals. Counts
// down from `duration`, clamped at 0.
//
// Counts down based on a target end-timestamp rather than decrementing once
// per tick. setInterval(..., 1000) doesn't guarantee the callback fires
// exactly every second — dropped frames, background-tab throttling, etc.
// all cause real drift if you just do `r => r - 1` each tick. Deriving the
// displayed value from Date.now() every tick means the display stays
// accurate no matter how imprecisely the ticks themselves land.
export function PrepTimer({ side, label, duration = 300 }) {
  const [remaining, setRemaining] = useState(duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)
  const endTimeRef = useRef(null)

  useEffect(() => { setRemaining(duration); setRunning(false); endTimeRef.current = null }, [duration])

  useEffect(() => {
    if (!running) return
    endTimeRef.current = Date.now() + remaining * 1000
    const tick = () => setRemaining(Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000)))
    tick()
    intervalRef.current = setInterval(tick, 250)
    return () => clearInterval(intervalRef.current)
    // Deliberately excludes `remaining` — we only want to (re)anchor
    // endTimeRef the moment `running` flips true, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const toggle = useCallback(() => setRunning(r => !r), [])
  const reset = useCallback(() => { setRemaining(duration); setRunning(false); endTimeRef.current = null }, [duration])

  const pct = remaining / duration
  const low = remaining <= 60

  return (
    <div className={`${styles.timer} ${styles.prep} ${side ? styles[side] : ''} ${low ? styles.low : ''}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.time}>{formatTime(remaining)}</div>
      <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct * 100}%` }} /></div>
      <div className={styles.controls}>
        <button onClick={toggle} className={styles.btn}>{running ? '⏸' : '▶'}</button>
        <button onClick={reset} className={styles.btn}>↺</button>
      </div>
    </div>
  )
}
