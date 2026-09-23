SanPy Web is an online viewer for electrophysiology recordings and their
analysis performed in [SanPy](https://cudmore.github.io/SanPy/). It lets you
review recordings and spike-detection results in a web browser without opening
the SanPy desktop application.

[Open SanPy Web](https://mapmanager.github.io/sanpy-web/){ .md-button .md-button--primary }

## What you can do

- Load datasets exported from SanPy.
- Browse a collection of recordings.
- View metadata for each recording.
- View the spike-detection parameters used for the analysis.
- View individual recordings with detection overlays, including peaks and
  take-off potentials.
- Use NicePool to visualize summary results across all sweeps in a recording,
  including frequency–current (F–I) curves.

After loading a collection, select a recording to inspect its traces, analysis
overlays, and analysis-results table. NicePool's linked plots help you explore
summary results, and controls let you change columns, grouping, colors, and
filters.

## Opening data

### Hosted collection

Enter the URL of a `.sanpy.zarr` collection. The host must permit cross-origin
access when it is on a different origin from SanPy Web.

### Local collection

Use the local-folder control to select a `.sanpy.zarr` directory. Local-folder
access depends on the browser File System Access API and is supported in current
Chromium-based browsers such as Chrome and Edge.

SanPy Web reads the selected data in the browser. It does not upload a locally
selected collection to a SanPy Web server.

See the [technical documentation](technical/index.md) for development and
data-contract details.
