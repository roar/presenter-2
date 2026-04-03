import React from 'react'
import styles from './Tabs.module.css'

export interface TabOption<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  value: T
  tabs: TabOption<T>[]
  onChange: (value: T) => void
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange
}: TabsProps<T>): React.JSX.Element {
  return (
    <div className={styles.root} role="tablist" aria-label="Inspector tabs">
      {tabs.map((tab) => {
        const isSelected = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={[styles.tab, isSelected ? styles.selected : ''].join(' ')}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
