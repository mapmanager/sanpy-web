# SanPy Web — Agent Instructions

SanPy Web is a static Vue/TypeScript viewer for the SanPy Zarr contract. Keep
package transport and adaptation in this repository; keep reusable plotting
behavior in `@mapmanager/signal-viewer`.

- Treat SanPy's bundled Zarr JSON schemas as the producer contract.
- Treat `../mapmanager-web-components/packages/signal-viewer` as the viewer API.
- Use `../cloudscope-web` read-only for architectural patterns; do not copy its OME domain model.
- Production builds must remain static and support hosted URLs. Local folder access is progressive enhancement.
- Run `npm run check` before handoff.

Work as a senior developer: verify facts from code, tests, or authoritative APIs
rather than guessing. When user input is genuinely required, ask a focused
question and include a clear senior-level recommendation.
