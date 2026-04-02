import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SlideTimelineModel } from './slideTimelineModel'
import { SlideTimeline } from './SlideTimeline'

function makeTimeline(): SlideTimelineModel {
  return {
    slideId: 'slide-1',
    totalDuration: 3,
    transition: {
      triggerId: 'transition-1',
      kind: 'push',
      startTime: 0,
      endTime: 0.5
    },
    buckets: [
      {
        index: 0,
        label: 'Autoplay',
        startTime: 0.5,
        endTime: 1.5,
        laneCount: 1,
        bars: [
          {
            animationId: 'anim-1',
            title: 'Move',
            objectName: 'Airplane',
            startTime: 0.5,
            endTime: 1.5,
            triggerTime: 0.5,
            lane: 0
          }
        ]
      },
      {
        index: 1,
        label: 'Click 1',
        startTime: 1.9,
        endTime: 3,
        triggerId: 'anim-2',
        laneCount: 2,
        bars: [
          {
            animationId: 'anim-2',
            title: 'Move',
            objectName: 'Balloon',
            startTime: 1.9,
            endTime: 2.6,
            triggerTime: 1.9,
            lane: 0
          },
          {
            animationId: 'anim-3',
            title: 'Scale',
            objectName: 'Balloon',
            startTime: 2.1,
            endTime: 3,
            triggerTime: 1.9,
            lane: 1
          }
        ]
      }
    ]
  }
}

describe('SlideTimeline', () => {
  it('renders the transition bar and click buckets', () => {
    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={vi.fn()}
      />
    )

    expect(screen.getByText('Transition')).toBeInTheDocument()
    expect(screen.getByText('Autoplay')).toBeInTheDocument()
    expect(screen.getByText('Click 1')).toBeInTheDocument()
    expect(screen.getByText('Move: Airplane')).toBeInTheDocument()
    expect(screen.getByText('Move: Balloon')).toBeInTheDocument()
    expect(screen.getByText('Scale: Balloon')).toBeInTheDocument()
  })

  it('exposes lane information on animation bars', () => {
    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Move: Balloon')).toHaveAttribute('data-lane', '0')
    expect(screen.getByLabelText('Scale: Balloon')).toHaveAttribute('data-lane', '1')
  })

  it('toggles play and pause through the control button', async () => {
    const user = userEvent.setup()
    const onPlayToggle = vi.fn()

    const { rerender } = render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={onPlayToggle}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Play timeline' }))
    expect(onPlayToggle).toHaveBeenCalledWith(true)

    rerender(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={true}
        onTimeChange={vi.fn()}
        onPlayToggle={onPlayToggle}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Pause timeline' }))
    expect(onPlayToggle).toHaveBeenCalledWith(false)
  })

  it('reports scrubber changes', () => {
    const onTimeChange = vi.fn()

    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={onTimeChange}
        onPlayToggle={vi.fn()}
      />
    )

    fireEvent.input(screen.getByRole('slider', { name: 'Timeline scrubber' }), {
      target: { value: '1.5' }
    })

    expect(onTimeChange).toHaveBeenCalledWith(1.5)
  })
})
