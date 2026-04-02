import React from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      data-variant={variant}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
