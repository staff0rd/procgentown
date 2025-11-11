import { Graphics, Container, Sprite } from 'pixi.js'

export class HitboxOverlayManager {
  private hitboxOverlays: Map<string, Graphics> = new Map()
  private spriteMap: Map<string, Sprite> = new Map()
  private currentHoveredTile: string | null = null
  private container: Container
  private isoStepX: number
  private isoStepY: number
  private gridOffsetX: number
  private gridOffsetY: number
  private isGridVisible: boolean = false
  private lastLoggedTile: string | null = null

  constructor(
    container: Container,
    isoStepX: number,
    isoStepY: number,
    gridOffsetX: number,
    gridOffsetY: number
  ) {
    this.container = container
    this.isoStepX = isoStepX
    this.isoStepY = isoStepY
    this.gridOffsetX = gridOffsetX
    this.gridOffsetY = gridOffsetY
  }

  createOverlay(sprite: Sprite, col: number, row: number): void {
    const tileKey = `${col},${row}`

    const hitboxGraphics = new Graphics()

    // Shift the center to match the visual tile diamond
    const centerX = this.gridOffsetX
    const centerY = this.gridOffsetY - this.isoStepY + 2 * this.isoStepY

    hitboxGraphics.poly([
      centerX, centerY - this.isoStepY,
      centerX + this.isoStepX, centerY,
      centerX, centerY + this.isoStepY,
      centerX - this.isoStepX, centerY
    ])
    hitboxGraphics.fill({ color: 0xff0000, alpha: 0.3 })
    hitboxGraphics.visible = false

    hitboxGraphics.x = sprite.x
    hitboxGraphics.y = sprite.y
    hitboxGraphics.zIndex = sprite.zIndex + 0.5
    this.container.addChild(hitboxGraphics)

    this.hitboxOverlays.set(tileKey, hitboxGraphics)
    this.spriteMap.set(tileKey, sprite)

    sprite.eventMode = 'static'
    sprite.cursor = 'pointer'

    sprite.on('pointerover', () => {
      this.showOverlay(tileKey)
    })

    sprite.on('pointerout', () => {
      this.hideOverlay(tileKey)
    })
  }

  private showOverlay(tileKey: string): void {
    // Hide previous overlay
    if (this.currentHoveredTile && this.currentHoveredTile !== tileKey) {
      const prevOverlay = this.hitboxOverlays.get(this.currentHoveredTile)
      if (prevOverlay) {
        prevOverlay.visible = false
      }
    }

    // Show new overlay
    if (this.isGridVisible) {
      const overlay = this.hitboxOverlays.get(tileKey)
      if (overlay) {
        overlay.visible = true
      }
    }

    // Log only when tile changes
    if (this.lastLoggedTile !== tileKey) {
      console.log(`Tile coordinate: ${tileKey}`)
      this.lastLoggedTile = tileKey
    }

    this.currentHoveredTile = tileKey
  }

  private hideOverlay(tileKey: string): void {
    const overlay = this.hitboxOverlays.get(tileKey)
    if (overlay) {
      overlay.visible = false
    }
    if (this.currentHoveredTile === tileKey) {
      this.currentHoveredTile = null
      this.lastLoggedTile = null
    }
  }

  removeOverlay(col: number, row: number): void {
    const tileKey = `${col},${row}`
    const overlay = this.hitboxOverlays.get(tileKey)
    if (overlay) {
      this.container.removeChild(overlay)
      overlay.destroy()
      this.hitboxOverlays.delete(tileKey)
    }
    this.spriteMap.delete(tileKey)
  }

  setGridVisible(visible: boolean): void {
    this.isGridVisible = visible
    if (!visible && this.currentHoveredTile) {
      const overlay = this.hitboxOverlays.get(this.currentHoveredTile)
      if (overlay) {
        overlay.visible = false
      }
    }
  }

  getCurrentHoveredTile(): string | null {
    return this.currentHoveredTile
  }

  clear(): void {
    for (const [, overlay] of this.hitboxOverlays.entries()) {
      overlay.destroy()
    }
    this.hitboxOverlays.clear()
    this.spriteMap.clear()
    this.currentHoveredTile = null
  }
}
