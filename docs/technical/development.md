# Development

SanPy Web requires Node.js 22 or newer, npm, and a sibling checkout of
[`mapmanager-web-components`](https://github.com/mapmanager/mapmanager-web-components).

Build the linked NicePool and Signal Viewer packages before installing SanPy
Web:

```bash
cd ../mapmanager-web-components
npm ci
npm run build --workspace @mapmanager/nicepool --workspace @mapmanager/signal-viewer
cd ../sanpy-web
npm ci
npm run dev
```

Run application verification with `npm run check`. Documentation requires the
Python packages in `requirements-docs.txt` and is built with
`npm run docs:build`.

GitHub Actions follows `mapmanager-web-components/main`. Push required shared
component changes before pushing a SanPy Web change that consumes them.
