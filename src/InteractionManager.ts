import { Application, Container } from 'pixi.js'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_INTENSITY } from './config'

export interface InteractionCallbacks {
  onViewportChange?: () => void
  onToggleSmoothing?: () => void
  onToggleGrid?: () => void
  onToggleTiles?: () => void
}

/**
 * Manages user interactions: pan/drag, zoom, and keyboard shortcuts.
 */
export class InteractionManager {
  private app: Application
  private world: Container
  private callbacks: InteractionCallbacks
  private isDragging = false
  private lastPointerPosition = { x: 0, y: 0 }
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null
  private keysPressed = new Set<string>()
  private viewportChangeThrottleId: number | null = null

  constructor(app: Application, world: Container, callbacks: InteractionCallbacks = {}) {
    this.app = app
    this.world = world
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

      this.world.x += deltaX
      this.world.y += deltaY

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
      const direction = event.deltaY > 0 ? -1 : 1 // Scroll down = zoom out, scroll up = zoom in
      const zoomFactor = 1 + direction * ZOOM_INTENSITY

      // Calculate new zoom level
      const currentZoom = this.world.scale.x
      let newZoom = currentZoom * zoomFactor

      // Clamp zoom to min/max values
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))

      // If zoom hasn't changed (hit limits), return early
      if (newZoom === currentZoom) return

      // Get mouse position in world coordinates before zoom
      const mouseX = event.clientX
      const mouseY = event.clientY
      const worldPosBeforeX = (mouseX - this.world.x) / this.world.scale.x
      const worldPosBeforeY = (mouseY - this.world.y) / this.world.scale.y

      // Apply zoom
      this.world.scale.set(newZoom, newZoom)

      // Get mouse position in world coordinates after zoom
      const worldPosAfterX = (mouseX - this.world.x) / this.world.scale.x
      const worldPosAfterY = (mouseY - this.world.y) / this.world.scale.y

      // Adjust world position to keep zoom centered on mouse
      this.world.x += (worldPosAfterX - worldPosBeforeX) * this.world.scale.x
      this.world.y += (worldPosAfterY - worldPosBeforeY) * this.world.scale.y

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
