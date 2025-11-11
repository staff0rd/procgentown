import { Container, Sprite, Texture, Polygon } from 'pixi.js'
import { TerrainGenerator } from './TerrainGenerator'
import type { TileVariant } from './TerrainGenerator'
import type { GridManager } from './GridManager'

export class ChunkManager {
  private chunks: Map<string, Sprite[]> = new Map()
  private chunkCoordinates: Map<string, Array<{ col: number; row: number }>> = new Map()
  private tilesContainer: Container
  private overlaysContainer: Container
  private tileTextures: Map<TileVariant, Texture> = new Map()
  private terrainGenerator: TerrainGenerator
  private debugMode: boolean = false
  private gridManager: GridManager | null = null
  private tilesVisible: boolean = true

  // Constants matching the original tile system
  private readonly tileContentWidth = 233
  private readonly isoStepX: number
  private readonly isoStepY: number
  private readonly CHUNK_SIZE = 16 // 16x16 tiles per chunk
  private readonly RENDER_DISTANCE = 2 // Load chunks within 2 chunks of viewport
  private readonly GRID_OFFSET_X = 16
  private readonly GRID_OFFSET_Y = -40

  constructor(
    worldContainer: Container,
    grassTexture: Texture,
    waterTexture: Texture,
    edgeTextures: {
      grass_water_N: Texture
      grass_water_E: Texture
      grass_water_S: Texture
      grass_water_W: Texture
      grass_waterConcave_N: Texture
      grass_waterConcave_E: Texture
      grass_waterConcave_S: Texture
      grass_waterConcave_W: Texture
    },
    tileOverlap: number,
    seed: string = 'procgentown',
    debugMode: boolean = false
  ) {
    this.debugMode = debugMode
    // Store basic textures
    this.tileTextures.set('grass', grassTexture)
    this.tileTextures.set('water', waterTexture)

    // Store all edge variant textures
    this.tileTextures.set('grass_water_N', edgeTextures.grass_water_N)
    this.tileTextures.set('grass_water_E', edgeTextures.grass_water_E)
    this.tileTextures.set('grass_water_S', edgeTextures.grass_water_S)
    this.tileTextures.set('grass_water_W', edgeTextures.grass_water_W)
    this.tileTextures.set('grass_waterConcave_N', edgeTextures.grass_waterConcave_N)
    this.tileTextures.set('grass_waterConcave_E', edgeTextures.grass_waterConcave_E)
    this.tileTextures.set('grass_waterConcave_S', edgeTextures.grass_waterConcave_S)
    this.tileTextures.set('grass_waterConcave_W', edgeTextures.grass_waterConcave_W)

    // Create a single container for all tiles with sorting enabled
    this.tilesContainer = new Container()
    this.tilesContainer.sortableChildren = true
    worldContainer.addChild(this.tilesContainer)
    console.log('Created tilesContainer, children count:', worldContainer.children.length)

    // Create a separate container for overlays (above tiles)
    this.overlaysContainer = new Container()
    this.overlaysContainer.sortableChildren = true
    worldContainer.addChild(this.overlaysContainer)
    console.log('Created overlaysContainer, children count:', worldContainer.children.length)

    // Calculate isometric steps using tile overlap
    this.isoStepX = (this.tileContentWidth - tileOverlap) / 2
    this.isoStepY = (this.tileContentWidth - tileOverlap) / 4

    // Create terrain generator with fixed seed for consistency
    this.terrainGenerator = new TerrainGenerator(seed)
  }

  /**
   * Set the grid manager for coordinate display
   */
  setGridManager(gridManager: GridManager): void {
    this.gridManager = gridManager
  }

  /**
   * Generate a chunk at the given chunk coordinates
   */
  private generateChunk(chunkX: number, chunkY: number): Sprite[] {
    const sprites: Sprite[] = []
    const coordinates: Array<{ col: number; row: number }> = []

    const { tileVariants } = this.terrainGenerator.generateChunkTerrain(chunkX, chunkY, this.CHUNK_SIZE)

    const startCol = chunkX * this.CHUNK_SIZE
    const startRow = chunkY * this.CHUNK_SIZE
    const endCol = startCol + this.CHUNK_SIZE
    const endRow = startRow + this.CHUNK_SIZE

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const key = `${col},${row}`
        const variant = tileVariants.get(key) || 'grass'
        const texture = this.tileTextures.get(variant)

        if (!texture) {
          console.warn(`Missing texture for variant: ${variant}`)
          continue
        }

        const sprite = new Sprite(texture)

        // Position in isometric space
        sprite.x = (col - row) * this.isoStepX
        sprite.y = (col + row) * this.isoStepY

        // Set zIndex for global isometric depth sorting
        // Tiles with smaller col+row should render behind (lower zIndex)
        sprite.zIndex = col + row

        // Set initial alpha based on tile visibility
        sprite.alpha = this.tilesVisible ? 1 : 0


        const hitCenterX = this.GRID_OFFSET_X
        const hitCenterY = this.GRID_OFFSET_Y - this.isoStepY + 2 * this.isoStepY

        sprite.hitArea = new Polygon([
          hitCenterX, hitCenterY - this.isoStepY,           // Top point
          hitCenterX + this.isoStepX, hitCenterY,            // Right point
          hitCenterX, hitCenterY + this.isoStepY,            // Bottom point
          hitCenterX - this.isoStepX, hitCenterY             // Left point
        ])

        this.tilesContainer.addChild(sprite)
        sprites.push(sprite)

        if (sprites.length === 1) {
          console.log(`First sprite added to chunk ${chunkX},${chunkY}`)
        }

        // Add tile interaction to GridManager
        if (this.gridManager) {
          this.gridManager.addTileInteraction(sprite, col, row, this.debugMode)
          coordinates.push({ col, row })
        }
      }
    }

    // Store coordinates for this chunk
    if (coordinates.length > 0) {
      const chunkKey = this.getChunkKey(chunkX, chunkY)
      this.chunkCoordinates.set(chunkKey, coordinates)
    }

    return sprites
  }

  /**
   * Update debug text positions based on current world transform
   */
  public updateDebugTextPositions(): void {
    if (!this.debugMode || !this.gridManager) return
    this.gridManager.updateCoordinatePositions()
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

        // Clean up tile interactions for this chunk
        if (this.chunkCoordinates.has(key)) {
          const coordinates = this.chunkCoordinates.get(key)!
          if (this.gridManager) {
            for (const { col, row } of coordinates) {
              this.gridManager.removeTileInteraction(col, row)
            }
          }
          this.chunkCoordinates.delete(key)
        }
      }
    }
  }

  /**
   * Get the terrain generator instance
   */
  public getTerrainGenerator(): TerrainGenerator {
    return this.terrainGenerator
  }

  /**
   * Regenerate all visible chunks (useful after settings change)
   */
  public regenerateAllChunks(): void {
    // Store current chunk keys
    const chunkKeys = Array.from(this.chunks.keys())

    // Destroy all existing chunks
    for (const [key, sprites] of this.chunks.entries()) {
      for (const sprite of sprites) {
        this.tilesContainer.removeChild(sprite)
        sprite.destroy()
      }

      // Clean up tile interactions
      if (this.chunkCoordinates.has(key)) {
        const coordinates = this.chunkCoordinates.get(key)!
        if (this.gridManager) {
          for (const { col, row } of coordinates) {
            this.gridManager.removeTileInteraction(col, row)
          }
        }
        this.chunkCoordinates.delete(key)
      }
    }
    this.chunks.clear()

    // Regenerate all chunks
    for (const key of chunkKeys) {
      const [chunkX, chunkY] = key.split(',').map(Number)
      const sprites = this.generateChunk(chunkX, chunkY)
      this.chunks.set(key, sprites)
    }
  }

  /**
   * Get the tiles container
   */
  public getTilesContainer(): Container {
    return this.tilesContainer
  }

  /**
   * Toggle tile visibility (uses alpha to keep sprites interactive)
   */
  public toggleTileVisibility(): void {
    this.tilesVisible = !this.tilesVisible
    const targetAlpha = this.tilesVisible ? 1 : 0

    for (const sprites of this.chunks.values()) {
      for (const sprite of sprites) {
        sprite.alpha = targetAlpha
      }
    }
  }

  /**
   * Check if tiles are visible
   */
  public areTilesVisible(): boolean {
    return this.tilesVisible
  }

  /**
   * Get the overlays container
   */
  public getOverlaysContainer(): Container {
    return this.overlaysContainer
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

    // Clean up all tile interactions
    for (const [key] of this.chunkCoordinates.entries()) {
      const coordinates = this.chunkCoordinates.get(key)!
      if (this.gridManager) {
        for (const { col, row } of coordinates) {
          this.gridManager.removeTileInteraction(col, row)
        }
      }
    }
    this.chunkCoordinates.clear()

    this.overlaysContainer.destroy({ children: true })
    this.tilesContainer.destroy({ children: true })
  }
}
