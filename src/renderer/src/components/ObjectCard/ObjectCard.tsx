import type { RenderedAppearance } from '@shared/animation/types'
import { InfoCard } from '../InfoCard/InfoCard'
import { ImageElementRenderer } from '../../../../viewer/src/components/ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '../../../../viewer/src/components/ShapeElementRenderer/ShapeElementRenderer'
import { TextElementRenderer } from '../../../../viewer/src/components/TextElementRenderer/TextElementRenderer'
import styles from './ObjectCard.module.css'

interface ObjectCardProps {
  objectName: string
  rendered: RenderedAppearance
  isSelected: boolean
  onClick?: () => void
}

const PREVIEW_WIDTH = 120
const PREVIEW_HEIGHT = 72
const PREVIEW_PADDING = 8

function renderObject(rendered: RenderedAppearance): React.ReactNode {
  if (rendered.master.type === 'text') return <TextElementRenderer rendered={rendered} />
  if (rendered.master.type === 'image') return <ImageElementRenderer rendered={rendered} />
  if (rendered.master.type === 'shape') return <ShapeElementRenderer rendered={rendered} />
  return null
}

function buildPreviewAppearance(rendered: RenderedAppearance): {
  rendered: RenderedAppearance
  scale: number
} {
  const { master } = rendered
  const { width, height, rotation } = master.transform
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / Math.max(width, 1),
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / Math.max(height, 1),
    1
  )
  const offsetX = (PREVIEW_WIDTH - width * scale) / 2
  const offsetY = (PREVIEW_HEIGHT - height * scale) / 2

  return {
    scale,
    rendered: {
      ...rendered,
      master: {
        ...master,
        transform: {
          x: offsetX / scale,
          y: offsetY / scale,
          width,
          height,
          rotation
        }
      }
    }
  }
}

export function ObjectCard({
  objectName,
  rendered,
  isSelected,
  onClick
}: ObjectCardProps): React.JSX.Element {
  const preview = buildPreviewAppearance(rendered)

  return (
    <InfoCard header={objectName} isSelected={isSelected} onClick={onClick}>
      <div className={styles.preview} role="img" aria-label={`${objectName} preview`}>
        <div className={styles.scene} style={{ transform: `scale(${preview.scale})` }}>
          {renderObject(preview.rendered)}
        </div>
      </div>
    </InfoCard>
  )
}
