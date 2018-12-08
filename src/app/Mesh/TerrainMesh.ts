import * as THREE from 'three';

import Mesh from '@mesh/Mesh';
import World from '@world/World';
import Chunk from '@world/Chunk';
import BiomeGenerator from '@world/BiomeGenerator';
import MathUtils from '@shared/utils/Math.utils';

import { MESH_TYPES } from '@shared/enums/mesh.enum';
import { TERRAIN_MATERIAL } from '@materials/terrain.material';

import { IChunkParameters } from '@shared/models/chunkParameters.model';

class TerrainMesh extends Mesh {

  constructor(generator: BiomeGenerator, row: number, col: number) {
    super(generator, row, col, MESH_TYPES.TERRAIN_MESH, <IChunkParameters>{
      maxChunkHeight: Chunk.HEIGHT,
      minChunkHeight: Chunk.HEIGHT,
      nRows: Chunk.NROWS,
      nCols: Chunk.NCOLS,
      cellSizeX: Chunk.CELL_SIZE_X,
      cellSizeZ: Chunk.CELL_SIZE_Z,
      width: Chunk.WIDTH,
      height: Chunk.HEIGHT,
      depth: Chunk.DEPTH
    });
  }

  getY(x: number, z: number): number {
    return this.generator.computeHeight(x, z);
  }

  getMaterial(): THREE.Material {
    return TERRAIN_MATERIAL;
  }

  getLow(): number {
    return this.low;
  }

  needGenerateWater(): boolean {
    return this.low <= Chunk.SEA_LEVEL;
  }

  needGenerateCloud(): boolean {
    const t = (this.moistureAverage > 0.66) ? 0.95 : 0.975;

    return this.moistureAverage > 0.34 && MathUtils.rng() > t;
  }

  buildGeometry(): THREE.Geometry {
    const geometry: THREE.Geometry = new THREE.Geometry();

    const nbVerticesX = this.parameters.nCols + 1;
    const nbVerticesZ = this.parameters.nRows + 1;

    // creates all our vertices
    for (let c = 0; c < nbVerticesX; c++) {
      const x = this.col * this.parameters.width + c * this.parameters.cellSizeX;
      for (let r = 0; r < nbVerticesZ; r++) {
        const z = this.row * this.parameters.depth + r * this.parameters.cellSizeZ;
        const y = this.getY(x, z);

        if (this.low === null || this.low > y) this.low = y;
        if (this.high === null || this.high < y) this.high = y;

        geometry.vertices.push(new THREE.Vector3(x, y, z));
      }
    }

    // creates the associated faces with their indexes
    let sumMoisture = 0;

    for (let col = 0; col < this.parameters.nCols; col++) {
      for (let row = 0; row < this.parameters.nRows; row++) {
        const a = col + nbVerticesX * row;
        const b = (col + 1) + nbVerticesX * row;
        const c = col + nbVerticesX * (row + 1);
        const d = (col + 1) + nbVerticesX * (row + 1);

        const f1 = new THREE.Face3(a, b, d);
        const f2 = new THREE.Face3(d, c, a);

        const x1 = (geometry.vertices[a].x + geometry.vertices[b].x + geometry.vertices[d].x) / 3;
        const x2 = (geometry.vertices[d].x + geometry.vertices[c].x + geometry.vertices[a].x) / 3;

        const y1 = (geometry.vertices[a].y + geometry.vertices[b].y + geometry.vertices[d].y) / 3;
        const y2 = (geometry.vertices[d].y + geometry.vertices[c].y + geometry.vertices[a].y) / 3;

        const z1 = (geometry.vertices[a].z + geometry.vertices[b].z + geometry.vertices[d].z) / 3;
        const z2 = (geometry.vertices[d].z + geometry.vertices[c].z + geometry.vertices[a].z) / 3;

        const m1 = this.generator.computeMoisture(x1, z1);
        const m2 = this.generator.computeMoisture(x2, z2);

        f1.color = this.generator.getBiome(BiomeGenerator.getElevationFromHeight(y1), m1).color;
        f2.color = this.generator.getBiome(BiomeGenerator.getElevationFromHeight(y2), m2).color;

        geometry.faces.push(f1);
        geometry.faces.push(f2);

        sumMoisture += m1 + m2;
      }
    }

    this.moistureAverage = sumMoisture / (this.parameters.nCols * this.parameters.nRows * 2);

    // need to tell the engine we updated the vertices
    geometry.verticesNeedUpdate = true;
    geometry.colorsNeedUpdate = true;

    // need to update normals for smooth shading
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.normalsNeedUpdate = true;

    return geometry;
  }
}

export default TerrainMesh;
