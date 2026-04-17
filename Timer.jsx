import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Timer.module.css'

function formatTime(seconds) {
  const s = Math.abs(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Timer({ duration, side }) {
  const [remaining, setRemaining] = useState(duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => { setRemaining(duration); setRunning(false) }, [duration])

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const toggle = useCallback(() => setRunning(r => !r), [])
  const reset = useCallback(() => { setRemaining(duration); setRunning(false) }, [duration])

  const pct = Math.max(0, remaining / duration)
  const over = remaining < 0
  const low = remaining <= 30 && remaining >= 0

  return (
    <div className={`${styles.timer} ${styles[side]} ${over ? styles.over : ''} ${low ? styles.low : ''}`}>
      <div className={styles.time}>{over ? '-' : ''}{formatTime(remaining)}</div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={styles.controls}>
        <button onClick={toggle} className={styles.btn}>{running ? '⏸' : '▶'}</button>
        <button onClick={reset} className={styles.btn}>↺</button>
      </div>
    </div>
  )
}

export function PrepTimer({ side, label }) {
  const [remaining, setRemaining] = useState(300)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const toggle = useCallback(() => setRunning(r => !r), [])
  const reset = useCallback(() => { setRemaining(300); setRunning(false) }, [])

  const pct = remaining / 300
  const low = remaining <= 60

  return (
    <div className={`${styles.timer} ${styles.prep} ${low ? styles.low : ''}`}>
      <div className={styles.label}>{label} PREP</div>
      <div className={styles.time}>{formatTime(remaining)}</div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={styles.controls}>
        <button onClick={toggle} className={styles.btn}>{running ? '⏸' : '▶'}</button>
        <button onClick={reset} className={styles.btn}>↺</button>
      </div>
    </div>
  )
}
