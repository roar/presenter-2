import React from 'react'
import styles from './MsoIndicator.module.css'

interface MsoIndicatorProps {
  x: number
  y: number
  width: number
}

export function MsoIndicator({ x, y, width }: MsoIndicatorProps): React.JSX.Element {
  return (
    <div
      title="Multi Slide Object"
      className={styles.badge}
      style={{ left: x + width - 60, top: y + 6 }}
    />
  )
}
