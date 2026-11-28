# CT-03 · Fusion conversion candidate

Fusion destination: `Admin Project / Hackathon / CT`. The surface-checked assembly is `CT 4000041 - ac353a4f709f`; the earlier `CT 4000041 - Studio assembly` is historical. This is a CAD identity and geometry check, not a physical repair record.

| Witness | Observation |
|---|---|
| Studio archive | `b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2` |
| Fusion STEP AP214 (local `.tmp/ct/fusion-4000041.step`) | `ac353a4f709faa817ffca7694e5b8bd6398aec548f953b7ad1e6584d491072d5` |
| Independent OpenCascade reimport | 566/566 unique definition + pose matches; 4,782 positive-volume solid occurrences, grouped into 566 placed articles. Two empty reader fragments in one minifigure article were excluded from the solid count only after matching all five native Fusion body volumes. OCCT reported two faces with null triangulation. |
| Fusion occurrence hierarchy | Base 57, MRI 271 (Studio group name), Mid section 14, Back room 85, Control room 104, Decoration 10, Minifigs 25. 114 reusable part definitions and 22 source colour codes. |
| Solid conversion | 85 planar-cell definitions, 27 resampled definitions, two posed articles reconstructed as separate limb solids. Method and tolerances are in `.tmp/ct/solids/index.json`. Reopened STEP was checked against 240,312 source vertices/triangle centres: none was outside the material by more than 0.1 mm (worst 0.0982 mm). This is a sampled surface check, not a tolerance certificate for every fit. |
| Regression found by the surface check | The first export matched every placement but lost the middle of the flexible string (worst omission 30.197 mm). The corrected string passed all 4,596 landmarks (maximum 0.0761 mm). An equal-bounds counterexample is in `tests/geometry/test_ct_fidelity.py`. |
| Alternative inventory | 563 LXFML bricks (599 child part records); sequence reconciled to `model.ldr` except L112 custom turntable, L485 ship portrait and L550 loose brick separator, all present in the 566 source placements. The loose separator is not a healthy part moved by the demo. V2 identifier 1104 occurs twice; it cannot key an occurrence. |

## Reproduce locally

Use the immutable Studio input and the installed Studio LDraw library (or pass `--library`). From the repository root:

```sh
python3 -B -m unittest discover -s tests/data -p 'test_ct*.py'
python3 -B -m tools.ct.source
python3 -B -m tools.ct.surfaces
uv venv .tmp/ct-cad-env --python 3.12
uv pip install --python .tmp/ct-cad-env/bin/python -r tools/ct/requirements-cad.txt
.tmp/ct-cad-env/bin/python -B -m tools.ct.patterns
.tmp/ct-cad-env/bin/python -B -m unittest discover -s tests/geometry -p test_ct_fidelity.py
.tmp/ct-cad-env/bin/python -B -m tools.ct.solids --repair-open
```

In Fusion's Python environment, call `assemble(staging_path, sample=False)` from `tools/ct/fusion_assembly.py`. It creates a separate unsaved design, exports the full assembly and records a native body witness. Then run `.tmp/ct-cad-env/bin/python -B -m tools.ct.check_step --export-meshes` in the shell. This reads the Fusion export, maps each source ID to its STEP path, pose and solids, and tests the source landmarks. Correct any rejected definitions and repeat export/reimport; `tools.ct.solids --repair-open --repair-export` consumes the revision-bound worklist. Sample mode exercises both a repeated slope at two different orientations and a composite with flexible geometry. Never commit generated CAD intermediates.
