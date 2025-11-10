import { useEffect, useRef } from 'react'
import { Application, Graphics, Container } from 'pixi.js'

function App() {
  const divRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (!divRef.current) return

    let isInitialized = false
    let world: Container
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

        // Only set the ref after successful initialization
        appRef.current = app
        isInitialized = true

        // Clear the div and add canvas
        if (divRef.current) {
          divRef.current.innerHTML = ''
          divRef.current.appendChild(app.canvas)
        }

        // Create world container
        world = new Container()
        world.x = window.innerWidth / 2
        world.y = window.innerHeight / 2
        app.stage.addChild(world)

        // Create grid with modern Graphics API
        const graphics = new Graphics()
        const gridSize = 100
        const numLines = 50

        console.log('Drawing grid with', numLines, 'lines at', gridSize, 'spacing')
        console.log('World position:', world.x, world.y)

        // Draw each line individually
        for (let i = -numLines; i <= numLines; i++) {
          // Vertical lines
          graphics.moveTo(i * gridSize, -numLines * gridSize)
          graphics.lineTo(i * gridSize, numLines * gridSize)
          graphics.stroke({ width: 1, color: 0x34495e })

          // Horizontal lines
          graphics.moveTo(-numLines * gridSize, i * gridSize)
          graphics.lineTo(numLines * gridSize, i * gridSize)
          graphics.stroke({ width: 1, color: 0x34495e })
        }

        world.addChild(graphics)
        console.log('Graphics added to world. Graphics bounds:', graphics.getBounds())
        console.log('World children count:', world.children.length)

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
      })
    }
  }, [])

  return <div ref={divRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default App
