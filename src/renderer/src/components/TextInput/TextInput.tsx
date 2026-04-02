import React from 'react'
import styles from './TextInput.module.css'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className, ...props }: TextInputProps): React.JSX.Element {
  return (
    <input type="text" className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
  )
}
