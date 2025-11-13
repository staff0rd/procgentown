import { Application, Container } from 'pixi.js'
import { CameraManager } from './CameraManager'

/**
 * Manages the PixiJS Application lifecycle, including initialization,
 * container setup, resize handling, and cleanup.
 */
export class PixiAppManager {
  private app: Application | null = null
  private world: Container | null = null
  private debugOverlay: Container | null = null
  private cameraManager: CameraManager | null = null
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

    // Create world container
    const world = new Container()
    this.world = world
    app.stage.addChild(world)

    // Initialize camera manager with proper pivot/position transform
    this.cameraManager = new CameraManager(world, window.innerWidth, window.innerHeight)

    // Create debug overlay container (separate from world, not affected by transforms)
    const debugOverlay = new Container()
    this.debugOverlay = debugOverlay
    app.stage.addChild(debugOverlay)
  }

  setupResize(onResize?: () => void): void {
    this.resizeHandler = () => {
      if (this.app && this.app.renderer && this.cameraManager) {
        this.app.renderer.resize(window.innerWidth, window.innerHeight)
        this.cameraManager.updateScreenSize(window.innerWidth, window.innerHeight)
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

  getCameraManager(): CameraManager | null {
    return this.cameraManager
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
    this.cameraManager = null
  }
}
