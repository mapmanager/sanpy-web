# SanPy Web

Static Vue/TypeScript viewer for self-contained SanPy Zarr collections. It
supports hosted URLs and user-selected local folders, recording discovery,
sweep/channel selection, range-loaded Zarr v3 signals, CSV or Parquet analysis
results, runtime-defined trace overlays, and NicePool analysis exploration.

**Open SanPy Web:** https://mapmanager.github.io/sanpy-web/

**Documentation:** https://mapmanager.github.io/sanpy-web/docs/

## Development

```bash
cd ../mapmanager-web-components
npm ci
npm run build --workspace @mapmanager/nicepool --workspace @mapmanager/signal-viewer
cd ../sanpy-web
npm ci
npm run dev
```

Run the application checks and production build with `npm run check`.

Documentation uses MkDocs Material. After installing `requirements-docs.txt`,
preview or build it with `npm run docs:serve` or `npm run docs:build`.

To inspect the generated sample package, serve its parent directory:

```bash
cd /Users/cudmore/Desktop/tmp/sanpy-zarr/contract-v1-draft
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open SanPy Web and enter:

```text
http://127.0.0.1:8765/sanpy-sample-both.sanpy.zarr/
```

The data server must permit CORS when it runs on a different origin. The local
folder button avoids a server and is supported by Chrome and Edge.

## Boundaries

SanPy owns the serialized Zarr contract. `sanpy-web` loads that contract and
adapts its signals and runtime-owned overlay mappings to the generic
`@mapmanager/signal-viewer` API. Browser-specific styling and layout remain in
this repository.

## License

SanPy Web is licensed under the GNU General Public License v3.0 only. See
[`LICENSE`](LICENSE).
