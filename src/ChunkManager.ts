import { Container, Texture, Polygon, Graphics } from 'pixi.js'
import { CompositeTilemap } from '@pixi/tilemap'
import { TerrainGenerator } from './TerrainGenerator'
import type { TileVariant } from './TerrainGenerator'
import type { GridManager } from './GridManager'
import { RENDER_MINIMAL_TILES } from './config'

export class ChunkManager {
  private chunks: Map<string, { hitAreas: Graphics[] }> = new Map()
  private chunkCoordinates: Map<string, Array<{ col: number; row: number }>> = new Map()
  private tilemap: CompositeTilemap
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

    // Create CompositeTilemap for efficient tile rendering
    this.tilemap = new CompositeTilemap()
    worldContainer.addChild(this.tilemap)
    console.log('Created CompositeTilemap, children count:', worldContainer.children.length)

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
   * Check if a tile should be rendered based on RENDER_MINIMAL_TILES config
   */
  private shouldRenderTile(col: number, row: number): boolean {
    if (!RENDER_MINIMAL_TILES) return true
    return (col === 0 || col === 1) && (row === 0 || row === 1)
  }

  /**
   * Generate a chunk at the given chunk coordinates
   */
  private generateChunk(chunkX: number, chunkY: number): { hitAreas: Graphics[] } {
    const hitAreas: Graphics[] = []
    const coordinates: Array<{ col: number; row: number }> = []

    const { tileVariants } = this.terrainGenerator.generateChunkTerrain(chunkX, chunkY, this.CHUNK_SIZE)

    const startCol = chunkX * this.CHUNK_SIZE
    const startRow = chunkY * this.CHUNK_SIZE
    const endCol = startCol + this.CHUNK_SIZE
    const endRow = startRow + this.CHUNK_SIZE

    console.log(`🔷 Generating chunk (${chunkX}, ${chunkY}): tiles (${startCol},${startRow}) to (${endCol-1},${endRow-1})`)

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (!this.shouldRenderTile(col, row)) continue

        const key = `${col},${row}`
        const variant = tileVariants.get(key) || 'grass'
        const texture = this.tileTextures.get(variant)

        if (!texture) {
          console.warn(`Missing texture for variant: ${variant}`)
          continue
        }

        // Position in world coordinates (isometric space) - pure grid coordinates
        const worldX = (col - row) * this.isoStepX
        const worldY = (col + row) * this.isoStepY

        // Debug: log tiles around the problem area
        if (col >= -5 && col <= -1 && row >= -51 && row <= -47) {
          console.log(`🔴 Tile (${col},${row}): worldY=${worldY.toFixed(2)} [calc: (${col} + ${row}) * ${this.isoStepY} = ${col + row} * ${this.isoStepY}]`)
        }

        // Center the texture on the tile position (no offsets here)
        const tileX = worldX - texture.width / 2
        const tileY = worldY - texture.height / 2

        // Add tile to tilemap at pure world coordinates
        this.tilemap.tile(texture, tileX, tileY)

        // Add red debug box around the actual texture placement
        const debugBox = new Graphics()
        debugBox.x = worldX
        debugBox.y = worldY
        debugBox.rect(
          -texture.width / 2,
          -texture.height / 2,
          texture.width,
          texture.height
        )
        debugBox.stroke({ width: 2, color: 0xff0000 })
        //this.overlaysContainer.addChild(debugBox)

        // Create hit area for interaction
        const hitArea = new Graphics()
        hitArea.alpha = 1  // Make visible for debugging
        hitArea.eventMode = 'static'
        hitArea.x = worldX
        hitArea.y = worldY

        // Hit polygon centered at origin (will be offset by hitArea.x/y)
        const hitPolygon = new Polygon([
          0, -this.isoStepY,
          this.isoStepX, 0,
          0, this.isoStepY,
          -this.isoStepX, 0
        ])

        hitArea.hitArea = hitPolygon

        // Draw the hitbox polygon visibly for debugging
        hitArea.poly(hitPolygon.points)
        //hitArea.fill({ color: 0x00ff00, alpha: 0.3 })
        //hitArea.stroke({ width: 2, color: 0x00ff00 })

        this.overlaysContainer.addChild(hitArea)
        hitAreas.push(hitArea)

        if (hitAreas.length === 1) {
          console.log(`First tile added to chunk ${chunkX},${chunkY}`)
        }

        // Add tile interaction to GridManager
        if (this.gridManager) {
          this.gridManager.addTileInteraction(hitArea, col, row, this.debugMode)
          coordinates.push({ col, row })
        }
      }
    }

    // Store coordinates for this chunk
    if (coordinates.length > 0) {
      const chunkKey = this.getChunkKey(chunkX, chunkY)
      this.chunkCoordinates.set(chunkKey, coordinates)
    }

    return { hitAreas }
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
    let needsRebuild = false

    // Load visible chunks
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const key = this.getChunkKey(chunkX, chunkY)
        chunksToKeep.add(key)

        // Generate chunk if it doesn't exist
        if (!this.chunks.has(key)) {
          const chunkData = this.generateChunk(chunkX, chunkY)
          this.chunks.set(key, chunkData)
          needsRebuild = true
        }
      }
    }

    // Unload chunks that are too far away
    for (const [key, chunkData] of this.chunks.entries()) {
      if (!chunksToKeep.has(key)) {
        // Remove and destroy all hit areas in this chunk
        for (const hitArea of chunkData.hitAreas) {
          this.overlaysContainer.removeChild(hitArea)
          hitArea.destroy()
        }
        this.chunks.delete(key)
        needsRebuild = true

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

    // Rebuild tilemap if chunks changed
    if (needsRebuild) {
      this.rebuildTilemap()
    }
  }

  /**
   * Rebuild the entire tilemap from scratch
   */
  private rebuildTilemap(): void {
    this.tilemap.clear()

    for (const [key] of this.chunks.entries()) {
      const [chunkX, chunkY] = key.split(',').map(Number)
      const { tileVariants } = this.terrainGenerator.generateChunkTerrain(chunkX, chunkY, this.CHUNK_SIZE)

      const startCol = chunkX * this.CHUNK_SIZE
      const startRow = chunkY * this.CHUNK_SIZE
      const endCol = startCol + this.CHUNK_SIZE
      const endRow = startRow + this.CHUNK_SIZE

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          if (!this.shouldRenderTile(col, row)) continue

          const tileKey = `${col},${row}`
          const variant = tileVariants.get(tileKey) || 'grass'
          const texture = this.tileTextures.get(variant)

          if (!texture) continue

          // Position in pure world coordinates
          const worldX = (col - row) * this.isoStepX
          const worldY = (col + row) * this.isoStepY

          // Center the texture on the tile position
          const tileX = worldX - texture.width / 2
          const tileY = worldY - texture.height / 2

          this.tilemap.tile(texture, tileX, tileY)
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
    for (const [key, chunkData] of this.chunks.entries()) {
      for (const hitArea of chunkData.hitAreas) {
        this.overlaysContainer.removeChild(hitArea)
        hitArea.destroy()
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
      const chunkData = this.generateChunk(chunkX, chunkY)
      this.chunks.set(key, chunkData)
    }

    // Rebuild entire tilemap
    this.rebuildTilemap()
  }

  /**
   * Get the tilemap container
   */
  public getTilesContainer(): CompositeTilemap {
    return this.tilemap
  }

  /**
   * Toggle tile visibility
   */
  public toggleTileVisibility(): void {
    this.tilesVisible = !this.tilesVisible
    this.tilemap.alpha = this.tilesVisible ? 1 : 0
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
    for (const [, chunkData] of this.chunks.entries()) {
      for (const hitArea of chunkData.hitAreas) {
        hitArea.destroy()
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
    this.tilemap.destroy({ children: true })
  }
}
