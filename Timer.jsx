import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Timer.module.css'

function formatTime(seconds) {
  const s = Math.abs(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Generic sidebar timer used for constructives, rebuttals, and prep
export function SidebarTimer({ label, duration, side }) {
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
  const low = remaining > 0 && remaining <= 30

  return (
    <div className={`${styles.timer} ${side ? styles[side] : ''} ${over ? styles.over : ''} ${low ? styles.low : ''}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.time}>{over ? '-' : ''}{formatTime(remaining)}</div>
      <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct * 100}%` }} /></div>
      <div className={styles.controls}>
        <button onClick={toggle} className={styles.btn}>{running ? '⏸' : '▶'}</button>
        <button onClick={reset} className={styles.btn}>↺</button>
      </div>
    </div>
  )
}

export function PrepTimer({ side, label, duration = 300 }) {
  const [remaining, setRemaining] = useState(duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const toggle = useCallback(() => setRunning(r => !r), [])
  const reset = useCallback(() => { setRemaining(duration); setRunning(false) }, [duration])

  const pct = remaining / duration
  const low = remaining <= 60

  return (
    <div className={`${styles.timer} ${styles.prep} ${low ? styles.low : ''}`}>
      <div className={styles.time}>{formatTime(remaining)}</div>
      <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct * 100}%` }} /></div>
      <div className={styles.controls}>
        <button onClick={toggle} className={styles.btn}>{running ? '⏸' : '▶'}</button>
        <button onClick={reset} className={styles.btn}>↺</button>
      </div>
    </div>
  )
}

// Kept for any legacy imports but no longer used in SpeechColumn
export function Timer({ duration, side }) {
  return <SidebarTimer label="" duration={duration} side={side} />
}
