# SanPy Zarr contract

SanPy Web consumes self-contained `.sanpy.zarr` collections exported by SanPy.
The collection manifest discovers recordings and their resources. Each
recording contains Zarr signal arrays, row-oriented analysis tables, metadata,
detection definitions, analysis-result definitions, and trace-overlay mappings.

The persisted definitions remain authoritative. SanPy Web uses them to adapt
column types and labels for NicePool and to configure signal overlays. Changes
to the data contract belong in the SanPy exporter and should be accompanied by
exporter and client compatibility tests.
