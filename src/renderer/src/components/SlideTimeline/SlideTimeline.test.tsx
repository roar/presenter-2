import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TimelineViewModel } from './slideTimelineModel'
import { SlideTimeline } from './SlideTimeline'

function makeTimeline(): TimelineViewModel {
  return {
    totalDuration: 3,
    summaryLabels: ['Autoplay'],
    clickMarkers: [{ label: 'Click 1', time: 1.9 }],
    transitionBars: [
      {
        key: 'transition-1',
        kind: 'push',
        startTime: 0,
        endTime: 0.5
      }
    ],
    bars: [
      {
        animationId: 'anim-1',
        title: 'Move',
        objectName: 'Airplane',
        startTime: 0.5,
        endTime: 1.5,
        triggerTime: 0.5,
        lane: 0
      },
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
    ],
    laneCount: 2
  }
}

function renderTimeline(scope: 'selected-slide' | 'all-slides' = 'selected-slide') {
  return render(
    <SlideTimeline
      timeline={makeTimeline()}
      currentTime={0}
      isPlaying={false}
      onTimeChange={vi.fn()}
      onPlayToggle={vi.fn()}
      scope={scope}
      onScopeToggle={vi.fn()}
    />
  )
}

describe('SlideTimeline', () => {
  it('renders the timeline content', () => {
    renderTimeline()

    expect(screen.queryByText('Transition')).not.toBeInTheDocument()
    expect(screen.getByText('Autoplay')).toBeInTheDocument()
    expect(screen.getByText('Click 1')).toBeInTheDocument()
    expect(screen.getByText('Move: Airplane')).toBeInTheDocument()
    expect(screen.getByText('Move: Balloon')).toBeInTheDocument()
    expect(screen.getByText('Scale: Balloon')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-track')).toBeInTheDocument()
  })

  it('renders a single shared track with click markers and stacked overlapping bars', () => {
    renderTimeline()

    expect(screen.getAllByTestId('timeline-track')).toHaveLength(1)
    expect(screen.getAllByLabelText('Click marker: Click 1').length).toBeGreaterThan(0)
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
        scope="selected-slide"
        onScopeToggle={vi.fn()}
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
        scope="selected-slide"
        onScopeToggle={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Pause timeline' }))
    expect(onPlayToggle).toHaveBeenCalledWith(false)
  })

  it('renders scrub and scope toggle buttons next to play', () => {
    renderTimeline()

    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable scrub mode' })).toHaveTextContent('Scrub Off')
    expect(screen.getByRole('button', { name: 'Show all slides timeline' })).toHaveTextContent(
      'Selected slide'
    )
  })

  it('follows mouse movement anywhere inside the timeline panel when scrub mode is enabled', async () => {
    const user = userEvent.setup()
    const onTimeChange = vi.fn()

    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={onTimeChange}
        onPlayToggle={vi.fn()}
        scope="selected-slide"
        onScopeToggle={vi.fn()}
      />
    )

    const panel = screen.getByTestId('timeline-root')
    Object.defineProperty(panel, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 0,
        width: 300,
        height: 60,
        top: 0,
        left: 100,
        right: 400,
        bottom: 60,
        toJSON: () => ({})
      })
    })

    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    fireEvent.mouseMove(panel, { clientX: 250, clientY: 80 })

    expect(onTimeChange).toHaveBeenCalledWith(1.5)
  })

  it('turns scrub mode off when play is pressed', async () => {
    const user = userEvent.setup()
    const onPlayToggle = vi.fn()

    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={onPlayToggle}
        scope="selected-slide"
        onScopeToggle={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    expect(screen.getByRole('button', { name: 'Disable scrub mode' })).toHaveTextContent('Scrub On')

    await user.click(screen.getByRole('button', { name: 'Play timeline' }))

    expect(screen.getByRole('button', { name: 'Enable scrub mode' })).toHaveTextContent('Scrub Off')
    expect(onPlayToggle).toHaveBeenCalledWith(true)
  })

  it('resets scrub preview to the start when the pointer leaves the timeline', async () => {
    const user = userEvent.setup()
    const onTimeChange = vi.fn()

    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={1.5}
        isPlaying={false}
        onTimeChange={onTimeChange}
        onPlayToggle={vi.fn()}
        scope="selected-slide"
        onScopeToggle={vi.fn()}
      />
    )

    const panel = screen.getByTestId('timeline-root')
    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    fireEvent.mouseLeave(panel)

    expect(onTimeChange).toHaveBeenCalledWith(0)
  })

  it('does not scrub on mouse movement when scrub mode is disabled', () => {
    const onTimeChange = vi.fn()

    render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={onTimeChange}
        onPlayToggle={vi.fn()}
        scope="selected-slide"
        onScopeToggle={vi.fn()}
      />
    )

    const panel = screen.getByTestId('timeline-root')
    Object.defineProperty(panel, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 0,
        width: 300,
        height: 60,
        top: 0,
        left: 100,
        right: 400,
        bottom: 60,
        toJSON: () => ({})
      })
    })

    fireEvent.mouseMove(panel, { clientX: 250, clientY: 80 })

    expect(onTimeChange).not.toHaveBeenCalled()
  })

  it('toggles between selected-slide and all-slides scopes', async () => {
    const user = userEvent.setup()
    const onScopeToggle = vi.fn()

    const { rerender } = render(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={vi.fn()}
        scope="selected-slide"
        onScopeToggle={onScopeToggle}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Show all slides timeline' }))
    expect(onScopeToggle).toHaveBeenCalledOnce()

    rerender(
      <SlideTimeline
        timeline={makeTimeline()}
        currentTime={0}
        isPlaying={false}
        onTimeChange={vi.fn()}
        onPlayToggle={vi.fn()}
        scope="all-slides"
        onScopeToggle={onScopeToggle}
      />
    )

    expect(screen.getByRole('button', { name: 'Show selected slide timeline' })).toHaveTextContent(
      'All slides'
    )
  })

  it('does not render the old top progress scrubber', () => {
    renderTimeline()

    expect(screen.queryByRole('slider', { name: 'Timeline scrubber' })).not.toBeInTheDocument()
  })
})
