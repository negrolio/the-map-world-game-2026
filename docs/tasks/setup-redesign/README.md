# Setup redesign — menos web, más game

**Estado (2026-06-04):** **en ejecución** — decisión, PRD (borrador), plan y todo list listos; pendiente implementación Fases 1–7.

| Documento | Rol |
|-----------|-----|
| [`00-decision-setup-look-and-feel.md`](./00-decision-setup-look-and-feel.md) | ADR D1–D9 (jerarquía lobby/pergamino, cards de modo, reglas AI, copy) |
| [`01-prd-setup-redesign.md`](./01-prd-setup-redesign.md) | PRD (borrador): US-01..US-09, RF-S10..RF-S50, RNF, edge cases, fuera de alcance |
| [`02-plan-implementacion-setup-redesign.md`](./02-plan-implementacion-setup-redesign.md) | Plan técnico por 7 fases |
| [`03-todo-list-setup-redesign.md`](./03-todo-list-setup-redesign.md) | Checklist de ejecución con ritual §0 y cierre por fase |

## Alcance resumido

- **Lobby** fuera del pergamino: 3 cards de modo (patrón `HomeModeCard`) + **Jugar ahora**.
- **Panel de configuración** reordenado; tags AI arriba del pergamino cuando aplica.
- **Modo AI:** máx. 2 jugadores, 5 preguntas fijas (ocultas), sin anti-cheat ni aviso strict en UI.
- **Limpieza UX:** sin JSON preview, sin “configuración válida”, copy home/setup actualizado.
- **Assets:** placeholders + brief de ilustración para cards de modo.

## Origen

Promovida desde [`../ideas-features-backlog.md`](../ideas-features-backlog.md) — *Setup redesign — menos web, más game*.
