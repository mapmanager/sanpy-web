# SanPy Web — Agent Instructions

SanPy Web is a static Vue/TypeScript viewer for the AcqStore Trace Collection
contract. Keep AcqStore transport and package adaptation in this repository;
keep reusable plotting behavior in `@mapmanager/signal-viewer`.

- Treat `../acqstore/docs/acqstore-trace-collection-v0.1.md` as the producer contract.
- Treat `../mapmanager-web-components/packages/signal-viewer` as the viewer API.
- Use `../cloudscope-web` read-only for architectural patterns; do not copy its OME domain model.
- Production builds must remain static and support hosted URLs. Local folder access is progressive enhancement.
- Run `npm run check` before handoff.

