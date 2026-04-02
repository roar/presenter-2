import React, { useEffect, useRef, useState } from 'react'
import styles from './DropdownMenu.module.css'

interface DropdownOption<T extends string> {
  value: T
  label: string
}

interface DropdownMenuProps<T extends string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
}

export function DropdownMenu<T extends string>({
  value,
  options,
  onChange
}: DropdownMenuProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function onPointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? value}</span>
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div role="menu" className={styles.menu}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
