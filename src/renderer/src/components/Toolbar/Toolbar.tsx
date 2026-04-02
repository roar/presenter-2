import React from 'react'
import { Button } from '../Button/Button'
import styles from './Toolbar.module.css'

export function Toolbar(): React.JSX.Element {
  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <Button variant="secondary">New Presentation</Button>
        <Button variant="ghost">Insert Shape</Button>
      </div>
    </div>
  )
}
