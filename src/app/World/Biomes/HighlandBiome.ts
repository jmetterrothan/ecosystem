import * as THREE from 'three';

import Terrain from '@world/Terrain';
import Biome from '@world/Biome';
import BiomeGenerator from '@world/BiomeGenerator';
import Chunk from '@world/Chunk';
import Boids from '@boids/Boids';
import MathUtils from '@shared/utils/Math.utils';

import { IBiome } from '@shared/models/biome.model';
import { SUB_BIOMES } from '@shared/constants/subBiomes.constants';

class HighlandBiome extends Biome {
  private a: number;
  private b: number;
  private c: number;

  private f: number;
  private spread: number;

  private boids: Boids;

  constructor(generator: BiomeGenerator) {
    super('HIGHLANDS', generator);

    this.waterDistortion = true;
    this.waterDistortionFreq = 2.25;
    this.waterDistortionAmp = 1024.0;

    this.a = MathUtils.randomFloat(0.075, 0.3); // best around 0.65, size of the island
    this.b = MathUtils.randomFloat(0.5, 0.750); // best around 0.80, makes multiple hills even when low
    this.c = MathUtils.randomFloat(0.85, 1.00); // best around 0.85;

    this.spread = MathUtils.randomFloat(1.1, 1.5); // expand over the map (higher values means more space available for water)
    this.f = MathUtils.randomFloat(0.95, 3);
  }

  init(scene: THREE.Scene, terrain: Terrain) {
    // butterflies
    this.boids = new Boids(
      scene,
      new THREE.Vector3(100000, 25000, 100000),
      new THREE.Vector3(Terrain.SIZE_X / 2 + 5000, Chunk.CLOUD_LEVEL - 25000 / 2, Terrain.SIZE_Z / 2 + 5000),
      'butterfly',
      6,
      {
        speed: 150,
        neighbourRadius: 6000,
        alignmentWeighting: 0.0065,
        cohesionWeighting: 0.01,
        separationWeighting: 0.1,
        viewAngle: 20
      }
    );

  }

  update(delta: number) {
    this.boids.update(delta);
  }

  /**
   * Compute elevation
   * @param {number} x coord component
   * @param {number} z coord component
   * @return {number} elevation value
   */
  computeElevationAt(x: number, z: number): number {
    const nx = (x - Terrain.SIZE_X / 2) / (2048 * 64);
    const nz = (z - Terrain.SIZE_Z / 2) / (2048 * 64);

    let e = 0.50 * this.generator.noise(1 * nx, 1 * nz)
      + 1.00 * this.generator.noise(2 * nx, 2 * nz)
      + 0.35 * this.generator.ridgeNoise(3 * nx, 3 * nz)
      + 0.13 * this.generator.noise(8 * nx, 8 * nz)
      + 0.06 * this.generator.noise(16 * nx, 16 * nz)
      + 0.035 * this.generator.noise(128 * nx, 128 * nz)
      + 0.035 * this.generator.noise2(128 * nx, 128 * nz)
      + 0.025 * this.generator.noise(512 * nx, 512 * nz)
      // second layer
      + (0.50 * this.generator.noise2(1 * nx, 1 * nz)
        + 1.00 * this.generator.noise3(2 * nx, 2 * nz)
        + 0.2 * this.generator.ridgeNoise2(4 * nx, 4 * nz)
        + 0.13 * this.generator.noise2(8 * nx, 8 * nz)
        + 0.06 * this.generator.noise3(16 * nx, 16 * nz)
        + 0.035 * this.generator.noise2(128 * nx, 128 * nz)
        + 0.025 * this.generator.noise2(512 * nx, 512 * nz));

    e /= 0.5 + 1.0 + 0.35 + 0.13 + 0.06 + 0.035 * 2 + 0.025 + 1.00 + 0.50 + 0.2 + 0.13 + 0.06 + 0.035 + 0.025;
    e **= this.f;
    const d = this.spread * BiomeGenerator.getEuclideanDistance(nx, nz);
    e = BiomeGenerator.islandAddMethod(this.a, this.b, this.c, d, e);

    return e;
  }

  computeMoistureAt(x: number, z: number): number {
    const value = super.computeMoistureAt(x, z);

    // bias towards high humidity
    return Math.min(value + 0.2, 1.0);
  }

  getParametersAt(e: number, m: number): IBiome {
    if (e < Chunk.SEA_ELEVATION - 0.05) {
      return SUB_BIOMES.OCEAN;
    }

    if (e > Chunk.CLOUD_ELEVATION + 0.1) {
      return SUB_BIOMES.MOUNTAIN;
    }

    if (e > Chunk.SEA_ELEVATION + 0.175) {
      return SUB_BIOMES.TUNDRA;
    }

    return SUB_BIOMES.SWAMP;
  }
}

export default HighlandBiome;
