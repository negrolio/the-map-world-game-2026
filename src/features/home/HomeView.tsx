import { Badge, ChunkyButton, Panel } from '../../components/ui'
import type { FeatureShell } from '../../types'

export interface HomeViewProps {
  readonly shellModules: readonly FeatureShell[]
  readonly datasetVersion: string
  readonly onStartSetup: () => void
}

/**
 * Portada del juego. Comunica el nombre, una promesa breve y el CTA primario.
 * El listado de módulos queda como nota técnica secundaria en el pie.
 */
export function HomeView({ shellModules, datasetVersion, onStartSetup }: HomeViewProps) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <Badge tone="warning">Home · MVP</Badge>
        <h1 className="font-display text-4xl uppercase tracking-tight text-wood-dark md:text-6xl">
          The Map World Game 2026
        </h1>
        <p className="max-w-2xl font-body text-base text-ink-soft md:text-lg">
          Una partida de geografía sobre un mapa interactivo. Configurá jugadores,
          modo país o capital, cobertura por continente y empezá la expedición.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <ChunkyButton type="button" tone="primary" size="lg" onClick={onStartSetup}>
            Comenzar setup
          </ChunkyButton>
          <ChunkyButton type="button" tone="secondary" size="lg">
            Ver estado técnico
          </ChunkyButton>
        </div>

        <Panel
          tone="paper-soft"
          padding="sm"
          className="mt-6 w-full max-w-3xl text-left"
        >
          <p className="font-display text-xs uppercase tracking-wide text-ink-soft">
            Estado técnico
          </p>
          <p className="mt-1 font-body text-xs text-ink-soft">
            Dataset version: <span className="font-semibold text-wood-dark">{datasetVersion}</span>
          </p>
          <ul className="mt-2 flex flex-wrap items-center justify-start gap-2">
            {shellModules.map((shellModule) => (
              <li
                key={shellModule.id}
                className="rounded-control border-2 border-wood-dark/50 bg-paper px-2.5 py-0.5 font-body text-xs text-ink"
              >
                {shellModule.id}:{' '}
                <span className="font-semibold text-success-dark">
                  {shellModule.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  )
}
