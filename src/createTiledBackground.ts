import { Container, Sprite, Texture } from 'pixi.js'

export async function createTiledBackground(texture: Texture, tileOverlap: number) {
  const container = new Container()

  // Actual tile content dimensions (from ImageMagick inspection)
  const tileContentWidth = 233
  const tileContentHeight = 221

  // For isometric cube tiles, the diamond top face determines spacing
  // In 2:1 isometric projection, tiles overlap to form a continuous surface
  const isoStepX = (tileContentWidth - tileOverlap) / 2
  const isoStepY = (tileContentWidth - tileOverlap) / 4  // Use width/4 for flat appearance

  // Create a grid of tiles
  const numTiles = 50

  for (let row = -numTiles; row <= numTiles; row++) {
    for (let col = -numTiles; col <= numTiles; col++) {
      const sprite = new Sprite(texture)

      // Position in isometric space
      sprite.x = (col - row) * isoStepX
      sprite.y = (col + row) * isoStepY

      container.addChild(sprite)
    }
  }

  return container
}
