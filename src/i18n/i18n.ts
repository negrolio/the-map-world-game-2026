import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { FALLBACK_LOCALE, LOCALE_STORAGE_KEY, normalizeAppLocale } from './app-locale'
import { enNamespaces } from './resources/en'
import { esNamespaces } from './resources/es'
import { resolveInitialLocale } from './resolve-initial-locale'

const NAMESPACES = [
  'common',
  'home',
  'setup',
  'game',
  'results',
  'aria',
  'app',
  'validation',
  'errors',
] as const

function readPersistedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function readNavigatorLanguage(): string {
  return typeof navigator !== 'undefined' ? navigator.language : FALLBACK_LOCALE
}

function persistAndSyncHtmlLang(lng: string): void {
  const normalized = normalizeAppLocale(lng) ?? FALLBACK_LOCALE
  document.documentElement.lang = normalized
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
  } catch {
    /* ignore quota / private mode */
  }
}

let initStarted = false

/**
 * Inicializa i18next una sola vez antes de montar React.
 */
export async function initI18n(): Promise<typeof i18n> {
  if (initStarted) {
    return i18n
  }
  initStarted = true

  await i18n.use(initReactI18next).init({
    resources: {
      en: enNamespaces,
      es: esNamespaces,
    },
    lng: resolveInitialLocale(readPersistedLocale(), readNavigatorLanguage()),
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: ['es', 'en'],
    ns: [...NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

  persistAndSyncHtmlLang(i18n.language)
  i18n.on('languageChanged', persistAndSyncHtmlLang)

  return i18n
}

export { i18n }
