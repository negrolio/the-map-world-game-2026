import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LEARN_PROFILE_STORAGE_KEY } from './learn-profile-storage'
import { useCountryLearn } from './use-country-learn'

const profile = {
  iso2: 'AR',
  locale: 'es' as const,
  title: 'Argentina',
  summary: 'Resumen',
  flagUrl: null,
  wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
  source: 'wikipedia' as const,
}

describe('useCountryLearn', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('loads profile on openCountry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(profile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')

    const { result } = renderHook(() => useCountryLearn())

    act(() => {
      result.current.openCountry('AR')
    })

    expect(result.current.modalState?.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.modalState?.status).toBe('success')
    })

    if (result.current.modalState?.status === 'success') {
      expect(result.current.modalState.profile.title).toBe('Argentina')
    }
    expect(sessionStorage.getItem(LEARN_PROFILE_STORAGE_KEY)).toBeTruthy()
  })

  it('shows offline cached profile when fetch fails with unavailable', async () => {
    sessionStorage.setItem(LEARN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network')),
    )
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')

    const { result } = renderHook(() => useCountryLearn())

    act(() => {
      result.current.openCountry('AR')
    })

    await waitFor(() => {
      expect(result.current.modalState?.status).toBe('success')
    })

    if (result.current.modalState?.status === 'success') {
      expect(result.current.modalState.offline).toBe(true)
    }
  })

  it('ignores openCountry while modal is open', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify(profile), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  }),
                ),
              50,
            )
          }),
      )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')

    const { result } = renderHook(() => useCountryLearn())

    act(() => {
      result.current.openCountry('AR')
      result.current.openCountry('US')
    })

    await waitFor(() => {
      expect(result.current.modalState?.status).toBe('success')
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
