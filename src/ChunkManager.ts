import { CompositeTilemap } from "@pixi/tilemap";
import { Container, Graphics, Polygon, type Texture } from "pixi.js";
import { RENDER_AXES_ONLY, RENDER_MINIMAL_TILES } from "./config";
import type { GridManager } from "./GridManager";
import type { MapData, MapTileType } from "./MapData";
import type { TileVariant } from "./TerrainGenerator";
import { TerrainGenerator } from "./TerrainGenerator";

export class ChunkManager {
	private chunks: Map<string, { hitAreas: Graphics[]; mapData: MapData }> =
		new Map();
	private chunkCoordinates: Map<string, Array<{ col: number; row: number }>> =
		new Map();
	private tilemap: CompositeTilemap;
	private overlaysContainer: Container;
	private tileTextures: Map<TileVariant, Texture> = new Map();
	private terrainGenerator: TerrainGenerator;
	private debugMode: boolean = false;
	private gridManager: GridManager | null = null;
	private tilesVisible: boolean = true;

	// Constants matching the original tile system
	private readonly tileContentWidth = 233;
	private readonly isoStepX: number;
	private readonly isoStepY: number;
	private readonly CHUNK_SIZE = 16; // 16x16 tiles per chunk
	private readonly RENDER_DISTANCE = 2; // Load chunks within 2 chunks of viewport

	constructor(
		worldContainer: Container,
		grassTexture: Texture,
		waterTexture: Texture,
		edgeTextures: {
			grass_water_N: Texture;
			grass_water_E: Texture;
			grass_water_S: Texture;
			grass_water_W: Texture;
			grass_waterConcave_N: Texture;
			grass_waterConcave_E: Texture;
			grass_waterConcave_S: Texture;
			grass_waterConcave_W: Texture;
		},
		tileOverlap: number,
		seed: string = "procgentown",
		debugMode: boolean = false,
	) {
		this.debugMode = debugMode;
		// Store basic textures
		this.tileTextures.set("grass", grassTexture);
		this.tileTextures.set("water", waterTexture);

		// Store all edge variant textures
		this.tileTextures.set("grass_water_N", edgeTextures.grass_water_N);
		this.tileTextures.set("grass_water_E", edgeTextures.grass_water_E);
		this.tileTextures.set("grass_water_S", edgeTextures.grass_water_S);
		this.tileTextures.set("grass_water_W", edgeTextures.grass_water_W);
		this.tileTextures.set(
			"grass_waterConcave_N",
			edgeTextures.grass_waterConcave_N,
		);
		this.tileTextures.set(
			"grass_waterConcave_E",
			edgeTextures.grass_waterConcave_E,
		);
		this.tileTextures.set(
			"grass_waterConcave_S",
			edgeTextures.grass_waterConcave_S,
		);
		this.tileTextures.set(
			"grass_waterConcave_W",
			edgeTextures.grass_waterConcave_W,
		);

		// Create CompositeTilemap for efficient tile rendering
		this.tilemap = new CompositeTilemap();
		worldContainer.addChild(this.tilemap);

		// Create a separate container for overlays (above tiles)
		this.overlaysContainer = new Container();
		this.overlaysContainer.sortableChildren = true;
		worldContainer.addChild(this.overlaysContainer);

		// Calculate isometric steps using tile overlap
		this.isoStepX = (this.tileContentWidth - tileOverlap) / 2;
		this.isoStepY = (this.tileContentWidth - tileOverlap) / 4;

		// Create terrain generator with fixed seed for consistency
		this.terrainGenerator = new TerrainGenerator(seed);
	}

	/**
	 * Set the grid manager for coordinate display
	 */
	setGridManager(gridManager: GridManager): void {
		this.gridManager = gridManager;
	}

	/**
	 * Check if a tile should be rendered based on RENDER_MINIMAL_TILES and RENDER_AXES_ONLY configs
	 */
	private shouldRenderTile(col: number, row: number): boolean {
		if (RENDER_AXES_ONLY) return col === 0 || row === 0;
		if (!RENDER_MINIMAL_TILES) return true;
		return (col === 0 || col === 1) && (row === 0 || row === 1);
	}

	/**
	 * Generate a chunk at the given chunk coordinates
	 */
	private generateChunk(
		chunkX: number,
		chunkY: number,
	): { hitAreas: Graphics[]; mapData: MapData } {
		const hitAreas: Graphics[] = [];
		const coordinates: Array<{ col: number; row: number }> = [];

		const { mapData, tileVariants } =
			this.terrainGenerator.generateChunkTerrain(
				chunkX,
				chunkY,
				this.CHUNK_SIZE,
			);

		const startCol = chunkX * this.CHUNK_SIZE;
		const startRow = chunkY * this.CHUNK_SIZE;
		const endCol = startCol + this.CHUNK_SIZE;
		const endRow = startRow + this.CHUNK_SIZE;

		// Collect tiles first for proper z-ordering
		const tilesToRender: Array<{ col: number; row: number; depth: number }> =
			[];
		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				if (!this.shouldRenderTile(col, row)) continue;
				// Calculate isometric depth (col + row) - tiles with lower depth are further back
				const depth = col + row;
				tilesToRender.push({ col, row, depth });
			}
		}

		// Sort tiles by depth (back to front) for proper z-ordering
		tilesToRender.sort((a, b) => a.depth - b.depth);

		for (const { col, row } of tilesToRender) {
			const key = `${col},${row}`;
			const variant = tileVariants.get(key) || "grass";
			const texture = this.tileTextures.get(variant);

			if (!texture) {
				console.warn(`Missing texture for variant: ${variant}`);
				continue;
			}

			// Position in world coordinates (isometric space) - pure grid coordinates
			const worldX = (col - row) * this.isoStepX;
			const worldY = (col + row) * this.isoStepY;

			// Center the texture on the tile position (no offsets here)
			const tileX = worldX - texture.width / 2;
			const tileY = worldY - texture.height / 2;

			// Add tile to tilemap at pure world coordinates
			this.tilemap.tile(texture, tileX, tileY);

			// Add red debug box around the actual texture placement
			const debugBox = new Graphics();
			debugBox.x = worldX;
			debugBox.y = worldY;
			debugBox.rect(
				-texture.width / 2,
				-texture.height / 2,
				texture.width,
				texture.height,
			);
			debugBox.stroke({ width: 2, color: 0xff0000 });
			//this.overlaysContainer.addChild(debugBox)

			// Create hit area for interaction
			const hitArea = new Graphics();
			hitArea.alpha = 1; // Make visible for debugging
			hitArea.eventMode = "static";
			hitArea.cursor = "pointer";
			hitArea.x = worldX;
			hitArea.y = worldY;

			// Hit polygon centered at origin (will be offset by hitArea.x/y)
			const hitPolygon = new Polygon([
				0,
				-this.isoStepY,
				this.isoStepX,
				0,
				0,
				this.isoStepY,
				-this.isoStepX,
				0,
			]);

			hitArea.hitArea = hitPolygon;

			// Draw the hitbox polygon visibly for debugging
			hitArea.poly(hitPolygon.points);
			//hitArea.fill({ color: 0x00ff00, alpha: 0.3 })
			//hitArea.stroke({ width: 2, color: 0x00ff00 })

			// Attach click handler directly to hitArea
			hitArea.on("click", () => {
				this.handleTileClick(col, row);
			});

			this.overlaysContainer.addChild(hitArea);
			hitAreas.push(hitArea);

			// Add tile interaction to GridManager (for hover overlay)
			if (this.gridManager) {
				this.gridManager.addTileInteraction(hitArea, col, row, this.debugMode);
				coordinates.push({ col, row });
			}
		}

		// Store coordinates for this chunk
		if (coordinates.length > 0) {
			const chunkKey = this.getChunkKey(chunkX, chunkY);
			this.chunkCoordinates.set(chunkKey, coordinates);
		}

		return { hitAreas, mapData };
	}

	/**
	 * Get tile type at a specific position (queries across chunks)
	 */
	private getTileType(col: number, row: number): MapTileType | undefined {
		const { chunkX, chunkY } = this.tileToChunk(col, row);
		const chunkKey = this.getChunkKey(chunkX, chunkY);
		const chunk = this.chunks.get(chunkKey);
		if (!chunk) return undefined;
		return chunk.mapData.get(col, row);
	}

	/**
	 * Handle tile click - display 3x3 grid of base tile types
	 */
	private handleTileClick(col: number, row: number): void {
		const lines: string[] = [];

		// Add clicked tile coordinate
		lines.push(`Clicked tile: (${col}, ${row})`);
		lines.push(""); // Empty line for spacing

		// Calculate max width needed for row labels
		const minRow = row - 1;
		const maxRow = row + 1;
		const rowLabelWidth = Math.max(
			String(minRow).length,
			String(maxRow).length,
		);

		// Build header with column numbers
		const colLabels = [col - 1, col, col + 1].map((c) => String(c).padStart(3));
		const header = `${" ".repeat(rowLabelWidth + 1)}${colLabels.join(" ")}`;
		lines.push(header);

		// Build each row
		for (let r = minRow; r <= maxRow; r++) {
			const rowLabel = String(r).padStart(rowLabelWidth);
			let line = `${rowLabel} `;
			for (let c = col - 1; c <= col + 1; c++) {
				const tileType = this.getTileType(c, r);
				const char =
					tileType === "water" ? "W" : tileType === "grass" ? "G" : "?";
				line += `${char.padStart(3)} `;
			}
			lines.push(line);
		}

		console.log(`\n${lines.join("\n")}`);
	}

	/**
	 * Update debug text positions based on current world transform
	 */
	public updateDebugTextPositions(): void {
		if (!this.debugMode || !this.gridManager) return;
		this.gridManager.updateCoordinatePositions();
	}

	/**
	 * Get chunk key string from chunk coordinates
	 */
	private getChunkKey(chunkX: number, chunkY: number): string {
		return `${chunkX},${chunkY}`;
	}

	/**
	 * Convert tile coordinates to chunk coordinates
	 */
	private tileToChunk(
		col: number,
		row: number,
	): { chunkX: number; chunkY: number } {
		return {
			chunkX: Math.floor(col / this.CHUNK_SIZE),
			chunkY: Math.floor(row / this.CHUNK_SIZE),
		};
	}

	/**
	 * Convert world position (screen coordinates adjusted for zoom/pan) to tile coordinates
	 */
	private worldPosToTile(
		worldX: number,
		worldY: number,
	): { col: number; row: number } {
		// Inverse isometric transformation
		// x = (col - row) * isoStepX  =>  col - row = x / isoStepX
		// y = (col + row) * isoStepY  =>  col + row = y / isoStepY
		const sum = worldY / this.isoStepY;
		const diff = worldX / this.isoStepX;
		const col = (sum + diff) / 2;
		const row = (sum - diff) / 2;

		return {
			col: Math.floor(col),
			row: Math.floor(row),
		};
	}

	/**
	 * Update visible chunks based on viewport
	 */
	public updateVisibleChunks(
		viewportCenterX: number,
		viewportCenterY: number,
		viewportWidth: number,
		viewportHeight: number,
		scale: number,
	): void {
		// Convert viewport corners to world space
		const worldWidth = viewportWidth / scale;
		const worldHeight = viewportHeight / scale;

		// Get tile coordinates for viewport corners
		const topLeft = this.worldPosToTile(
			viewportCenterX - worldWidth / 2,
			viewportCenterY - worldHeight / 2,
		);
		const bottomRight = this.worldPosToTile(
			viewportCenterX + worldWidth / 2,
			viewportCenterY + worldHeight / 2,
		);

		// Convert to chunk coordinates with render distance buffer
		const minChunk = this.tileToChunk(topLeft.col, topLeft.row);
		const maxChunk = this.tileToChunk(bottomRight.col, bottomRight.row);

		const minChunkX = minChunk.chunkX - this.RENDER_DISTANCE;
		const minChunkY = minChunk.chunkY - this.RENDER_DISTANCE;
		const maxChunkX = maxChunk.chunkX + this.RENDER_DISTANCE;
		const maxChunkY = maxChunk.chunkY + this.RENDER_DISTANCE;

		// Track which chunks should be loaded
		const chunksToKeep = new Set<string>();
		let needsRebuild = false;

		// Load visible chunks
		for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
			for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
				const key = this.getChunkKey(chunkX, chunkY);
				chunksToKeep.add(key);

				// Generate chunk if it doesn't exist
				if (!this.chunks.has(key)) {
					const chunkData = this.generateChunk(chunkX, chunkY);
					this.chunks.set(key, chunkData);
					needsRebuild = true;
				}
			}
		}

		// Unload chunks that are too far away
		for (const [key, chunkData] of this.chunks.entries()) {
			if (!chunksToKeep.has(key)) {
				// Remove and destroy all hit areas in this chunk
				for (const hitArea of chunkData.hitAreas) {
					this.overlaysContainer.removeChild(hitArea);
					hitArea.destroy();
				}
				this.chunks.delete(key);
				needsRebuild = true;

				// Clean up tile interactions for this chunk
				if (this.chunkCoordinates.has(key)) {
					const coordinates = this.chunkCoordinates.get(key);
					if (coordinates && this.gridManager) {
						for (const { col, row } of coordinates) {
							this.gridManager.removeTileInteraction(col, row);
						}
					}
					this.chunkCoordinates.delete(key);
				}
			}
		}

		// Rebuild tilemap if chunks changed
		if (needsRebuild) {
			this.rebuildTilemap();
		}
	}

	/**
	 * Rebuild the entire tilemap from scratch
	 */
	private rebuildTilemap(): void {
		this.tilemap.clear();

		// Collect all tiles from all chunks for proper z-ordering
		const allTilesToRender: Array<{
			col: number;
			row: number;
			depth: number;
			variant: TileVariant;
			chunkX: number;
			chunkY: number;
		}> = [];

		for (const [key] of this.chunks.entries()) {
			const [chunkX, chunkY] = key.split(",").map(Number);
			const { tileVariants } = this.terrainGenerator.generateChunkTerrain(
				chunkX,
				chunkY,
				this.CHUNK_SIZE,
			);

			const startCol = chunkX * this.CHUNK_SIZE;
			const startRow = chunkY * this.CHUNK_SIZE;
			const endCol = startCol + this.CHUNK_SIZE;
			const endRow = startRow + this.CHUNK_SIZE;

			for (let row = startRow; row < endRow; row++) {
				for (let col = startCol; col < endCol; col++) {
					if (!this.shouldRenderTile(col, row)) continue;

					const tileKey = `${col},${row}`;
					const variant = (tileVariants.get(tileKey) || "grass") as TileVariant;
					const depth = col + row;

					allTilesToRender.push({ col, row, depth, variant, chunkX, chunkY });
				}
			}
		}

		// Sort all tiles by depth (back to front) for proper z-ordering
		allTilesToRender.sort((a, b) => a.depth - b.depth);

		// Render tiles in sorted order
		for (const { col, row, variant } of allTilesToRender) {
			const texture = this.tileTextures.get(variant);
			if (!texture) continue;

			// Position in pure world coordinates
			const worldX = (col - row) * this.isoStepX;
			const worldY = (col + row) * this.isoStepY;

			// Center the texture on the tile position
			const tileX = worldX - texture.width / 2;
			const tileY = worldY - texture.height / 2;

			this.tilemap.tile(texture, tileX, tileY);
		}
	}

	/**
	 * Get the terrain generator instance
	 */
	public getTerrainGenerator(): TerrainGenerator {
		return this.terrainGenerator;
	}

	/**
	 * Regenerate all visible chunks (useful after settings change)
	 */
	public regenerateAllChunks(): void {
		// Store current chunk keys
		const chunkKeys = Array.from(this.chunks.keys());

		// Destroy all existing chunks
		for (const [key, chunkData] of this.chunks.entries()) {
			for (const hitArea of chunkData.hitAreas) {
				this.overlaysContainer.removeChild(hitArea);
				hitArea.destroy();
			}

			// Clean up tile interactions
			if (this.chunkCoordinates.has(key)) {
				const coordinates = this.chunkCoordinates.get(key);
				if (coordinates && this.gridManager) {
					for (const { col, row } of coordinates) {
						this.gridManager.removeTileInteraction(col, row);
					}
				}
				this.chunkCoordinates.delete(key);
			}
		}
		this.chunks.clear();

		// Regenerate all chunks
		for (const key of chunkKeys) {
			const [chunkX, chunkY] = key.split(",").map(Number);
			const chunkData = this.generateChunk(chunkX, chunkY);
			this.chunks.set(key, chunkData);
		}

		// Rebuild entire tilemap
		this.rebuildTilemap();
	}

	/**
	 * Get the tilemap container
	 */
	public getTilesContainer(): CompositeTilemap {
		return this.tilemap;
	}

	/**
	 * Toggle tile visibility
	 */
	public toggleTileVisibility(): void {
		this.tilesVisible = !this.tilesVisible;
		this.tilemap.alpha = this.tilesVisible ? 1 : 0;
	}

	/**
	 * Check if tiles are visible
	 */
	public areTilesVisible(): boolean {
		return this.tilesVisible;
	}

	/**
	 * Get the overlays container
	 */
	public getOverlaysContainer(): Container {
		return this.overlaysContainer;
	}

	/**
	 * Clean up all chunks
	 */
	public destroy(): void {
		for (const [, chunkData] of this.chunks.entries()) {
			for (const hitArea of chunkData.hitAreas) {
				hitArea.destroy();
			}
		}
		this.chunks.clear();

		// Clean up all tile interactions
		for (const [key] of this.chunkCoordinates.entries()) {
			const coordinates = this.chunkCoordinates.get(key);
			if (coordinates && this.gridManager) {
				for (const { col, row } of coordinates) {
					this.gridManager.removeTileInteraction(col, row);
				}
			}
		}
		this.chunkCoordinates.clear();

		this.overlaysContainer.destroy({ children: true });
		this.tilemap.destroy({ children: true });
	}
}
