import React from 'react'
import { Panel } from '../Panel/Panel'
import { Toolbar } from '../Toolbar/Toolbar'
import styles from './EditorLayout.module.css'

export function EditorLayout(): React.JSX.Element {
  return (
    <div className={styles.layout}>
      <Panel className={styles.toolbar}>
        <Toolbar />
      </Panel>
      <div className={styles.body}>
        <Panel className={styles.thumbnailPanel} />
        <Panel className={styles.canvasPanel} />
      </div>
    </div>
  )
}
