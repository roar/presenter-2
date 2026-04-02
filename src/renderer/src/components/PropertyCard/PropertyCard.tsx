import React from 'react'
import styles from './PropertyCard.module.css'

interface PropertyCardProps {
  title: React.ReactNode
  children: React.ReactNode
}

export function PropertyCard({ title, children }: PropertyCardProps): React.JSX.Element {
  return (
    <div className={styles.card}>
      <span className={styles.title}>{title}</span>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
