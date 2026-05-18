import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { normalizeAppLocale } from '../../i18n/app-locale'
import type { AppLocale } from '../../i18n/app-locale'
import { fetchLearnProfile } from '../../services/learn-api-client'
import type { ApiErrorPayload } from '../../types/api-contract'
import type { LearnProfile } from '../../types/learn-api'
import type { IsoCountryCode } from '../../types'
import { readLastLearnProfile, writeLastLearnProfile } from './learn-profile-storage'

export type CountryLearnModalState =
  | { readonly status: 'loading'; readonly iso2: IsoCountryCode }
  | {
      readonly status: 'success'
      readonly profile: LearnProfile
      readonly requestedLocale: AppLocale
      readonly offline?: boolean
    }
  | {
      readonly status: 'error'
      readonly iso2: IsoCountryCode
      readonly requestedLocale: AppLocale
      readonly error: ApiErrorPayload
    }

export function useCountryLearn() {
  const { i18n } = useTranslation()
  const requestedLocale = normalizeAppLocale(i18n.language) ?? 'es'
  const [modalState, setModalState] = useState<CountryLearnModalState | null>(null)
  const loadInFlightRef = useRef(false)

  const loadProfile = useCallback(
    async (iso2: IsoCountryCode) => {
      loadInFlightRef.current = true
      setModalState({ status: 'loading', iso2 })

      try {
        const result = await fetchLearnProfile(iso2, requestedLocale)

        if (result.ok) {
          writeLastLearnProfile(result.data)
          setModalState({
            status: 'success',
            profile: result.data,
            requestedLocale,
          })
          return
        }

        const cached = readLastLearnProfile()
        if (cached && result.error.code === 'WIKIPEDIA_UNAVAILABLE') {
          setModalState({
            status: 'success',
            profile: cached,
            requestedLocale,
            offline: true,
          })
          return
        }

        setModalState({
          status: 'error',
          iso2,
          requestedLocale,
          error: result.error,
        })
      } finally {
        loadInFlightRef.current = false
      }
    },
    [requestedLocale],
  )

  const openCountry = useCallback(
    (iso2: IsoCountryCode) => {
      if (modalState !== null || loadInFlightRef.current) {
        return
      }
      void loadProfile(iso2)
    },
    [loadProfile, modalState],
  )

  const closeModal = useCallback(() => {
    setModalState(null)
  }, [])

  const retry = useCallback(() => {
    setModalState((current) => {
      if (current?.status !== 'error') {
        return current
      }
      void loadProfile(current.iso2)
      return { status: 'loading', iso2: current.iso2 }
    })
  }, [loadProfile])

  return useMemo(
    () => ({
      modalState,
      isModalOpen: modalState !== null,
      requestedLocale,
      openCountry,
      closeModal,
      retry,
    }),
    [closeModal, modalState, openCountry, requestedLocale, retry],
  )
}
