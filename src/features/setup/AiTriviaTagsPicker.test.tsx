import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AI_TRIVIA_TAGS } from '../../../shared/ai-trivia-tags-schema'
import { AiTriviaTagsPicker } from './AiTriviaTagsPicker'

describe('AiTriviaTagsPicker', () => {
  it('renders every catalog tag plus the "All" pseudo-tag in Spanish by default', () => {
    render(
      <AiTriviaTagsPicker selectedTags={[]} onChange={() => undefined} locale="es" />,
    )
    expect(screen.getByText('Todas')).toBeInTheDocument()
    for (const tag of AI_TRIVIA_TAGS) {
      expect(screen.getByText(tag.labels.es)).toBeInTheDocument()
    }
  })

  it('marks the "All" pseudo-tag as pressed when selectedTags is empty', () => {
    render(
      <AiTriviaTagsPicker selectedTags={[]} onChange={() => undefined} locale="es" />,
    )
    const allButton = screen.getByText('Todas')
    expect(allButton.getAttribute('aria-pressed')).toBe('true')
  })

  it('toggles a single tag on click', () => {
    const onChange = vi.fn()
    render(
      <AiTriviaTagsPicker selectedTags={[]} onChange={onChange} locale="es" />,
    )
    const historiaButton = screen.getByText('Historia')
    fireEvent.click(historiaButton)
    expect(onChange).toHaveBeenCalledWith(['historia'])
  })

  it('clicking "All" resets to [] (catalog-wide)', () => {
    const onChange = vi.fn()
    render(
      <AiTriviaTagsPicker
        selectedTags={['historia']}
        onChange={onChange}
        locale="es"
      />,
    )
    const allButton = screen.getByText('Todas')
    fireEvent.click(allButton)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('renders English labels when locale is en', () => {
    render(
      <AiTriviaTagsPicker selectedTags={[]} onChange={() => undefined} locale="en" />,
    )
    expect(screen.getByText('Music')).toBeInTheDocument()
    expect(screen.getByText('Sports')).toBeInTheDocument()
  })

  it('renaming all real tags as selected is equivalent to "All" (sends [])', () => {
    const onChange = vi.fn()
    render(
      <AiTriviaTagsPicker
        selectedTags={AI_TRIVIA_TAGS.slice(0, -1).map((tag) => tag.id)}
        onChange={onChange}
        locale="es"
      />,
    )
    const lastTag = AI_TRIVIA_TAGS[AI_TRIVIA_TAGS.length - 1]
    const lastButton = screen.getByText(lastTag.labels.es)
    fireEvent.click(lastButton)
    expect(onChange).toHaveBeenCalledWith([])
  })
})
