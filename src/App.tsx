import { useEffect, useRef, useState } from 'react'
import { Application, Container } from 'pixi.js'
import { createIsometricGrid } from './isometricGrid'

function App() {
  const divRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const worldRef = useRef<Container | null>(null)
  const [hmrTrigger, setHmrTrigger] = useState(0)

  // Initialize PixiJS app once
  useEffect(() => {
    if (!divRef.current) return

    let isDragging = false
    let lastPointerPosition = { x: 0, y: 0 }

    const initApp = async () => {
      try {
        const app = new Application()

        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x2c3e50
        })

        appRef.current = app

        // Clear the div and add canvas
        if (divRef.current) {
          divRef.current.innerHTML = ''
          divRef.current.appendChild(app.canvas)
        }

        // Create world container
        const world = new Container()
        world.x = window.innerWidth / 2
        world.y = window.innerHeight / 2
        worldRef.current = world
        app.stage.addChild(world)

        console.log('World position:', world.x, world.y)

        // Setup interaction
        app.stage.eventMode = 'static'
        app.stage.hitArea = app.screen

        app.stage.on('pointerdown', (e) => {
          isDragging = true
          lastPointerPosition = { x: e.global.x, y: e.global.y }
        })

        app.stage.on('pointermove', (e) => {
          if (!isDragging) return

          const deltaX = e.global.x - lastPointerPosition.x
          const deltaY = e.global.y - lastPointerPosition.y

          world.x += deltaX
          world.y += deltaY

          lastPointerPosition = { x: e.global.x, y: e.global.y }
        })

        app.stage.on('pointerup', () => {
          isDragging = false
        })

        app.stage.on('pointerupoutside', () => {
          isDragging = false
        })

        const handleResize = () => {
          if (app && app.renderer) {
            app.renderer.resize(window.innerWidth, window.innerHeight)
          }
        }

        window.addEventListener('resize', handleResize)

        // Trigger grid creation after init
        setHmrTrigger(prev => prev + 1)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (app && app.renderer) {
            app.destroy(true)
          }
        }
      } catch (error) {
        console.error('Failed to initialize PixiJS app:', error)
        return () => {} // Return empty cleanup function on error
      }
    }

    const cleanup = initApp()

    return () => {
      cleanup.then(fn => {
        if (fn) fn()
        appRef.current = null
        worldRef.current = null
      })
    }
  }, [])

  // Separate effect for grid that re-runs on HMR
  useEffect(() => {
    const world = worldRef.current
    if (!world) return

    // Remove old grid if it exists
    if (world.children.length > 0) {
      world.removeChildren()
    }

    // Create and add new grid
    const grid = createIsometricGrid()
    world.addChild(grid)
    console.log('Grid updated. Graphics bounds:', grid.getBounds())
    console.log('World children count:', world.children.length)
  }, [hmrTrigger, createIsometricGrid])

  return <div ref={divRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default App
