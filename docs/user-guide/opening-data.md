# Opening data

## Hosted collection

Enter the URL of a `.sanpy.zarr` collection. The host must permit cross-origin
access when it is on a different origin from SanPy Web.

## Local collection

Use the local-folder control to select a `.sanpy.zarr` directory. Local-folder
access depends on the browser File System Access API and is supported in current
Chromium-based browsers such as Chrome and Edge.

SanPy Web reads the selected data in the browser. It does not upload a locally
selected collection to a SanPy Web server.
