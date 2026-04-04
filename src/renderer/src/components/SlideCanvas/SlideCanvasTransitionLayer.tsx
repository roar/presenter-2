import React from 'react'
import { SlideLayer } from '@viewer/components/SlideLayer/SlideLayer'
import { getTransitionLayerStyles } from '@viewer/components/SlideRenderer/transitionRenderers'
import { TextElementRenderer } from '@viewer/components/TextElementRenderer/TextElementRenderer'
import { ImageElementRenderer } from '@viewer/components/ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '@viewer/components/ShapeElementRenderer/ShapeElementRenderer'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { FrameState } from '@shared/animation/types'
import styles from './SlideCanvas.module.css'

interface SlideCanvasTransitionLayerProps {
  previewFrame: FrameState
}

export function SlideCanvasTransitionLayer({
  previewFrame
}: SlideCanvasTransitionLayerProps): React.JSX.Element {
  const transitionLayerStyles = getTransitionLayerStyles(previewFrame.transition)

  return (
    <>
      {previewFrame.behind ? (
        <SlideLayer
          renderedSlide={previewFrame.behind}
          style={{ opacity: transitionLayerStyles.behindOpacity }}
        />
      ) : null}
      <SlideLayer
        renderedSlide={previewFrame.front}
        style={{
          opacity: transitionLayerStyles.frontOpacity,
          transform: `translateX(${transitionLayerStyles.frontTranslateX})`
        }}
      />
      <div
        className={styles.transitionMsoLayer}
        style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
      >
        {previewFrame.msoAppearances.map((renderedAppearance) => {
          const { master } = renderedAppearance
          if (master.type === 'text') {
            return (
              <TextElementRenderer
                key={renderedAppearance.appearance.id}
                rendered={renderedAppearance}
              />
            )
          }
          if (master.type === 'image') {
            return (
              <ImageElementRenderer
                key={renderedAppearance.appearance.id}
                rendered={renderedAppearance}
              />
            )
          }
          if (master.type === 'shape') {
            return (
              <ShapeElementRenderer
                key={renderedAppearance.appearance.id}
                rendered={renderedAppearance}
              />
            )
          }
          return null
        })}
      </div>
    </>
  )
}
