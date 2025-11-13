import { Graphics, Container, Text, Sprite } from 'pixi.js'
import { HitboxOverlayManager } from './HitboxOverlayManager'

export interface GridConfig {
  offsetX?: number
  offsetY?: number
  numLines?: number
  lineWidth?: number
  lineColor?: number
  visible?: boolean
  showCoordinates?: boolean
}

export interface CoordinateTextData {
  text: Text
  col: number
  row: number
  worldX: number
  worldY: number
}

export class GridManager {
  private graphics: Graphics
  private container: Container
  private worldContainer: Container
  private debugOverlay: Container | null
  private config: Required<GridConfig>
  private isoStepX: number
  private isoStepY: number
  private coordinateTexts: Map<string, CoordinateTextData> = new Map()
  private hitboxOverlayManager: HitboxOverlayManager

  constructor(
    container: Container,
    worldContainer: Container,
    debugOverlay: Container | null = null,
    overlaysContainer: Container,
    config: GridConfig = {}
  ) {
    this.container = container
    this.worldContainer = worldContainer
    this.debugOverlay = debugOverlay
    this.graphics = new Graphics()

    // Default configuration
    this.config = {
      offsetX: config.offsetX ?? 16,
      offsetY: config.offsetY ?? -40,
      numLines: config.numLines ?? 500,
      lineWidth: config.lineWidth ?? 1,
      lineColor: config.lineColor ?? 0x4a5568,
      visible: config.visible ?? true,
      showCoordinates: config.showCoordinates ?? true
    }

    // Match the exact tile spacing
    const tileContentWidth = 233
    const tileOverlap = 10
    this.isoStepX = (tileContentWidth - tileOverlap) / 2  // = 111.5
    this.isoStepY = (tileContentWidth - tileOverlap) / 4  // = 55.75

    this.graphics.visible = this.config.visible
    this.container.addChild(this.graphics)

    // Initialize hitbox overlay manager
    this.hitboxOverlayManager = new HitboxOverlayManager(
      overlaysContainer,
      this.isoStepX,
      this.isoStepY
    )
    this.hitboxOverlayManager.setGridVisible(this.config.visible)

    this.draw()
  }

  private draw(): void {
    this.graphics.clear()

    const { numLines, lineWidth, lineColor } = this.config

    // Draw grid lines at tile edges by offsetting by 0.5 in grid coordinates
    // This makes lines appear at the sides of tiles instead of through their centers
    for (let i = -numLines; i <= numLines; i++) {
      // Lines going in the "col" direction (slope = isoStepY / isoStepX = 0.5)
      // These are lines where row is constant, offset by 0.5 to align with tile edges
      const row = i + 0.5
      const startCol = -numLines
      const endCol = numLines

      const x1 = (startCol - row) * this.isoStepX
      const y1 = (startCol + row) * this.isoStepY
      const x2 = (endCol - row) * this.isoStepX
      const y2 = (endCol + row) * this.isoStepY

      this.graphics
        .moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({ width: lineWidth, color: lineColor })

      // Lines going in the "row" direction (slope = -isoStepY / isoStepX = -0.5)
      // These are lines where col is constant, offset by 0.5 to align with tile edges
      const col = i + 0.5
      const startRow = -numLines
      const endRow = numLines

      const x3 = (col - startRow) * this.isoStepX
      const y3 = (col + startRow) * this.isoStepY
      const x4 = (col - endRow) * this.isoStepX
      const y4 = (col + endRow) * this.isoStepY

      this.graphics
        .moveTo(x3, y3)
        .lineTo(x4, y4)
        .stroke({ width: lineWidth, color: lineColor })
    }
  }

  /**
   * Add tile interaction (hitbox overlay and optional coordinate text)
   */
  addTileInteraction(sprite: Sprite | Graphics, col: number, row: number, showCoordinate: boolean = false): void {
    // Always create hitbox overlay for interaction
    this.hitboxOverlayManager.createOverlay(sprite as Sprite, col, row)

    // Optionally add coordinate text for debug mode
    if (showCoordinate && this.debugOverlay) {
      this.addCoordinateText(col, row)
    }
  }

  /**
   * Add a coordinate text at the given tile position
   */
  addCoordinateText(col: number, row: number): void {
    if (!this.debugOverlay) return

    const key = `${col},${row}`
    if (this.coordinateTexts.has(key)) return

    // Calculate the position in pure world coordinates
    const worldX = (col - row) * this.isoStepX
    const worldY = (col + row) * this.isoStepY

    const coordText = new Text({
      text: `${col},${row}`,
      style: {
        fontSize: 12,
        fill: 0xffff00,
        stroke: { color: 0x000000, width: 2 },
        align: 'center'
      }
    })
    coordText.anchor.set(0.5, 0.5)
    coordText.visible = this.config.visible && this.config.showCoordinates

    // Place at pure world coordinates
    coordText.x = worldX
    coordText.y = worldY
    this.worldContainer.addChild(coordText)

    this.coordinateTexts.set(key, {
      text: coordText,
      col,
      row,
      worldX,
      worldY
    })
  }

  /**
   * Remove tile interaction (hitbox overlay and coordinate text)
   */
  removeTileInteraction(col: number, row: number): void {
    this.hitboxOverlayManager.removeOverlay(col, row)

    const key = `${col},${row}`
    const data = this.coordinateTexts.get(key)
    if (!data) return

    this.worldContainer.removeChild(data.text)
    data.text.destroy()
    this.coordinateTexts.delete(key)
  }

  /**
   * Update all coordinate text positions based on current world transform
   */
  updateCoordinatePositions(): void {
    // No-op: coordinate texts are now in world container, transform automatically applied
  }

  /**
   * Clear all coordinate texts
   */
  clearCoordinateTexts(): void {
    for (const [, data] of this.coordinateTexts.entries()) {
      this.worldContainer.removeChild(data.text)
      data.text.destroy()
    }
    this.coordinateTexts.clear()
    this.hitboxOverlayManager.clear()
  }

  /**
   * Show the grid and coordinates
   */
  show(): void {
    this.config.visible = true
    this.graphics.visible = true

    // Show all coordinate texts
    for (const [, data] of this.coordinateTexts.entries()) {
      data.text.visible = this.config.showCoordinates
    }

    this.hitboxOverlayManager.setGridVisible(true)
  }

  /**
   * Hide the grid and coordinates
   */
  hide(): void {
    this.config.visible = false
    this.graphics.visible = false

    // Hide all coordinate texts
    for (const [, data] of this.coordinateTexts.entries()) {
      data.text.visible = false
    }

    this.hitboxOverlayManager.setGridVisible(false)
  }

  /**
   * Toggle grid and coordinate visibility
   */
  toggle(): void {
    if (this.config.visible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Check if grid is visible
   */
  isVisible(): boolean {
    return this.config.visible
  }

  /**
   * Get the currently hovered tile coordinates
   */
  getCurrentHoveredTile(): string | null {
    return this.hitboxOverlayManager.getCurrentHoveredTile()
  }

  /**
   * Update grid configuration and redraw
   */
  updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (newConfig.visible !== undefined) {
      this.graphics.visible = newConfig.visible
    }

    this.draw()
  }

  /**
   * Update grid offset
   */
  setOffset(offsetX: number, offsetY: number): void {
    this.config.offsetX = offsetX
    this.config.offsetY = offsetY
    this.draw()
  }

  /**
   * Destroy the grid and clean up resources
   */
  destroy(): void {
    this.clearCoordinateTexts()
    this.graphics.destroy()
    this.container.removeChild(this.graphics)
  }
}
