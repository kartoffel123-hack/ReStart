# CT-03 · Fusion conversion candidate

Fusion destination: `Admin Project / Hackathon / CT`, with the component `CT 4000041 - Studio assembly`. This is a CAD identity check, not a physical repair record.

| Witness | Observation |
|---|---|
| Studio archive | `b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2` |
| Fusion STEP (in local `.tmp/ct/fusion-4000041.step`) | `b1c1b51ec44d7a09a83735895a67663c94a73da4559d4d4612ad75dea17378f8` |
| Independent OpenCascade reimport | 566/566 unique definition + pose matches; maximum origin difference 1.15e−13 mm; 4,840 positive-volume solid occurrences, grouped into 566 individually selectable articles. |
| Fusion occurrence hierarchy | Base 57, MRI 271 (Studio group name), Mid section 14, Back room 85, Control room 104, Decoration 10, Minifigs 25. 114 reusable part definitions and 22 source colour codes. |
| Solid conversion | 89 definitions reconstructed from intersecting planar faces; 25 required resampling at 0.12 or 0.08 mm. Each resampled part's issue, grid size, simplification tolerance and bounds error are in `.tmp/ct/solids/index.json`. Bounding agreement does not certify local contact geometry. Base colours are occurrence overrides; printed and transparent appearances need separate visual review. |

## Reproduce locally

Use the immutable Studio input and the installed Studio LDraw library (or pass `--library`). From the repository root:

```sh
python3 -B -m unittest discover -s tests/data -p 'test_ct*.py'
python3 -B -m tools.ct.source
python3 -B -m tools.ct.surfaces
uv venv .tmp/ct-cad-env --python 3.12
uv pip install --python .tmp/ct-cad-env/bin/python -r tools/ct/requirements-cad.txt
.tmp/ct-cad-env/bin/python -B -m tools.ct.solids --repair-open
```

In Fusion's Python environment, call `assemble(staging_path, sample=False)` from `tools/ct/fusion_assembly.py`. It creates a separate unsaved design, exports the full assembly and refuses to substitute placeholders for failed solids. Then run `.tmp/ct-cad-env/bin/python -B -m tools.ct.check_step --export-meshes` in the shell. This reads the Fusion export, not the pre-Fusion definitions. The crosswalk maps each source ID to its STEP path, pose and solids. The sample mode exercises both a repeated slope at two different orientations and a composite with flexible geometry. Never commit the generated CAD intermediates.
