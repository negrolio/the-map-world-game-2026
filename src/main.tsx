import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'

import './index.css'
import { App } from './App.tsx'
import { AppErrorBoundary } from './components'
import { i18n, initI18n } from './i18n/i18n'

void initI18n().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </I18nextProvider>
    </StrictMode>,
  )
})
