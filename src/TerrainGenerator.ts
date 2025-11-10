import { createNoise2D } from 'simplex-noise'
import type { NoiseFunction2D } from 'simplex-noise'
import Rand from 'rand-seed'

/**
 * Handles procedural terrain generation with cluster filtering
 */
export class TerrainGenerator {
  private noise2D: NoiseFunction2D

  // Noise parameters
  private readonly noiseScale = 0.1
  private readonly waterThreshold = 0.2
  private readonly minWaterClusterSize = 4 // Minimum 2x2 cluster

  constructor(seed: string = 'procgentown') {
    // Create noise generator with fixed seed for consistency
    const rand = new Rand(seed)
    this.noise2D = createNoise2D(() => rand.next())
  }

  /**
   * Check if a tile should be water based on noise value
   */
  private isWaterByNoise(col: number, row: number): boolean {
    const noiseValue = this.noise2D(col * this.noiseScale, row * this.noiseScale)
    const normalizedNoise = (noiseValue + 1) / 2
    return normalizedNoise < this.waterThreshold
  }

  /**
   * Flood fill to count the size of a water cluster
   * Returns the size of the cluster starting from (col, row)
   */
  private countWaterClusterSize(
    col: number,
    row: number,
    waterMap: Map<string, boolean>,
    visited: Set<string>
  ): number {
    const key = `${col},${row}`

    // If already visited or not water, return 0
    if (visited.has(key) || !waterMap.get(key)) {
      return 0
    }

    visited.add(key)
    let size = 1

    // Check 4-connected neighbors (not diagonal)
    const neighbors = [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1]
    ]

    for (const [neighborCol, neighborRow] of neighbors) {
      size += this.countWaterClusterSize(neighborCol, neighborRow, waterMap, visited)
    }

    return size
  }

  /**
   * Generate a water map for a region, filtering out small clusters
   * Returns a map of tile positions to whether they should be water
   */
  private generateWaterMap(
    startCol: number,
    startRow: number,
    endCol: number,
    endRow: number
  ): Map<string, boolean> {
    // First pass: determine raw water/grass based on noise
    const rawWaterMap = new Map<string, boolean>()
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const key = `${col},${row}`
        rawWaterMap.set(key, this.isWaterByNoise(col, row))
      }
    }

    // Second pass: identify small clusters and mark them for removal
    const visited = new Set<string>()
    const smallClusters = new Set<string>()

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const key = `${col},${row}`

        if (!visited.has(key) && rawWaterMap.get(key)) {
          // Found an unvisited water tile, count its cluster
          const clusterVisited = new Set<string>()
          const clusterSize = this.countWaterClusterSize(col, row, rawWaterMap, clusterVisited)

          // Mark all tiles in this cluster as visited
          for (const tileKey of clusterVisited) {
            visited.add(tileKey)

            // If cluster is too small, mark for removal
            if (clusterSize < this.minWaterClusterSize) {
              smallClusters.add(tileKey)
            }
          }
        }
      }
    }

    // Third pass: create final water map with small clusters removed
    const finalWaterMap = new Map<string, boolean>()
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const key = `${col},${row}`
        const shouldBeWater = rawWaterMap.get(key) && !smallClusters.has(key)
        finalWaterMap.set(key, shouldBeWater || false)
      }
    }

    return finalWaterMap
  }

  /**
   * Generate terrain types for a chunk region
   * Returns a map with tile coordinates as keys and water boolean as values
   */
  public generateChunkTerrain(
    chunkX: number,
    chunkY: number,
    chunkSize: number
  ): Map<string, boolean> {
    const PADDING = 8 // Check tiles around the chunk to detect clusters at edges

    const startCol = chunkX * chunkSize - PADDING
    const startRow = chunkY * chunkSize - PADDING
    const endCol = (chunkX + 1) * chunkSize + PADDING
    const endRow = (chunkY + 1) * chunkSize + PADDING

    return this.generateWaterMap(startCol, startRow, endCol, endRow)
  }
}
