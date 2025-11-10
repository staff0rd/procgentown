import { Container, Sprite, Texture } from 'pixi.js'
import { createNoise2D } from 'simplex-noise'
import type { NoiseFunction2D } from 'simplex-noise'
import Rand from 'rand-seed'

export class ChunkManager {
  private chunks: Map<string, Sprite[]> = new Map()
  private tilesContainer: Container
  private grassTexture: Texture
  private waterTexture: Texture
  private noise2D: NoiseFunction2D

  // Constants matching the original tile system
  private readonly tileContentWidth = 233
  private readonly isoStepX: number
  private readonly isoStepY: number
  private readonly CHUNK_SIZE = 16 // 16x16 tiles per chunk
  private readonly RENDER_DISTANCE = 2 // Load chunks within 2 chunks of viewport

  // Noise parameters
  private readonly noiseScale = 0.1
  private readonly waterThreshold = 0.2

  constructor(
    worldContainer: Container,
    grassTexture: Texture,
    waterTexture: Texture,
    tileOverlap: number,
    seed: string = 'procgentown'
  ) {
    this.grassTexture = grassTexture
    this.waterTexture = waterTexture

    // Create a single container for all tiles with sorting enabled
    this.tilesContainer = new Container()
    this.tilesContainer.sortableChildren = true
    worldContainer.addChild(this.tilesContainer)

    // Calculate isometric steps using tile overlap
    this.isoStepX = (this.tileContentWidth - tileOverlap) / 2
    this.isoStepY = (this.tileContentWidth - tileOverlap) / 4

    // Create noise generator with fixed seed for consistency
    const rand = new Rand(seed)
    this.noise2D = createNoise2D(() => rand.next())
  }

  /**
   * Generate a chunk at the given chunk coordinates
   */
  private generateChunk(chunkX: number, chunkY: number): Sprite[] {
    const sprites: Sprite[] = []

    // Generate tiles for this chunk
    const startCol = chunkX * this.CHUNK_SIZE
    const startRow = chunkY * this.CHUNK_SIZE
    const endCol = startCol + this.CHUNK_SIZE
    const endRow = startRow + this.CHUNK_SIZE

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        // Get noise value for this position
        const noiseValue = this.noise2D(col * this.noiseScale, row * this.noiseScale)
        const normalizedNoise = (noiseValue + 1) / 2

        // Determine tile type
        const isWater = normalizedNoise < this.waterThreshold
        const sprite = new Sprite(isWater ? this.waterTexture : this.grassTexture)

        // Position in isometric space
        sprite.x = (col - row) * this.isoStepX
        sprite.y = (col + row) * this.isoStepY

        // Set zIndex for global isometric depth sorting
        // Tiles with smaller col+row should render behind (lower zIndex)
        sprite.zIndex = col + row

        this.tilesContainer.addChild(sprite)
        sprites.push(sprite)
      }
    }

    return sprites
  }

  /**
   * Get chunk key string from chunk coordinates
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`
  }

  /**
   * Convert tile coordinates to chunk coordinates
   */
  private tileToChunk(col: number, row: number): { chunkX: number; chunkY: number } {
    return {
      chunkX: Math.floor(col / this.CHUNK_SIZE),
      chunkY: Math.floor(row / this.CHUNK_SIZE)
    }
  }

  /**
   * Convert world position (screen coordinates adjusted for zoom/pan) to tile coordinates
   */
  private worldPosToTile(worldX: number, worldY: number): { col: number; row: number } {
    // Inverse isometric transformation
    // x = (col - row) * isoStepX  =>  col - row = x / isoStepX
    // y = (col + row) * isoStepY  =>  col + row = y / isoStepY
    const sum = worldY / this.isoStepY
    const diff = worldX / this.isoStepX
    const col = (sum + diff) / 2
    const row = (sum - diff) / 2

    return {
      col: Math.floor(col),
      row: Math.floor(row)
    }
  }

  /**
   * Update visible chunks based on viewport
   */
  public updateVisibleChunks(
    viewportCenterX: number,
    viewportCenterY: number,
    viewportWidth: number,
    viewportHeight: number,
    scale: number
  ): void {
    // Convert viewport corners to world space
    const worldWidth = viewportWidth / scale
    const worldHeight = viewportHeight / scale

    // Get tile coordinates for viewport corners
    const topLeft = this.worldPosToTile(
      viewportCenterX - worldWidth / 2,
      viewportCenterY - worldHeight / 2
    )
    const bottomRight = this.worldPosToTile(
      viewportCenterX + worldWidth / 2,
      viewportCenterY + worldHeight / 2
    )

    // Convert to chunk coordinates with render distance buffer
    const minChunk = this.tileToChunk(topLeft.col, topLeft.row)
    const maxChunk = this.tileToChunk(bottomRight.col, bottomRight.row)

    const minChunkX = minChunk.chunkX - this.RENDER_DISTANCE
    const minChunkY = minChunk.chunkY - this.RENDER_DISTANCE
    const maxChunkX = maxChunk.chunkX + this.RENDER_DISTANCE
    const maxChunkY = maxChunk.chunkY + this.RENDER_DISTANCE

    // Track which chunks should be loaded
    const chunksToKeep = new Set<string>()

    // Load visible chunks
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const key = this.getChunkKey(chunkX, chunkY)
        chunksToKeep.add(key)

        // Generate chunk if it doesn't exist
        if (!this.chunks.has(key)) {
          const sprites = this.generateChunk(chunkX, chunkY)
          this.chunks.set(key, sprites)
        }
      }
    }

    // Unload chunks that are too far away
    for (const [key, sprites] of this.chunks.entries()) {
      if (!chunksToKeep.has(key)) {
        // Remove and destroy all sprites in this chunk
        for (const sprite of sprites) {
          this.tilesContainer.removeChild(sprite)
          sprite.destroy()
        }
        this.chunks.delete(key)
      }
    }
  }

  /**
   * Clean up all chunks
   */
  public destroy(): void {
    for (const [, sprites] of this.chunks.entries()) {
      for (const sprite of sprites) {
        sprite.destroy()
      }
    }
    this.chunks.clear()
    this.tilesContainer.destroy({ children: true })
  }
}
