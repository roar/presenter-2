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
  actions?: React.ReactNode
  testId?: string
  selectedSlideId?: string | null
  fill?: boolean
  flush?: boolean
  scrollable?: boolean
}

export function PanelSection({
  title,
  children,
  actions,
  testId,
  selectedSlideId,
  fill = false,
  flush = false,
  scrollable = false
}: PanelSectionProps) {
  return (
    <section
      className={[
        styles.section,
        fill ? styles.sectionFill : '',
        flush ? styles.sectionFlush : '',
        scrollable ? styles.sectionScrollable : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
      data-selected-slide-id={selectedSlideId ?? undefined}
      data-scrollable={scrollable ? true : undefined}
    >
      {title ? (
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div
        className={[
          styles.sectionContent,
          fill ? styles.sectionContentFill : '',
          flush ? styles.sectionContentFlush : '',
          scrollable ? styles.sectionContentScrollable : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  )
}
