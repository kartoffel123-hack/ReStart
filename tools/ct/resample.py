"""Run MeshLib in its own process: its native runtime and OCCT must not unload together."""

import argparse
from pathlib import Path

import meshlib.mrmeshpy as mr


def resample(source, output, voxel, max_error):
    settings = mr.RebuildMeshSettings()
    settings.voxelSize = voxel
    settings.decimate = True
    mesh = mr.rebuildMesh(mr.loadMesh(source), settings)
    decimate = mr.DecimateSettings()
    decimate.maxError = max_error
    decimate.packMesh = True
    mr.decimateMesh(mesh, decimate)
    mr.saveMesh(mesh, output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('voxel', type=float)
    parser.add_argument('max_error', type=float)
    args = parser.parse_args()
    resample(args.source, args.output, args.voxel, args.max_error)
