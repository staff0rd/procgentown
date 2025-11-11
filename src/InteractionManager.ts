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
  private keyPressHandler: ((e: KeyboardEvent) => void) | null = null

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

      // Notify viewport change
      if (this.callbacks.onViewportChange) {
        this.callbacks.onViewportChange()
      }
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

      // Notify viewport change
      if (this.callbacks.onViewportChange) {
        this.callbacks.onViewportChange()
      }
    })
  }

  private setupKeyboardControls(): void {
    this.keyPressHandler = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        if (this.callbacks.onToggleSmoothing) {
          this.callbacks.onToggleSmoothing()
        }
      } else if (e.key === 'g' || e.key === 'G') {
        if (this.callbacks.onToggleGrid) {
          this.callbacks.onToggleGrid()
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (this.callbacks.onToggleTiles) {
          this.callbacks.onToggleTiles()
        }
      }
    }

    window.addEventListener('keypress', this.keyPressHandler)
  }

  destroy(): void {
    if (this.keyPressHandler) {
      window.removeEventListener('keypress', this.keyPressHandler)
      this.keyPressHandler = null
    }

    // Remove all stage listeners
    this.app.stage.removeAllListeners()
  }
}
