# Development

SanPy Web requires Git, Node.js 22 or newer, and npm. Its local package
dependencies require `sanpy-web` and `mapmanager-web-components` to be sibling
directories.

## Clone and run

To run SanPy-Web locally you need to use both [`mapmanager-web-components`](https://github.com/mapmanager/mapmanager-web-components) and [`sanpy-web`](https://github.com/mapmanager/sanpy-web).

1. Create a directory that will contain both repositories, then clone [`mapmanager-web-components`](https://github.com/mapmanager/mapmanager-web-components) and [`sanpy-web`](https://github.com/mapmanager/sanpy-web) into it

    ```bash
    mkdir sanpy-web-workspace
    cd sanpy-web-workspace
    git clone https://github.com/mapmanager/mapmanager-web-components.git
    git clone https://github.com/mapmanager/sanpy-web.git
    ```

2. Build NicePool and Signal Viewer

    ```bash
    cd mapmanager-web-components
    npm ci
    npm run build --workspace @mapmanager/nicepool --workspace @mapmanager/signal-viewer
    ```

3. Install and run SanPy web:

    ```bash
    cd ../sanpy-web
    npm ci
    npm run dev
    ```

## Run application verification

From the `sanpy-web` directory, run the type checker, tests, and production
build together:

```bash
npm run check
```

## Documentation

Documentation requires [`uv`](https://docs.astral.sh/uv/). The npm scripts use
the packages pinned in `requirements-docs.txt`.

Preview the documentation locally:

```bash
npm run docs:serve
```

Build the documentation:

```bash
npm run docs:build
```

## Pushing dependent changes

GitHub Actions follows `mapmanager-web-components/main`. Push required shared
component changes before pushing a SanPy Web change that consumes them.
