import { Button, componentShell } from './components'
import { dataShell } from './data'
import { gameFeatureShell } from './features/game'
import { setupFeatureShell } from './features/setup'
import { serviceShell } from './services'
import type { FeatureShell } from './types'

export function App() {
  const shellModules: readonly FeatureShell[] = [
    setupFeatureShell,
    gameFeatureShell,
    serviceShell,
    dataShell,
    componentShell,
  ]

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
          Fase 0.2 en progreso
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          The Map World Game 2026
        </h1>
        <p className="max-w-2xl text-base text-slate-300 md:text-lg">
          Tailwind CSS quedó integrado correctamente. Esta pantalla usa
          utilidades para validar el setup inicial del frontend.
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {shellModules.map((shellModule) => (
            <li
              key={shellModule.id}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
            >
              {shellModule.id}:{' '}
              <span className="font-semibold text-emerald-300">
                {shellModule.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-3">
          <Button type="button">Comenzar setup</Button>
          <Button type="button" variant="secondary">
            Ver estado técnico
          </Button>
        </div>
      </section>
    </main>
  )
}
