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
}

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <section className={styles.section}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      <div className={styles.sectionContent}>{children}</div>
    </section>
  )
}
