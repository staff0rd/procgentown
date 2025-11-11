import { Application, Container } from 'pixi.js'

/**
 * Manages the PixiJS Application lifecycle, including initialization,
 * container setup, resize handling, and cleanup.
 */
export class PixiAppManager {
  private app: Application | null = null
  private world: Container | null = null
  private debugOverlay: Container | null = null
  private resizeHandler: (() => void) | null = null

  async initialize(parentElement: HTMLDivElement): Promise<void> {
    const app = new Application()

    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2c3e50
    })

    this.app = app

    // Clear the div and add canvas
    parentElement.innerHTML = ''
    parentElement.appendChild(app.canvas)
    console.log('Canvas added, dimensions:', app.canvas.width, 'x', app.canvas.height)
    console.log('Canvas style:', app.canvas.style.cssText)

    // Create world container (center of screen, affected by pan/zoom)
    const world = new Container()
    world.x = window.innerWidth / 2
    world.y = window.innerHeight / 2
    this.world = world
    app.stage.addChild(world)
    console.log('World container added to stage, stage children:', app.stage.children.length)

    // Create debug overlay container (separate from world, not affected by transforms)
    const debugOverlay = new Container()
    this.debugOverlay = debugOverlay
    app.stage.addChild(debugOverlay)

    console.log('PixiJS app initialized - World position:', world.x, world.y)
  }

  setupResize(onResize?: () => void): void {
    this.resizeHandler = () => {
      if (this.app && this.app.renderer) {
        this.app.renderer.resize(window.innerWidth, window.innerHeight)
        if (onResize) {
          onResize()
        }
      }
    }

    window.addEventListener('resize', this.resizeHandler)
  }

  getApp(): Application | null {
    return this.app
  }

  getWorld(): Container | null {
    return this.world
  }

  getDebugOverlay(): Container | null {
    return this.debugOverlay
  }

  destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }

    if (this.app && this.app.renderer) {
      this.app.destroy(true)
    }

    this.app = null
    this.world = null
    this.debugOverlay = null
  }
}
