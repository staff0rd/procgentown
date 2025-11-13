import { Assets, type Texture } from "pixi.js";

import grassCenterE from "/tiles/grass_center_E.png";
import grassWaterE from "/tiles/grass_water_E.png";
import grassWaterN from "/tiles/grass_water_N.png";
import grassWaterS from "/tiles/grass_water_S.png";
import grassWaterW from "/tiles/grass_water_W.png";
import grassWaterConcaveE from "/tiles/grass_waterConcave_E.png";
import grassWaterConcaveN from "/tiles/grass_waterConcave_N.png";
import grassWaterConcaveS from "/tiles/grass_waterConcave_S.png";
import grassWaterConcaveW from "/tiles/grass_waterConcave_W.png";
import waterCenterE from "/tiles/water_center_E.png";

export interface TerrainTextures {
	grassTexture: Texture;
	waterTexture: Texture;
	transitionTextures: {
		grass_water_N: Texture;
		grass_water_E: Texture;
		grass_water_S: Texture;
		grass_water_W: Texture;
		grass_waterConcave_N: Texture;
		grass_waterConcave_E: Texture;
		grass_waterConcave_S: Texture;
		grass_waterConcave_W: Texture;
	};
}

export async function loadTerrainTextures(): Promise<TerrainTextures> {
	const [
		grassTexture,
		waterTexture,
		grassWaterNTexture,
		grassWaterETexture,
		grassWaterSTexture,
		grassWaterWTexture,
		grassWaterConcaveNTexture,
		grassWaterConcaveETexture,
		grassWaterConcaveSTexture,
		grassWaterConcaveWTexture,
	] = await Promise.all([
		Assets.load(grassCenterE),
		Assets.load(waterCenterE),
		Assets.load(grassWaterN),
		Assets.load(grassWaterE),
		Assets.load(grassWaterS),
		Assets.load(grassWaterW),
		Assets.load(grassWaterConcaveN),
		Assets.load(grassWaterConcaveE),
		Assets.load(grassWaterConcaveS),
		Assets.load(grassWaterConcaveW),
	]);

	return {
		grassTexture,
		waterTexture,
		transitionTextures: {
			grass_water_N: grassWaterNTexture,
			grass_water_E: grassWaterETexture,
			grass_water_S: grassWaterSTexture,
			grass_water_W: grassWaterWTexture,
			grass_waterConcave_N: grassWaterConcaveNTexture,
			grass_waterConcave_E: grassWaterConcaveETexture,
			grass_waterConcave_S: grassWaterConcaveSTexture,
			grass_waterConcave_W: grassWaterConcaveWTexture,
		},
	};
}
