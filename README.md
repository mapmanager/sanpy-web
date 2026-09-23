# SanPy Web

SanPy Web is an online viewer for electrophysiology recordings and their
analysis performed in the [SanPy](https://cudmore.github.io/SanPy/) desktop
application. It lets you review recordings and spike-detection results in a web
browser without opening the SanPy desktop application.

**Open SanPy Web:** https://mapmanager.github.io/sanpy-web/


## What you can do

- Load datasets exported from SanPy.
- Browse a collection of recordings.
- View metadata for each recording.
- View the spike-detection parameters used for the analysis.
- View individual recordings with detection overlays, including peaks and
  take-off potentials.
- Use NicePool to visualize summary results across all sweeps in a recording,
  including frequency–current (F–I) curves.

For additional details, see the [SanPy Web documentation](https://mapmanager.github.io/sanpy-web/docs/).


## Technical overview

SanPy Web is a static Vue/TypeScript viewer for self-contained SanPy Zarr
collections. It supports hosted URLs and user-selected local folders, recording
discovery, sweep/channel selection, range-loaded Zarr v3 signals, CSV or Parquet
analysis results, runtime-defined trace overlays, and NicePool analysis
exploration.

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

### Local documentation

Documentation uses MkDocs Material and requires
[`uv`](https://docs.astral.sh/uv/). Start the local documentation server with:

```bash
npm run docs:serve
```

Build the documentation with `npm run docs:build`. The npm scripts use `uv` to
install the pinned dependencies from `requirements-docs.txt`; no manual Python
environment setup is required.

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
