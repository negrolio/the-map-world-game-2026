import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AiAttemptsBanner } from './AiAttemptsBanner'

describe('AiAttemptsBanner', () => {
  it('shows "Intento 1 de 3" when no attempts have been used yet', () => {
    render(<AiAttemptsBanner attemptsUsed={0} />)
    expect(screen.getByTestId('ai-attempts-banner').textContent).toMatch(/1.*3/)
  })

  it('advances counter as attempts are used', () => {
    render(<AiAttemptsBanner attemptsUsed={1} />)
    expect(screen.getByTestId('ai-attempts-banner').textContent).toMatch(/2.*3/)
  })

  it('clamps to MAX_AI_ATTEMPTS = 3', () => {
    render(<AiAttemptsBanner attemptsUsed={9} />)
    expect(screen.getByTestId('ai-attempts-banner').textContent).toMatch(/3.*3/)
  })
})
