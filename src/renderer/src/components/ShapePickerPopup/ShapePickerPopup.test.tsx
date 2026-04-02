import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShapePickerPopup } from './ShapePickerPopup'

const noop = (): void => {}

describe('ShapePickerPopup', () => {
  it('renders the popup dialog', () => {
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    expect(screen.getByRole('dialog', { name: 'Insert shape' })).toBeInTheDocument()
  })

  it('calls onClose when pressing Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShapePickerPopup onClose={onClose} onInsertShape={noop} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShapePickerPopup onClose={onClose} onInsertShape={noop} />)
    await user.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders a search input', () => {
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    expect(screen.getByRole('textbox', { name: 'Search shapes' })).toBeInTheDocument()
  })

  it('renders category tabs including All', () => {
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    const tablist = screen.getByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(within(tablist).getByRole('tab', { name: 'Animals' })).toBeInTheDocument()
    expect(within(tablist).getByRole('tab', { name: 'Symbols' })).toBeInTheDocument()
  })

  it('renders shape buttons in the grid', () => {
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    const shapes = screen.getAllByRole('button', { name: /^[A-Z]/ })
    expect(shapes.length).toBeGreaterThan(0)
  })

  it('filters shapes by search query', async () => {
    const user = userEvent.setup()
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    const search = screen.getByRole('textbox', { name: 'Search shapes' })
    await user.type(search, 'Dog')
    expect(screen.getByRole('button', { name: 'Dog' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cat' })).not.toBeInTheDocument()
  })

  it('filters shapes by category tab', async () => {
    const user = userEvent.setup()
    render(<ShapePickerPopup onClose={noop} onInsertShape={noop} />)
    const tablist = screen.getByRole('tablist')
    await user.click(within(tablist).getByRole('tab', { name: 'Geometry' }))
    const shapeButtons = screen.getAllByRole('button', { name: /^[A-Z]/ })
    // Geometry has 16 shapes — far fewer than 769 total
    expect(shapeButtons.length).toBeLessThan(50)
  })

  it('calls onInsertShape and onClose when a shape is clicked', async () => {
    const user = userEvent.setup()
    const onInsertShape = vi.fn()
    const onClose = vi.fn()
    render(<ShapePickerPopup onClose={onClose} onInsertShape={onInsertShape} />)
    await user.type(screen.getByRole('textbox', { name: 'Search shapes' }), 'Dog')
    await user.click(screen.getByRole('button', { name: 'Dog' }))
    expect(onInsertShape).toHaveBeenCalledOnce()
    expect(onInsertShape.mock.calls[0][0]).toMatchObject({ name: 'Dog' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
