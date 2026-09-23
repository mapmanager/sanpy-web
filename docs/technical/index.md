# Technical information

SanPy Web is a Vue and TypeScript static application built with Vite. SanPy owns
the persisted SanPy Zarr contract; this repository provides the thin browser
client that reads it and adapts its data to reusable widgets from
[MapManager Web Components](https://mapmanager.github.io/mapmanager-web-components/).

MapManager Web Components is developed alongside SanPy Web to provide shared,
browser-based building blocks for future electrophysiology and imaging
analysis applications. SanPy Web keeps SanPy-specific data loading and
adaptation in this repository while delegating reusable visualization and
interaction behavior to two components:

- [Signal Viewer](https://mapmanager.github.io/mapmanager-web-components/signal-viewer/)
  plots recorded signals against time and provides zooming, panning,
  measurement cursors, and analysis overlays. SanPy Web uses it to display
  recording traces, derivatives, and detected spike features. See the
  [Signal Viewer demo](https://mapmanager.github.io/mapmanager-web-components/demos/signal-viewer/).
- [NicePool](https://mapmanager.github.io/mapmanager-web-components/nicepool/)
  provides linked statistical plots, filtering, selection, and summaries.
  SanPy Web uses it to explore analysis results across the sweeps in a
  recording. See the
  [NicePool demo](https://mapmanager.github.io/mapmanager-web-components/demos/nicepool/).

## SanPy Zarr contract

SanPy Web consumes self-contained `.sanpy.zarr` collections exported by SanPy.
The collection manifest discovers recordings and their resources. Each
recording contains Zarr signal arrays, row-oriented analysis tables, metadata,
detection definitions, analysis-result definitions, and trace-overlay mappings.

The persisted definitions remain authoritative. SanPy Web uses them to adapt
column types and labels for NicePool and to configure signal overlays. Changes
to the data contract belong in the SanPy exporter and should be accompanied by
exporter and client compatibility tests.
