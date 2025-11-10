import { Graphics } from 'pixi.js'

export function createIsometricGrid(offsetX: number = 0, offsetY: number = 0) {
  const graphics = new Graphics()

  // Match the exact tile spacing from createTiledBackground.ts
  const tileContentWidth = 233
  const tileOverlap = 10
  const isoStepX = (tileContentWidth - tileOverlap) / 2  // = 111.5
  const isoStepY = (tileContentWidth - tileOverlap) / 4  // = 55.75

  const numLines = 50

  // Draw grid lines using the same isometric projection as the tiles
  // Tiles use: x = (col - row) * isoStepX, y = (col + row) * isoStepY
  for (let i = -numLines; i <= numLines; i++) {
    // Lines going in the "col" direction (slope = isoStepY / isoStepX = 0.5)
    // These are lines where row is constant
    const row = i
    const startCol = -numLines
    const endCol = numLines

    const x1 = (startCol - row) * isoStepX
    const y1 = (startCol + row) * isoStepY
    const x2 = (endCol - row) * isoStepX
    const y2 = (endCol + row) * isoStepY

    graphics
      .moveTo(x1 + offsetX, y1 + offsetY)
      .lineTo(x2 + offsetX, y2 + offsetY)
      .stroke({ width: 1, color: 0x4a5568 })

    // Lines going in the "row" direction (slope = -isoStepY / isoStepX = -0.5)
    // These are lines where col is constant
    const col = i
    const startRow = -numLines
    const endRow = numLines

    const x3 = (col - startRow) * isoStepX
    const y3 = (col + startRow) * isoStepY
    const x4 = (col - endRow) * isoStepX
    const y4 = (col + endRow) * isoStepY

    graphics
      .moveTo(x3 + offsetX, y3 + offsetY)
      .lineTo(x4 + offsetX, y4 + offsetY)
      .stroke({ width: 1, color: 0x4a5568 })
  }

  return graphics
}
