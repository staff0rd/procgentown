import { type Container, Point } from "pixi.js";
import { GRID_OFFSET_X, GRID_OFFSET_Y, MAX_ZOOM, MIN_ZOOM } from "./config";

export interface ViewportBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
}

/**
 * Camera system following improved-tile-system.md principles:
 * - Maintain explicit camera position (cameraX, cameraY) in world coordinates
 * - Use world.pivot to control what world point is shown
 * - Use world.position to control where that point appears (constant at screen center)
 * - Separate camera state from container transforms
 */
export class CameraManager {
	private world: Container;
	private cameraX: number;
	private cameraY: number;
	private screenWidth: number;
	private screenHeight: number;

	constructor(world: Container, screenWidth: number, screenHeight: number) {
		this.world = world;
		this.cameraX = 0;
		this.cameraY = 0;
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;

		this.initializeTransform();
	}

	private initializeTransform(): void {
		this.world.pivot.set(this.cameraX, this.cameraY);
		this.world.position.set(
			this.screenWidth / 2 + GRID_OFFSET_X,
			this.screenHeight / 2 + GRID_OFFSET_Y,
		);
		this.world.scale.set(1, 1);
	}

	getCameraX(): number {
		return this.cameraX;
	}

	getCameraY(): number {
		return this.cameraY;
	}

	getZoom(): number {
		return this.world.scale.x;
	}

	pan(deltaScreenX: number, deltaScreenY: number): void {
		const zoom = this.world.scale.x;
		this.cameraX -= deltaScreenX / zoom;
		this.cameraY -= deltaScreenY / zoom;

		this.world.pivot.set(this.cameraX, this.cameraY);
	}

	zoom(newZoom: number, screenX: number, screenY: number): void {
		const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

		if (clampedZoom === this.world.scale.x) {
			return;
		}

		const worldPosBeforeZoom = this.screenToWorld(screenX, screenY);

		this.world.scale.set(clampedZoom, clampedZoom);

		const worldPosAfterZoom = this.screenToWorld(screenX, screenY);

		this.cameraX += worldPosBeforeZoom.x - worldPosAfterZoom.x;
		this.cameraY += worldPosBeforeZoom.y - worldPosAfterZoom.y;

		this.world.pivot.set(this.cameraX, this.cameraY);
	}

	screenToWorld(screenX: number, screenY: number): Point {
		return this.world.toLocal(new Point(screenX, screenY));
	}

	worldToScreen(worldX: number, worldY: number): Point {
		return this.world.toGlobal(new Point(worldX, worldY));
	}

	getViewportBounds(): ViewportBounds {
		const zoom = this.world.scale.x;
		const halfWidth = this.screenWidth / (2 * zoom);
		const halfHeight = this.screenHeight / (2 * zoom);

		return {
			minX: this.cameraX - halfWidth,
			minY: this.cameraY - halfHeight,
			maxX: this.cameraX + halfWidth,
			maxY: this.cameraY + halfHeight,
			width: this.screenWidth / zoom,
			height: this.screenHeight / zoom,
		};
	}

	updateScreenSize(width: number, height: number): void {
		this.screenWidth = width;
		this.screenHeight = height;
		this.world.position.set(
			width / 2 + GRID_OFFSET_X,
			height / 2 + GRID_OFFSET_Y,
		);
	}
}
