import { Container, Sprite, Texture } from 'pixi.js'
import { createNoise2D } from 'simplex-noise'

export async function createTiledBackground(
  grassTexture: Texture,
  waterTexture: Texture,
  tileOverlap: number
) {
  const container = new Container()

  // Create noise generator with a random seed
  const noise2D = createNoise2D()

  // Actual tile content dimensions (from ImageMagick inspection)
  const tileContentWidth = 233

  // For isometric cube tiles, the diamond top face determines spacing
  // In 2:1 isometric projection, tiles overlap to form a continuous surface
  const isoStepX = (tileContentWidth - tileOverlap) / 2
  const isoStepY = (tileContentWidth - tileOverlap) / 4  // Use width/4 for flat appearance

  // Create a grid of tiles
  const numTiles = 50

  // Noise parameters
  const noiseScale = 0.1 // Lower = larger clumps, higher = smaller clumps
  const waterThreshold = 0.2 // Adjust this to control water coverage (~20% at 0.2)

  for (let row = -numTiles; row <= numTiles; row++) {
    for (let col = -numTiles; col <= numTiles; col++) {
      // Get noise value for this position (-1 to 1)
      const noiseValue = noise2D(col * noiseScale, row * noiseScale)

      // Normalize to 0-1 range
      const normalizedNoise = (noiseValue + 1) / 2

      // Determine if this tile should be water
      const isWater = normalizedNoise < waterThreshold

      const sprite = new Sprite(isWater ? waterTexture : grassTexture)

      // Position in isometric space
      sprite.x = (col - row) * isoStepX
      sprite.y = (col + row) * isoStepY

      container.addChild(sprite)
    }
  }

  return container
}
