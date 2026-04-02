import React from 'react'
import { Panel } from '../Panel/Panel'
import styles from './EditorLayout.module.css'

export function EditorLayout(): React.JSX.Element {
  return (
    <div className={styles.layout}>
      <Panel className={styles.thumbnailPanel} />
      <Panel className={styles.canvasPanel} />
    </div>
  )
}
