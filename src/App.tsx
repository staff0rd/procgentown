import { useEffect, useRef, useState, useCallback } from 'react'
import { Assets } from 'pixi.js'
import { ChunkManager } from './ChunkManager'
import { GridManager } from './GridManager'
import { PixiAppManager } from './PixiAppManager'
import { InteractionManager } from './InteractionManager'
import { TILE_OVERLAP, GRID_OFFSET_X, GRID_OFFSET_Y } from './config'

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
    const world = pixiManager?.getWorld()

    if (!world || !chunkManager) return

    const viewportCenterX = -world.x / world.scale.x
    const viewportCenterY = -world.y / world.scale.y

    chunkManager.updateVisibleChunks(
      viewportCenterX,
      viewportCenterY,
      window.innerWidth,
      window.innerHeight,
      world.scale.x
    )
    chunkManager.updateDebugTextPositions()
  }, [])

  useEffect(() => {
    if (!divRef.current) return

    let isCancelled = false

    const initApp = async () => {
      if (pixiManagerRef.current) {
        console.log('App initialization already completed, skipping')
        return
      }

      try {
        const pixiManager = new PixiAppManager()
        await pixiManager.initialize(divRef.current!)

        if (isCancelled) {
          console.log('Initialization was cancelled, cleaning up')
          pixiManager.destroy()
          return
        }

        pixiManagerRef.current = pixiManager

        const app = pixiManager.getApp()
        const world = pixiManager.getWorld()

        if (!app || !world) return

        const interactionManager = new InteractionManager(app, world, {
          onViewportChange: updateChunks,
          onToggleSmoothing: () => {
            const chunkManager = chunkManagerRef.current
            if (chunkManager) {
              const terrainGen = chunkManager.getTerrainGenerator()
              terrainGen.toggleSmoothing()
              const smoothingState = terrainGen.isSmoothing() ? 'ON' : 'OFF'
              console.log(`Water tile smoothing: ${smoothingState}`)
              chunkManager.regenerateAllChunks()
            }
          },
          onToggleGrid: () => {
            const gridManager = gridManagerRef.current
            if (gridManager) {
              gridManager.toggle()
              const gridState = gridManager.isVisible() ? 'ON' : 'OFF'
              console.log(`Grid visibility: ${gridState}`)
            }
          },
          onToggleTiles: () => {
            const chunkManager = chunkManagerRef.current
            if (chunkManager) {
              const tilesContainer = chunkManager.getTilesContainer()
              tilesContainer.visible = !tilesContainer.visible
              const tilesState = tilesContainer.visible ? 'ON' : 'OFF'
              console.log(`Tile visibility: ${tilesState}`)
            }
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

        const [
          grassTexture,
          waterTexture,
          grassWaterN,
          grassWaterE,
          grassWaterS,
          grassWaterW,
          grassWaterConcaveN,
          grassWaterConcaveE,
          grassWaterConcaveS,
          grassWaterConcaveW
        ] = await Promise.all([
          Assets.load('/tiles/grass_center_E.png'),
          Assets.load('/tiles/water_center_E.png'),
          Assets.load('/tiles/grass_water_N.png'),
          Assets.load('/tiles/grass_water_E.png'),
          Assets.load('/tiles/grass_water_S.png'),
          Assets.load('/tiles/grass_water_W.png'),
          Assets.load('/tiles/grass_waterConcave_N.png'),
          Assets.load('/tiles/grass_waterConcave_E.png'),
          Assets.load('/tiles/grass_waterConcave_S.png'),
          Assets.load('/tiles/grass_waterConcave_W.png')
        ])

        const chunkManager = new ChunkManager(
          world,
          grassTexture,
          waterTexture,
          {
            grass_water_N: grassWaterN,
            grass_water_E: grassWaterE,
            grass_water_S: grassWaterS,
            grass_water_W: grassWaterW,
            grass_waterConcave_N: grassWaterConcaveN,
            grass_waterConcave_E: grassWaterConcaveE,
            grass_waterConcave_S: grassWaterConcaveS,
            grass_waterConcave_W: grassWaterConcaveW
          },
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

        console.log('Chunk-based infinite world created')
        console.log('World children count:', world.children.length)
      } catch (error) {
        console.error('Failed to load textures:', error)
      }
    }

    setupWorld()
  }, [hmrTrigger, updateChunks])

  return <div ref={divRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
}

export default App
