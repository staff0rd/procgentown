export type MapTileType = "grass" | "water";

export class MapData {
	private tiles: Map<string, MapTileType> = new Map();

	set(col: number, row: number, type: MapTileType): void {
		const key = `${col},${row}`;
		this.tiles.set(key, type);
	}

	get(col: number, row: number): MapTileType | undefined {
		const key = `${col},${row}`;
		return this.tiles.get(key);
	}

	has(col: number, row: number): boolean {
		const key = `${col},${row}`;
		return this.tiles.has(key);
	}
}
