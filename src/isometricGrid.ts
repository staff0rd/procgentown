import { Graphics } from 'pixi.js'

export function createIsometricGrid() {
  const graphics = new Graphics()
  const gridSize = 100
  const numLines = 50

  // Isometric angles: 26.565 degrees (atan(0.5))
  const isoAngle = Math.atan(0.5)
  const cosAngle = Math.cos(isoAngle)
  const sinAngle = Math.sin(isoAngle)

  // Draw isometric grid lines (rotated 90 degrees - swap x and y)
  for (let i = -numLines; i <= numLines; i++) {
    const offset = i * gridSize
    const extent = numLines * gridSize

    // Right-going diagonal lines (positive slope)
    const x1 = offset * cosAngle - (-extent) * sinAngle
    const y1 = offset * sinAngle + (-extent) * cosAngle
    const x2 = offset * cosAngle - extent * sinAngle
    const y2 = offset * sinAngle + extent * cosAngle

    graphics
      .moveTo(y1, x1)
      .lineTo(y2, x2)
      .stroke({ width: 1, color: 0x4a5568 })

    // Left-going diagonal lines (negative slope)
    const x3 = offset * cosAngle + (-extent) * sinAngle
    const y3 = -offset * sinAngle + (-extent) * cosAngle
    const x4 = offset * cosAngle + extent * sinAngle
    const y4 = -offset * sinAngle + extent * cosAngle

    graphics
      .moveTo(y3, x3)
      .lineTo(y4, x4)
      .stroke({ width: 1, color: 0x4a5568 })
  }

  return graphics
}
