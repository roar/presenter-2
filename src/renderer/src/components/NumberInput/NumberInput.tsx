import React, { useEffect, useState } from 'react'
import styles from './NumberInput.module.css'

interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: number
  decimals: number
  onCommit: (value: number) => void
}

function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

export function NumberInput({
  value,
  decimals,
  onCommit,
  className,
  onBlur,
  ...props
}: NumberInputProps): React.JSX.Element {
  const [draft, setDraft] = useState(() => formatNumber(value, decimals))

  useEffect(() => {
    setDraft(formatNumber(value, decimals))
  }, [value, decimals])

  function handleBlur(event: React.FocusEvent<HTMLInputElement>): void {
    const parsed = Number.parseFloat(draft)
    if (!Number.isNaN(parsed)) {
      onCommit(parsed)
      setDraft(formatNumber(parsed, decimals))
    } else {
      setDraft(formatNumber(value, decimals))
    }
    onBlur?.(event)
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={[styles.input, className].filter(Boolean).join(' ')}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleBlur}
    />
  )
}
