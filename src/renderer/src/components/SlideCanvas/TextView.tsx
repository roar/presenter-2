import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import type { Appearance, MsoMaster, TextContent } from '@shared/model/types'
import { TextContentRenderer } from '@shared/text/TextContentRenderer'
import { extractPlainText, plainTextToTextContent } from '@shared/text/textContentUtils'
import type { ShapeTextLineTrack } from '@shared/text/shapeTextLineTracks'

const EMPTY_TRACK_GUIDES: ShapeTextLineTrack[] = []

interface TextViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
  isEditing?: boolean
  contentOverride?: TextContent | null
  onEditContentChange?: (content: TextContent) => void
  onCommitEdit?: () => void
  editingTrackGuides?: ShapeTextLineTrack[]
}

export function TextView({
  master,
  appearance,
  rendered,
  isEditing = false,
  contentOverride = null,
  onEditContentChange,
  onCommitEdit,
  editingTrackGuides = EMPTY_TRACK_GUIDES
}: TextViewProps): React.JSX.Element {
  const { transform: t } = master
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'
  const textStyle = master.textStyle?.defaultState ?? {}
  const content = contentOverride ?? (master.content.type === 'text' ? master.content.value : null)
  const plainText = content ? extractPlainText(content) : ''
  const fontSize = textStyle.fontSize ?? 16
  const useTrackEditors = isEditing && editingTrackGuides.length > 0
  const trackEditorLines = useTrackEditors
    ? layoutTrackEditorLines(plainText, editingTrackGuides, fontSize)
    : []
  const [trackDraftLines, setTrackDraftLines] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!useTrackEditors) {
      setTrackDraftLines((currentLines) => (currentLines.length === 0 ? currentLines : []))
      return
    }

    setTrackDraftLines(trackEditorLines.map((line) => line.text))
  }, [plainText, useTrackEditors, editingTrackGuides, fontSize])

  function commitTrackLineChange(nextLineText: string, lineIndex: number): void {
    const nextLines = trackEditorLines.map((line, index) => trackDraftLines[index] ?? line.text)
    nextLines[lineIndex] = nextLineText
    setTrackDraftLines(nextLines)
    onEditContentChange?.(plainTextToTextContent(nextLines.join('\n')))
  }

  return (
    <div
      data-testid="text-view"
      data-text-editing={isEditing ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        transform: rendered?.transform || undefined,
        opacity: rendered?.opacity ?? 1,
        visibility: visible ? 'visible' : 'hidden',
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight,
        fontFamily: textStyle.fontFamily,
        color: resolveColorValue(textStyle.color),
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        outline: isEditing ? '2px solid #0a84ff' : undefined,
        outlineOffset: isEditing ? '4px' : undefined
      }}
    >
      {isEditing
        ? editingTrackGuides.map((track, index) => (
            <div
              key={`${track.x}-${track.y}-${index}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: track.x,
                top: track.y,
                width: track.width,
                height: track.height,
                border: '1px dashed rgba(10, 132, 255, 0.35)',
                boxSizing: 'border-box',
                pointerEvents: 'none'
              }}
            />
          ))
        : null}
      {isEditing && useTrackEditors ? (
        <>
          {trackEditorLines.map((line, index) => (
            <textarea
              key={`${line.x}-${line.y}-${index}`}
              aria-label="Edit text line"
              autoFocus={index === 0}
              value={trackDraftLines[index] ?? line.text}
              style={{
                position: 'absolute',
                left: line.x,
                top: line.y,
                width: line.width,
                height: line.height,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                resize: 'none',
                outline: 'none',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              onChange={(event) => commitTrackLineChange(event.target.value, index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  onCommitEdit?.()
                }
              }}
              onBlur={() => onCommitEdit?.()}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            />
          ))}
        </>
      ) : isEditing ? (
        <textarea
          aria-label="Edit text"
          autoFocus
          defaultValue={plainText}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            resize: 'none',
            outline: 'none'
          }}
          onChange={(event) => onEditContentChange?.(plainTextToTextContent(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              onCommitEdit?.()
            }
          }}
          onBlur={() => onCommitEdit?.()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        />
      ) : null}
      {!isEditing && content ? <TextContentRenderer content={content} /> : null}
    </div>
  )
}

interface TrackEditorLine {
  text: string
  x: number
  y: number
  width: number
  height: number
}

function layoutTrackEditorLines(
  text: string,
  tracks: ShapeTextLineTrack[],
  fontSize: number
): TrackEditorLine[] {
  const words = text.trim().length === 0 ? [] : text.trim().split(/\s+/)
  let wordIndex = 0

  return tracks.map((track) => {
    let lineText = ''

    while (wordIndex < words.length) {
      const nextWord = words[wordIndex]
      const candidate = lineText ? `${lineText} ${nextWord}` : nextWord
      const candidateWidth = measureTextWidth(candidate, fontSize)

      if (candidateWidth <= track.width || lineText.length === 0) {
        lineText = candidate
        wordIndex += 1
        continue
      }

      break
    }

    return {
      text: lineText,
      x: track.x,
      y: track.y,
      width: track.width,
      height: track.height
    }
  })
}

function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.5
}
