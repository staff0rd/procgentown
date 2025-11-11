import { Graphics, Container, Sprite } from 'pixi.js'

export class HitboxOverlayManager {
  private hitboxOverlays: Map<string, Graphics> = new Map()
  private currentHoveredTile: string | null = null
  private container: Container
  private isoStepX: number
  private isoStepY: number
  private gridOffsetX: number
  private gridOffsetY: number
  private isGridVisible: boolean = false

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

    const tileKey = `${col},${row}`
    this.hitboxOverlays.set(tileKey, hitboxGraphics)

    sprite.eventMode = 'static'
    sprite.cursor = 'pointer'

    sprite.on('pointerover', () => {
      if (this.currentHoveredTile && this.currentHoveredTile !== tileKey) {
        const prevOverlay = this.hitboxOverlays.get(this.currentHoveredTile)
        if (prevOverlay) {
          prevOverlay.visible = false
        }
      }

      if (this.isGridVisible) {
        hitboxGraphics.visible = true
      }
      this.currentHoveredTile = tileKey
    })

    sprite.on('pointerout', () => {
      hitboxGraphics.visible = false
      if (this.currentHoveredTile === tileKey) {
        this.currentHoveredTile = null
      }
    })
  }

  removeOverlay(col: number, row: number): void {
    const tileKey = `${col},${row}`
    const overlay = this.hitboxOverlays.get(tileKey)
    if (overlay) {
      this.container.removeChild(overlay)
      overlay.destroy()
      this.hitboxOverlays.delete(tileKey)
    }
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

  clear(): void {
    for (const [, overlay] of this.hitboxOverlays.entries()) {
      overlay.destroy()
    }
    this.hitboxOverlays.clear()
    this.currentHoveredTile = null
  }
}
