# SanPy Web

Static Vue/TypeScript viewer for AcqStore Trace Collection packages. The first
vertical slice supports hosted URLs and user-selected local folders, recording
discovery, sweep/channel selection, range-loaded Zarr v3 signals and pyramids,
Parquet peak overlays, and NicePool analysis exploration.

## Development

```bash
npm install
npm run dev
```

To inspect the generated sample package, serve its parent directory:

```bash
cd /private/tmp/acqstore-sanpy-export.K5ijK7
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open SanPy Web and enter:

```text
http://127.0.0.1:8765/sanpy-sample-data.sanpy/
```

The data server must permit CORS when it runs on a different origin. The local
folder button avoids a server and is supported by Chrome and Edge.

## Boundaries

AcqStore owns the serialized trace contract. `sanpy-web` owns package loading
and adapts it to the generic `@mapmanager/signal-viewer` API. It does not import
Python or alter the AcqStore, SanPy, CloudScope, or component repositories.
