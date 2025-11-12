import { Application } from 'pixi.js'
import { CameraManager } from './CameraManager'
import { ZOOM_INTENSITY } from './config'

export interface InteractionCallbacks {
  onViewportChange?: () => void
  onToggleSmoothing?: () => void
  onToggleGrid?: () => void
  onToggleTiles?: () => void
  getCurrentTile?: () => string | null
}

/**
 * Manages user interactions: pan/drag, zoom, and keyboard shortcuts.
 */
export class InteractionManager {
  private app: Application
  private cameraManager: CameraManager
  private callbacks: InteractionCallbacks
  private isDragging = false
  private lastPointerPosition = { x: 0, y: 0 }
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null
  private keysPressed = new Set<string>()
  private viewportChangeThrottleId: number | null = null

  constructor(app: Application, cameraManager: CameraManager, callbacks: InteractionCallbacks = {}) {
    this.app = app
    this.cameraManager = cameraManager
    this.callbacks = callbacks
  }

  /**
   * Sets up all interaction handlers (pan, zoom, keyboard).
   */
  setupInteractions(): void {
    this.setupPanControls()
    this.setupZoomControls()
    this.setupKeyboardControls()
  }

  /**
   * Throttled viewport change notification
   */
  private notifyViewportChange(): void {
    if (this.viewportChangeThrottleId !== null) {
      return
    }

    this.viewportChangeThrottleId = window.requestAnimationFrame(() => {
      this.viewportChangeThrottleId = null
      if (this.callbacks.onViewportChange) {
        this.callbacks.onViewportChange()
      }
    })
  }

  private setupPanControls(): void {
    const stage = this.app.stage

    stage.eventMode = 'static'
    stage.hitArea = this.app.screen

    stage.on('pointerdown', (e) => {
      this.isDragging = true
      this.lastPointerPosition = { x: e.global.x, y: e.global.y }
    })

    stage.on('pointermove', (e) => {
      if (!this.isDragging) return

      const deltaX = e.global.x - this.lastPointerPosition.x
      const deltaY = e.global.y - this.lastPointerPosition.y

      this.cameraManager.pan(deltaX, deltaY)

      this.lastPointerPosition = { x: e.global.x, y: e.global.y }

      // Notify viewport change (throttled)
      this.notifyViewportChange()
    })

    stage.on('pointerup', () => {
      this.isDragging = false
    })

    stage.on('pointerupoutside', () => {
      this.isDragging = false
    })
  }

  private setupZoomControls(): void {
    this.app.stage.on('wheel', (e) => {
      const event = e as unknown as WheelEvent
      event.preventDefault()

      // Calculate zoom direction and amount
      const direction = event.deltaY > 0 ? -1 : 1
      const zoomFactor = 1 + direction * ZOOM_INTENSITY

      // Calculate new zoom level
      const currentZoom = this.cameraManager.getZoom()
      const newZoom = currentZoom * zoomFactor

      // Apply zoom centered on mouse position
      this.cameraManager.zoom(newZoom, event.clientX, event.clientY)

      // Notify viewport change (throttled)
      this.notifyViewportChange()
    })
  }

  private setupKeyboardControls(): void {
    this.keyDownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Only trigger if this key wasn't already pressed
      if (this.keysPressed.has(key)) {
        return
      }

      this.keysPressed.add(key)

      if (key === 's') {
        if (this.callbacks.onToggleSmoothing) {
          this.callbacks.onToggleSmoothing()
        }
      } else if (key === 'g') {
        if (this.callbacks.onToggleGrid) {
          this.callbacks.onToggleGrid()
        }
      } else if (key === 't') {
        if (this.callbacks.onToggleTiles) {
          this.callbacks.onToggleTiles()
        }
      } else if (key === 'd') {
        if (this.callbacks.getCurrentTile) {
          const currentTile = this.callbacks.getCurrentTile()
          if (currentTile) {
            const [a, b] = currentTile.split(',').map(Number)
            const c = a + 3
            const d = b + 3
            console.log(`(${a},${b}) -> (${c},${d})`)
          }
        }
      }
    }

    this.keyUpHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      this.keysPressed.delete(key)
    }

    window.addEventListener('keydown', this.keyDownHandler)
    window.addEventListener('keyup', this.keyUpHandler)
  }

  destroy(): void {
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler)
      this.keyDownHandler = null
    }

    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler)
      this.keyUpHandler = null
    }

    this.keysPressed.clear()

    // Cancel pending viewport change notification
    if (this.viewportChangeThrottleId !== null) {
      window.cancelAnimationFrame(this.viewportChangeThrottleId)
      this.viewportChangeThrottleId = null
    }

    // Remove all stage listeners
    this.app.stage.removeAllListeners()
  }
}
