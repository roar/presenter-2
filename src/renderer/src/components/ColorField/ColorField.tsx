import React from 'react'
import type { Color, ColorConstant, ColorConstantId } from '@shared/model/types'
import { isColorReference, resolveColorValue } from '@shared/model/colors'
import { Button } from '../Button/Button'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import styles from './ColorField.module.css'

interface ColorFieldProps {
  label: string
  color: Color | undefined
  colorConstants: ColorConstant[]
  onChange?: (color: Color | undefined) => void
  onNameColor?: (value: string, name: string) => ColorConstantId | null | void
}

type ColorOptionValue = `constant:${string}` | 'custom'

export function ColorField({
  label,
  color,
  colorConstants,
  onChange,
  onNameColor
}: ColorFieldProps): React.JSX.Element {
  const colorConstantsById = React.useMemo(
    () =>
      Object.fromEntries(colorConstants.map((colorConstant) => [colorConstant.id, colorConstant])) as Record<
        ColorConstantId,
        ColorConstant
      >,
    [colorConstants]
  )
  const selectedConstant = isColorReference(color) ? colorConstantsById[color.colorId] : undefined
  const resolvedValue = resolveColorValue(color, colorConstantsById) ?? '#000000'
  const dropdownValue: ColorOptionValue = selectedConstant
    ? `constant:${selectedConstant.id}`
    : 'custom'

  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      <div className={styles.controls}>
        <div className={styles.valueRow}>
          <input
            aria-label={`${label} color`}
            className={styles.picker}
            type="color"
            value={resolvedValue}
            onChange={(event) => onChange?.(event.target.value)}
          />
          <DropdownMenu
            value={dropdownValue}
            options={[
              ...colorConstants.map((colorConstant) => ({
                value: `constant:${colorConstant.id}` as const,
                label: colorConstant.name
              })),
              { value: 'custom' as const, label: 'Custom' }
            ]}
            onChange={(value) => {
              if (value === 'custom') {
                onChange?.(resolvedValue)
                return
              }

              onChange?.({
                kind: 'constant',
                colorId: value.replace('constant:', '')
              })
            }}
          />
        </div>
        <div className={styles.metaRow}>
          <span className={styles.value}>{resolvedValue}</span>
          {selectedConstant ? (
            <span className={styles.name}>{selectedConstant.name}</span>
          ) : onNameColor ? (
            <Button
              variant="secondary"
              onClick={() => {
                const name = window.prompt('Name this color', '')
                if (!name?.trim()) return
                const colorId = onNameColor(resolvedValue, name.trim())
                if (colorId) {
                  onChange?.({ kind: 'constant', colorId })
                }
              }}
            >
              Name Color
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
