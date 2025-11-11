Typescript (vite + react + pixijs) application.

After making typescript changes build with `npm run build` and fix any errors.
After making changes you can run tests via `npm run test:run`.

Do the above in sub-agents so they run in parallel.

- If adding code to a file will considerably increase its length, consider splitting it into multiple files.
- Prefer self-documenting code over comments
- Never run `npm run dev` - the output runs in the browser which you won't see

## Isometric coordinate system

In this isometric tile system:
- Tiles are positioned at: `(col - row) * isoStepX, (col + row) * isoStepY`
- The visual tile diamond is offset within the sprite texture by `(GRID_OFFSET_X, GRID_OFFSET_Y - isoStepY)`
- Moving by one tile in isometric "row" or "col" direction moves diagonally in screen space
- A shift of "half a tile" in isometric space = a full `isoStepY` shift in screen Y direction (NOT isoStepY/2)
- The hitArea polygon and overlay graphics must be centered at `(GRID_OFFSET_X, GRID_OFFSET_Y - isoStepY)` relative to the sprite position to align with the visual tile

