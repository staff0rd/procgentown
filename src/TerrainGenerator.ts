import Rand from "rand-seed";
import type { NoiseFunction2D } from "simplex-noise";
import { createNoise2D } from "simplex-noise";
import { MapData } from "./MapData";

export type TileVariant =
	| "water"
	| "grass"
	| "grass_water_N"
	| "grass_water_E"
	| "grass_water_S"
	| "grass_water_W"
	| "grass_waterConcave_N"
	| "grass_waterConcave_E"
	| "grass_waterConcave_S"
	| "grass_waterConcave_W";

export interface ChunkTerrainResult {
	mapData: MapData;
	tileVariants: Map<string, TileVariant>;
}

/**
 * Handles procedural terrain generation with cluster filtering
 */
export class TerrainGenerator {
	private noise2D: NoiseFunction2D;

	// Noise parameters
	private readonly noiseScale = 0.1;
	private readonly waterThreshold = 0.2;
	private readonly minWaterClusterSize = 4; // Minimum 2x2 cluster

	// Smoothing toggle
	private smoothingEnabled: boolean = true;

	constructor(seed: string = "procgentown") {
		// Create noise generator with fixed seed for consistency
		const rand = new Rand(seed);
		this.noise2D = createNoise2D(() => rand.next());
	}

	/**
	 * Toggle smoothing on/off for water tiles
	 */
	public toggleSmoothing(): void {
		this.smoothingEnabled = !this.smoothingEnabled;
	}

	/**
	 * Get the current smoothing state
	 */
	public isSmoothing(): boolean {
		return this.smoothingEnabled;
	}

	/**
	 * Set smoothing state
	 */
	public setSmoothing(enabled: boolean): void {
		this.smoothingEnabled = enabled;
	}

	/**
	 * Check if a tile should be water based on noise value
	 */
	private isWaterByNoise(col: number, row: number): boolean {
		const noiseValue = this.noise2D(
			col * this.noiseScale,
			row * this.noiseScale,
		);
		const normalizedNoise = (noiseValue + 1) / 2;
		return normalizedNoise < this.waterThreshold;
	}

	/**
	 * Flood fill to count the size of a water cluster
	 * Returns the size of the cluster starting from (col, row)
	 */
	private countWaterClusterSize(
		col: number,
		row: number,
		waterMap: Map<string, boolean>,
		visited: Set<string>,
	): number {
		const key = `${col},${row}`;

		// If already visited or not water, return 0
		if (visited.has(key) || !waterMap.get(key)) {
			return 0;
		}

		visited.add(key);
		let size = 1;

		// Check 4-connected neighbors (not diagonal)
		const neighbors = [
			[col - 1, row],
			[col + 1, row],
			[col, row - 1],
			[col, row + 1],
		];

		for (const [neighborCol, neighborRow] of neighbors) {
			size += this.countWaterClusterSize(
				neighborCol,
				neighborRow,
				waterMap,
				visited,
			);
		}

		return size;
	}

	/**
	 * Generate a water map for a region, filtering out small clusters
	 * Returns a map of tile positions to whether they should be water
	 */
	private generateWaterMap(
		startCol: number,
		startRow: number,
		endCol: number,
		endRow: number,
	): Map<string, boolean> {
		// First pass: determine raw water/grass based on noise
		const rawWaterMap = new Map<string, boolean>();
		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				const key = `${col},${row}`;
				rawWaterMap.set(key, this.isWaterByNoise(col, row));
			}
		}

		// Second pass: identify small clusters and mark them for removal
		const visited = new Set<string>();
		const smallClusters = new Set<string>();

		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				const key = `${col},${row}`;

				if (!visited.has(key) && rawWaterMap.get(key)) {
					// Found an unvisited water tile, count its cluster
					const clusterVisited = new Set<string>();
					const clusterSize = this.countWaterClusterSize(
						col,
						row,
						rawWaterMap,
						clusterVisited,
					);

					// Mark all tiles in this cluster as visited
					for (const tileKey of clusterVisited) {
						visited.add(tileKey);

						// If cluster is too small, mark for removal
						if (clusterSize < this.minWaterClusterSize) {
							smallClusters.add(tileKey);
						}
					}
				}
			}
		}

		// Third pass: create final water map with small clusters removed
		const finalWaterMap = new Map<string, boolean>();
		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				const key = `${col},${row}`;
				const shouldBeWater = rawWaterMap.get(key) && !smallClusters.has(key);
				finalWaterMap.set(key, shouldBeWater || false);
			}
		}

		return finalWaterMap;
	}

	/**
	 * Get the tile variant for a water tile based on its neighbors
	 * Uses isometric directions: N = top-right, E = bottom-right, S = bottom-left, W = top-left
	 */
	private getWaterTileVariant(
		col: number,
		row: number,
		waterMap: Map<string, boolean>,
	): TileVariant {
		// Check if this is a water tile
		const key = `${col},${row}`;
		if (!waterMap.get(key)) {
			return "grass";
		}

		// If smoothing is disabled, return plain water for all water tiles
		if (!this.smoothingEnabled) {
			return "water";
		}

		// Check neighbors in isometric directions
		// N = top-right (col+1, row)
		// E = bottom-right (col, row+1)
		// S = bottom-left (col-1, row)
		// W = top-left (col, row-1)
		const hasWaterN = waterMap.get(`${col + 1},${row}`) || false;
		const hasWaterE = waterMap.get(`${col},${row + 1}`) || false;
		const hasWaterS = waterMap.get(`${col - 1},${row}`) || false;
		const hasWaterW = waterMap.get(`${col},${row - 1}`) || false;

		// Count water neighbors
		const waterCount = [hasWaterN, hasWaterE, hasWaterS, hasWaterW].filter(
			Boolean,
		).length;

		// If surrounded by water on all sides, it's full water
		if (waterCount === 4) {
			return "water";
		}

		// Straight edges (3 sides water, 1 side grass)
		// grass_water_E means grass on East, water on N, W, S
		if (!hasWaterE && hasWaterN && hasWaterW && hasWaterS) {
			return "grass_water_E";
		}
		if (!hasWaterS && hasWaterE && hasWaterN && hasWaterW) {
			return "grass_water_S";
		}
		if (!hasWaterW && hasWaterE && hasWaterS && hasWaterN) {
			return "grass_water_W";
		}
		if (!hasWaterN && hasWaterE && hasWaterS && hasWaterW) {
			return "grass_water_N";
		}

		// Concave corners (2 adjacent sides water)
		// The suffix indicates where the concave notch points (where grass curves in)
		// grass_waterConcave_N: water on S+W, grass curves in from N
		if (hasWaterS && hasWaterW && !hasWaterN && !hasWaterE) {
			return "grass_waterConcave_N";
		}
		// grass_waterConcave_E: water on N+W, grass curves in from E
		if (hasWaterN && hasWaterW && !hasWaterE && !hasWaterS) {
			return "grass_waterConcave_E";
		}
		// grass_waterConcave_S: water on N+E, grass curves in from S
		if (hasWaterN && hasWaterE && !hasWaterS && !hasWaterW) {
			return "grass_waterConcave_S";
		}
		// grass_waterConcave_W: water on S+E, grass curves in from W
		if (hasWaterS && hasWaterE && !hasWaterW && !hasWaterN) {
			return "grass_waterConcave_W";
		}

		// Default to water for any other configuration
		return "water";
	}

	/**
	 * Generate terrain types for a chunk region
	 * Returns both the logical map data and the rendering tile variants
	 */
	public generateChunkTerrain(
		chunkX: number,
		chunkY: number,
		chunkSize: number,
	): ChunkTerrainResult {
		const PADDING = 8;

		const startCol = chunkX * chunkSize - PADDING;
		const startRow = chunkY * chunkSize - PADDING;
		const endCol = (chunkX + 1) * chunkSize + PADDING;
		const endRow = (chunkY + 1) * chunkSize + PADDING;

		const waterMap = this.generateWaterMap(startCol, startRow, endCol, endRow);

		const mapData = new MapData();
		const tileVariants = new Map<string, TileVariant>();

		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				const key = `${col},${row}`;
				const isWater = waterMap.get(key) || false;

				mapData.set(col, row, isWater ? "water" : "grass");

				const variant = this.getWaterTileVariant(col, row, waterMap);
				tileVariants.set(key, variant);
			}
		}

		return { mapData, tileVariants };
	}
}
