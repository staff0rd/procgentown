import { describe, expect, it } from "vitest";
import { TerrainGenerator } from "./TerrainGenerator";

describe("TerrainGenerator", () => {
	it("should generate grass at 0,0 with seed procgentown", () => {
		const terrainGen = new TerrainGenerator("procgentown");
		const { mapData } = terrainGen.generateChunkTerrain(0, 0, 16);
		expect(mapData.get(0, 0)).toBe("grass");
	});

	it("should generate water at 3,1 with seed procgentown", () => {
		const terrainGen = new TerrainGenerator("procgentown");
		const { mapData, tileVariants } = terrainGen.generateChunkTerrain(0, 0, 16);
		expect(mapData.get(3, 1)).toBe("water");
		expect(tileVariants.get("3,1")).toBe("grass_waterConcave_S");
	});
});
