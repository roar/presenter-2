import React from 'react'
import styles from './Checkbox.module.css'

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'onChange'
> {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export function Checkbox({
  checked,
  label,
  onChange,
  className,
  disabled,
  ...props
}: CheckboxProps): React.JSX.Element {
  return (
    <label
      className={[styles.root, disabled ? styles.disabled : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        {...props}
        className={styles.input}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  )
}
