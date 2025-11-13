import { useEffect, useRef, useState, useCallback } from 'react'
import { ChunkManager } from './ChunkManager'
import { GridManager } from './GridManager'
import { PixiAppManager } from './PixiAppManager'
import { InteractionManager } from './InteractionManager'
import { TILE_OVERLAP, GRID_OFFSET_X, GRID_OFFSET_Y } from './config'
import { loadTerrainTextures } from './AssetLoader'

function App() {
  const divRef = useRef<HTMLDivElement>(null)
  const pixiManagerRef = useRef<PixiAppManager | null>(null)
  const interactionManagerRef = useRef<InteractionManager | null>(null)
  const chunkManagerRef = useRef<ChunkManager | null>(null)
  const gridManagerRef = useRef<GridManager | null>(null)
  const [hmrTrigger, setHmrTrigger] = useState(0)

  const updateChunks = useCallback(() => {
    const pixiManager = pixiManagerRef.current
    const chunkManager = chunkManagerRef.current
    const cameraManager = pixiManager?.getCameraManager()

    if (!cameraManager || !chunkManager) return

    const viewportCenterX = cameraManager.getCameraX()
    const viewportCenterY = cameraManager.getCameraY()
    const zoom = cameraManager.getZoom()

    chunkManager.updateVisibleChunks(
      viewportCenterX,
      viewportCenterY,
      window.innerWidth,
      window.innerHeight,
      zoom
    )
    chunkManager.updateDebugTextPositions()
  }, [])

  useEffect(() => {
    if (!divRef.current) return

    let isCancelled = false

    const initApp = async () => {
      if (pixiManagerRef.current) {
        return
      }

      try {
        const pixiManager = new PixiAppManager()
        await pixiManager.initialize(divRef.current!)

        if (isCancelled) {
          pixiManager.destroy()
          return
        }

        pixiManagerRef.current = pixiManager

        const app = pixiManager.getApp()
        const cameraManager = pixiManager.getCameraManager()

        if (!app || !cameraManager) return

        const interactionManager = new InteractionManager(app, cameraManager, {
          onViewportChange: updateChunks,
          onToggleSmoothing: () => {
            const chunkManager = chunkManagerRef.current
            if (chunkManager) {
              const terrainGen = chunkManager.getTerrainGenerator()
              terrainGen.toggleSmoothing()
              chunkManager.regenerateAllChunks()
            }
          },
          onToggleGrid: () => {
            const gridManager = gridManagerRef.current
            if (gridManager) {
              gridManager.toggle()
            }
          },
          onToggleTiles: () => {
            const chunkManager = chunkManagerRef.current
            if (chunkManager) {
              chunkManager.toggleTileVisibility()
            }
          },
          getCurrentTile: () => {
            const gridManager = gridManagerRef.current
            return gridManager ? gridManager.getCurrentHoveredTile() : null
          }
        })

        interactionManager.setupInteractions()
        interactionManagerRef.current = interactionManager

        pixiManager.setupResize(updateChunks)

        setHmrTrigger(prev => prev + 1)
      } catch (error) {
        console.error('Failed to initialize PixiJS app:', error)
      }
    }

    initApp()

    return () => {
      isCancelled = true

      if (gridManagerRef.current) {
        gridManagerRef.current.destroy()
        gridManagerRef.current = null
      }

      if (chunkManagerRef.current) {
        chunkManagerRef.current.destroy()
        chunkManagerRef.current = null
      }

      if (interactionManagerRef.current) {
        interactionManagerRef.current.destroy()
        interactionManagerRef.current = null
      }

      if (pixiManagerRef.current) {
        pixiManagerRef.current.destroy()
        pixiManagerRef.current = null
      }
    }
  }, [updateChunks])

  useEffect(() => {
    const pixiManager = pixiManagerRef.current
    const world = pixiManager?.getWorld()
    const debugOverlay = pixiManager?.getDebugOverlay()

    if (!world || !debugOverlay) return

    if (world.children.length > 0) {
      world.removeChildren()
    }

    const setupWorld = async () => {
      try {
        if (gridManagerRef.current) {
          gridManagerRef.current.destroy()
          gridManagerRef.current = null
        }

        if (chunkManagerRef.current) {
          chunkManagerRef.current.destroy()
          chunkManagerRef.current = null
        }

        const { grassTexture, waterTexture, transitionTextures } = await loadTerrainTextures()

        const chunkManager = new ChunkManager(
          world,
          grassTexture,
          waterTexture,
          transitionTextures,
          TILE_OVERLAP,
          'procgentown',
          true
        )
        chunkManagerRef.current = chunkManager

        const gridManager = new GridManager(
          world,
          world,
          debugOverlay,
          chunkManager.getOverlaysContainer(),
          {
            offsetX: GRID_OFFSET_X,
            offsetY: GRID_OFFSET_Y,
            visible: true,
            showCoordinates: true
          }
        )
        gridManagerRef.current = gridManager

        chunkManager.setGridManager(gridManager)

        updateChunks()
      } catch (error) {
        console.error('Failed to load textures:', error)
      }
    }

    setupWorld()
  }, [hmrTrigger, updateChunks])

  return <div ref={divRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default App
