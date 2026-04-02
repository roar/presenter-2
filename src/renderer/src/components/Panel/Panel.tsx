import styles from './Panel.module.css'

interface PanelProps {
  children: React.ReactNode
  className?: string
}

export function Panel({ children, className }: PanelProps) {
  return <div className={[styles.panel, className].filter(Boolean).join(' ')}>{children}</div>
}

interface PanelSectionProps {
  title?: string
  children: React.ReactNode
  testId?: string
  selectedSlideId?: string | null
  fill?: boolean
  flush?: boolean
}

export function PanelSection({
  title,
  children,
  testId,
  selectedSlideId,
  fill = false,
  flush = false
}: PanelSectionProps) {
  return (
    <section
      className={[styles.section, fill ? styles.sectionFill : '', flush ? styles.sectionFlush : '']
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
      data-selected-slide-id={selectedSlideId ?? undefined}
    >
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      <div
        className={[
          styles.sectionContent,
          fill ? styles.sectionContentFill : '',
          flush ? styles.sectionContentFlush : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  )
}
