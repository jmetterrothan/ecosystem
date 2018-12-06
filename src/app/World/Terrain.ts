import * as THREE from 'three';

import Chunk from './Chunk';
import World from './World';
import BiomeGenerator from './BiomeGenerator';
import Coord from './Coord';

import { TERRAIN_MATERIAL } from '@materials/terrain.material';
import { WATER_MATERIAL } from '@materials/water.material';
import { CLOUD_MATERIAL } from '@materials/cloud.material';

class Terrain {
  static readonly NCHUNKS_X: number = 64;
  static readonly NCHUNKS_Z: number = 64;
  static readonly NCOLS: number = Terrain.NCHUNKS_X * Chunk.NCOLS;
  static readonly NROWS: number = Terrain.NCHUNKS_Z * Chunk.NROWS;

  static readonly SIZE_X: number = Terrain.NCOLS * Chunk.CELL_SIZE_X;
  static readonly SIZE_Y: number = Chunk.HEIGHT;
  static readonly SIZE_Z: number = Terrain.NROWS * Chunk.CELL_SIZE_Z;

  static readonly OFFSET_X: number = Terrain.SIZE_X / 2;
  static readonly OFFSET_Z: number = Terrain.SIZE_Z / 2;

  private chunks: Map<string, Chunk>;
  private visibleChunks: Chunk[];

  private start: Coord;
  private end: Coord;
  private chunk: Coord;

  private scene: THREE.Scene;
  private generator: BiomeGenerator;
  public terrain: THREE.Mesh;
  public water: THREE.Mesh;
  public clouds: THREE.Mesh;

  private layers: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generator = new BiomeGenerator();
    this.chunks = new Map<string, Chunk>();
    this.visibleChunks = [];

    this.layers = new THREE.Group();

    this.chunk = new Coord();
    this.start = new Coord();
    this.end = new Coord();
  }

  init() {
    this.terrain = new THREE.Mesh(new THREE.Geometry(), TERRAIN_MATERIAL);
    this.terrain.frustumCulled = true;
    this.layers.add(this.terrain);

    this.water = new THREE.Mesh(new THREE.Geometry(), WATER_MATERIAL);
    this.water.frustumCulled = true;
    this.layers.add(this.water);

    this.clouds = new THREE.Mesh(new THREE.Geometry(), CLOUD_MATERIAL);
    this.clouds.frustumCulled = true;
    this.layers.add(this.clouds);

    this.layers.add(<THREE.Object3D>Terrain.createRegionBoundingBoxHelper());

    this.scene.add(this.layers);
  }

  preload() {
    this.loadChunks(0, 0, Terrain.NCHUNKS_Z, Terrain.NCHUNKS_X);
  }

  loadChunks(startRow: number, startCol: number, endRow: number, endCol: number) {
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        this.chunks.set(`${row}:${col}`, this.loadChunk(row, col));
      }
    }
  }

  loadChunk(row: number, col: number): Chunk {
    const chunk = new Chunk(this.generator, row, col);
    chunk.init(this);

    // this.scene.add(Chunk.createBoundingBoxHelper(chunk.bbox));

    return chunk;
  }

  update(frustum: THREE.Frustum, position: THREE.Vector3) {
    this.getChunkCoordAt(this.chunk, position.x, position.z);

    this.start.col = Math.max(this.chunk.col - Terrain.NCHUNKS_X, 0);
    this.start.row = Math.max(this.chunk.row - Terrain.NCHUNKS_Z, 0);
    this.end.col = Math.min(this.chunk.col + Terrain.NCHUNKS_X, Terrain.NCHUNKS_X);
    this.end.row = Math.min(this.chunk.row + Terrain.NCHUNKS_Z, Terrain.NCHUNKS_Z);

    // reset previously visible chunks
    for (const chunk of this.visibleChunks) {
      if (chunk && (chunk.col < this.start.col || chunk.col > this.end.col || chunk.row < this.start.row || chunk.row > this.end.row)) {
        chunk.clean(this.scene);
      }
      chunk.setVisible(false);
    }

    this.visibleChunks = [];

    // loop through all chunks in range
    for (let i = this.start.row; i < this.end.row; i++) {
      for (let j = this.start.col; j < this.end.col; j++) {
        let chunk = this.getChunk(i, j);

        // generate chunk if needed
        if (chunk === undefined) {
          chunk = this.loadChunk(i, j);
        }

        // chunk is visible in frustum
        if (frustum.intersectsBox(chunk.bbox)) {
          if (chunk.dirty) {
            chunk.populate(this.scene);
          }

          // mark this chunk as visible for the next update
          chunk.setVisible(true);
          this.visibleChunks.push(chunk);
        }
      }
    }
  }

  getChunkCoordAt(out: Coord, x: number, z: number) : Coord {
    out.row = (z / Chunk.DEPTH) | 0;
    out.col = (x / Chunk.WIDTH) | 0;

    return out;
  }

  getChunk(row: number, col: number): Chunk|undefined {
    return this.chunks.get(`${row}:${col}`);
  }

  getChunkAt(x: number, z: number) {
    const p = this.getChunkCoordAt(new Coord(), x, z);

    return this.chunks.get(`${p.row}:${p.col}`);
  }

  getHeightAt(x: number, z: number) {
    return this.generator.computeHeight(x, z);
  }

  static createRegionBoundingBox() : THREE.Box3 {
    return new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(
          Terrain.SIZE_X / 2,
          Terrain.SIZE_Y / 2,
          Terrain.SIZE_Z / 2
        ),
        new THREE.Vector3(
          Terrain.SIZE_X,
          Terrain.SIZE_Y,
          Terrain.SIZE_Z
        ));
  }

  static createRegionBoundingBoxHelper(bbox: THREE.Box3 = null) : THREE.Box3Helper {
    return new THREE.Box3Helper(bbox ? bbox : Terrain.createRegionBoundingBox(), 0xff0000);
  }
}

export default Terrain;
