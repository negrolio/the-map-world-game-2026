/* eslint-disable react-refresh/only-export-components -- helpers de test junto al wrapper */
import { render, type RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import type { ReactElement, ReactNode } from 'react'

import { i18n } from '../i18n/i18n'

function I18nWrapper({ children }: { readonly children: ReactNode }): ReactElement {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export function renderWithI18n(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
  return render(ui, { ...options, wrapper: I18nWrapper })
}
