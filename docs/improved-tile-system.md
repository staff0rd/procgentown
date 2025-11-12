# PixiJS Tilemap Implementation Guide

## Critical Concept: Coordinate Spaces

Understanding the difference between coordinate spaces is essential for tilemap rendering in PixiJS.

### Three Types of Coordinates

1. **Local Coordinates**: Position relative to an object's parent
   - When you set `sprite.x = 100`, that's 100 pixels from the parent's origin
   - When you call `position.set(x, y)`, you're setting local coordinates

2. **World/Global Coordinates**: Position relative to the stage root
   - The absolute position in the game world
   - Use `toGlobal()` to convert from local to global coordinates

3. **Screen Coordinates**: Position relative to the canvas element
   - Where things appear on the actual screen/viewport
   - Usually matches world coordinates unless you're scaling or transforming the canvas

## How Tilemaps Work in PixiJS

### Key Principle: Separate Grid Layout from Viewport Transform

**DO THIS:**
- Position tiles in a consistent **world-space grid**
- Use the tilemap container's `position` and `pivot` to handle viewport/camera movement
- Keep tile grid coordinates independent of what's visible on screen

**DON'T DO THIS:**
- Try to position tiles based on screen coordinates
- Recalculate tile positions every frame based on camera
- Mix up tile grid coordinates with viewport offsets

## Working Example Pattern

```javascript
// Setup
const tileSize = 64;
const tilemap = new PIXI.tilemap.CompositeTilemap();
app.stage.addChild(tilemap);

// Tile positions are in WORLD COORDINATES (grid positions)
function drawTiles(centerX, centerY, viewportWidth, viewportHeight) {
  tilemap.clear();
  
  // Calculate which tiles are visible (in tile coordinates)
  const tilesWide = Math.ceil(viewportWidth / tileSize) + 2;
  const tilesHigh = Math.ceil(viewportHeight / tileSize) + 2;
  
  const startTileX = Math.floor(centerX / tileSize) - Math.floor(tilesWide / 2);
  const startTileY = Math.floor(centerY / tileSize) - Math.floor(tilesHigh / 2);
  
  // Add tiles in WORLD-SPACE grid coordinates
  for (let i = 0; i < tilesWide; i++) {
    for (let j = 0; j < tilesHigh; j++) {
      const tileX = startTileX + i;
      const tileY = startTileY + j;
      
      // worldX and worldY are the tile's position in world space
      const worldX = tileX * tileSize;
      const worldY = tileY * tileSize;
      
      tilemap.tile('grass.png', worldX, worldY);
    }
  }
}

// Camera/viewport transformation
function updateCamera(cameraX, cameraY, viewportWidth, viewportHeight) {
  // The pivot is the point in world space that appears at the tilemap's position
  tilemap.pivot.set(cameraX, cameraY);
  
  // The position is where that pivot point appears on screen
  tilemap.position.set(viewportWidth / 2, viewportHeight / 2);
}

// Game loop
let cameraX = 0;
let cameraY = 0;

function gameLoop() {
  // Move camera (in world coordinates)
  cameraY += 2;
  
  // Update tilemap transform
  updateCamera(cameraX, cameraY, app.screen.width, app.screen.height);
  
  // Optionally redraw tiles if camera moved far enough
  // (to add/remove tiles at edges)
}
```

## Key Relationships

```
Tile Grid Position (e.g., tile [5, 3])
    ↓ multiply by tileSize
World Coordinate (e.g., 320px, 192px) ← tiles are placed here
    ↓ transform by tilemap.pivot and tilemap.position
Screen Coordinate (where it appears in viewport)
```

## Common Pattern: Scrolling Tilemap

From the working tutorial example:

```javascript
// Player position in world coordinates
const player = { x: 0, y: 0 };

// Where to draw the player sprite on screen (constant)
const playerOffsetX = resolutionX / 2 - 24;
const playerOffsetY = resolutionY / 2 - 24;

function drawTiles() {
  const numberOfTiles = Math.floor(resolutionX / tileSize) + 10;
  
  // Tiles are positioned in world coordinates
  for (let i = -numberOfTiles; i <= numberOfTiles; i++) {
    for (let j = -numberOfTiles; j <= numberOfTiles; j++) {
      groundTiles.addFrame('ground.png', i * tileSize, j * tileSize);
    }
  }
  
  // Calculate offset to prevent "jumping" when redrawing
  const groundOffsetX = player.x % tileSize;
  const groundOffsetY = player.y % tileSize;
  
  // Position the tilemap so player's world position appears at player sprite
  groundTiles.position.set(
    playerOffsetX + player.x - groundOffsetX,
    playerOffsetY + player.y - groundOffsetY
  );
}

function gameLoop() {
  // Move player in world space
  player.y -= 4;
  
  // Move the world around the player
  groundTiles.pivot.set(player.x, player.y);
  
  requestAnimationFrame(gameLoop);
}
```

## Essential Rules

1. **Tiles are ALWAYS positioned in world coordinates**
   ```javascript
   // Good: World coordinate = tile index * tile size
   tilemap.tile('grass.png', tileX * tileSize, tileY * tileSize);
   
   // Bad: Don't adjust for camera/viewport here
   tilemap.tile('grass.png', tileX * tileSize - cameraX, tileY * tileSize - cameraY);
   ```

2. **Use container transforms for camera/viewport**
   ```javascript
   // The tilemap container handles the world-to-screen transform
   tilemap.pivot.set(worldX, worldY);      // What world point is at the position
   tilemap.position.set(screenX, screenY);  // Where that point appears on screen
   ```

3. **Separate concerns**
   - Tile layout: Works in world space grid (tile indices * tile size)
   - Camera/viewport: Handled by container transforms (position/pivot)
   - Culling: Calculate which tiles are visible, but still place them at world coords

## Reference URLs

- **PixiJS Scene Graph Guide**: https://pixijs.io/guides/basics/scene-graph.html
  - Essential reading on coordinate systems and transforms
  
- **Tilemap Tutorial**: https://github.com/Alan01252/pixi-tilemap-tutorial
  - Complete working example with scrolling
  
- **@pixi/tilemap API**: https://api.pixijs.io/@pixi/tilemap.html
  - Official API documentation

## Debugging Tips

If your tilemap isn't rendering correctly:

1. **Check tile positions**: Are they in world coordinates (multiples of tileSize)?
2. **Check container position**: Is `tilemap.position` set correctly for your viewport?
3. **Check pivot**: Is `tilemap.pivot` set to the camera/center point in world space?
4. **Console log**: Print out a few tile positions and the container transform
   ```javascript
   console.log('Tile at:', tileX * tileSize, tileY * tileSize);
   console.log('Tilemap pivot:', tilemap.pivot.x, tilemap.pivot.y);
   console.log('Tilemap position:', tilemap.position.x, tilemap.position.y);
   ```

## Complete Minimal Example

```javascript
import * as PIXI from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';

const app = new PIXI.Application({ width: 800, height: 600 });
document.body.appendChild(app.view);

// Load texture
await PIXI.Assets.load('grass.png');

const tileSize = 64;
const tilemap = new CompositeTilemap();
app.stage.addChild(tilemap);

let cameraX = 0;
let cameraY = 0;

function render() {
  tilemap.clear();
  
  // Determine visible tile range
  const tilesWide = Math.ceil(app.screen.width / tileSize) + 2;
  const tilesHigh = Math.ceil(app.screen.height / tileSize) + 2;
  
  const centerTileX = Math.floor(cameraX / tileSize);
  const centerTileY = Math.floor(cameraY / tileSize);
  
  // Draw tiles in world coordinates
  for (let i = -Math.floor(tilesWide/2); i < Math.ceil(tilesWide/2); i++) {
    for (let j = -Math.floor(tilesHigh/2); j < Math.ceil(tilesHigh/2); j++) {
      const tileX = centerTileX + i;
      const tileY = centerTileY + j;
      
      tilemap.tile('grass.png', tileX * tileSize, tileY * tileSize);
    }
  }
  
  // Transform tilemap for camera
  tilemap.pivot.set(cameraX, cameraY);
  tilemap.position.set(app.screen.width / 2, app.screen.height / 2);
}

// Game loop
app.ticker.add(() => {
  cameraY += 1; // Move camera down
  render();
});

render();
```

Remember: **World space for layout, container transforms for viewport!**