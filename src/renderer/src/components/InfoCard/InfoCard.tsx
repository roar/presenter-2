import React from 'react'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  header: React.ReactNode
  isSelected: boolean
  onClick?: () => void
  onContextMenu?: React.MouseEventHandler<HTMLElement>
  children: React.ReactNode
}

export function InfoCard({
  header,
  isSelected,
  onClick,
  onContextMenu,
  children
}: InfoCardProps): React.JSX.Element {
  const className = [styles.card, isSelected ? styles.selected : null].filter(Boolean).join(' ')

  return (
    <div
      className={className}
      data-selected={isSelected ? true : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span className={styles.header}>{header}</span>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
