import Phaser from "phaser";
import { GAMEPLAY } from "./constants";

/** Live game state the spawner needs to read when placing an obstacle. */
export interface SpawnerState {
	/** Current horizontal scroll speed (px/s). */
	speed: number;
	/** Current score, used to gate difficulty/variety. */
	score: number;
	/** Whether the "negative" tint should be applied to spawned hazards. */
	negativeFilter: boolean;
}

/**
 * Owns obstacle creation for the runner: picks a hazard type based on score and
 * spawns it into the shared physics group. Kept separate from the scene so the
 * spawn rules live in one place.
 */
export class ObstacleSpawner {
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly obstacles: Phaser.Physics.Arcade.Group,
		private readonly getState: () => SpawnerState,
	) {}

	/** Spawns one obstacle, weighting the type by current score. */
	spawn(): void {
		const { score } = this.getState();

		// Early game: ground hazards only until variety unlocks.
		if (score < GAMEPLAY.varietyUnlockScore) {
			this.spawnGround();
			return;
		}

		const roll = Phaser.Math.Between(0, 99);
		if (roll < 50) {
			this.spawnGround(); // 50%
		} else if (roll < 80) {
			this.spawnFlying(); // 30%
		} else {
			this.spawnMixed(); // 20%
		}
	}

	private spawnGround(): void {
		const { width, height } = this.scene.scale;
		const { speed, score, negativeFilter } = this.getState();

		const isEarlyGame = score < 200;
		const count = isEarlyGame ? 1 : Phaser.Math.Between(1, 2);
		const spacing = 22;

		for (let i = 0; i < count; i++) {
			const hazardKey = Phaser.Math.RND.pick(["groundHazard1", "groundHazard2"]);
			const obstacle = this.obstacles
				.create(width + 20 + i * spacing, 0, hazardKey)
				.setOrigin(0, 1)
				.setDisplaySize(28, 17);
			if (Math.random() > 0.5) {
				obstacle.setScale(0.5);
			} else {
				obstacle.setScale(0.5, 1);
			}

			obstacle.setVelocityX(-speed);
			obstacle.setImmovable(true);
			obstacle.body.setAllowGravity(false);
			// Align with ground level.
			obstacle.setY(height - 22);

			if (negativeFilter) {
				obstacle.setTint(0x0000ff);
			}
		}
	}

	private spawnFlying(): void {
		const { width, height } = this.scene.scale;
		const { speed } = this.getState();

		const obstacle = this.obstacles.create(width + 20, 0, "flyingHazard11").setDisplaySize(75, 29);
		obstacle.play("flyingHazard_anim");

		obstacle.setVelocityX(-speed);
		obstacle.setImmovable(true);
		obstacle.setScale(0.5);
		obstacle.body.setAllowGravity(false);
		obstacle.setY(height - 55);
		obstacle.setFlipX(true);
	}

	private spawnMixed(): void {
		const { width, height } = this.scene.scale;
		const { speed, negativeFilter } = this.getState();

		const type = Phaser.Math.Between(0, 1);
		const hazardKey = type === 0 ? "groundHazard1" : "flyingHazard11";
		const obstacle = this.obstacles.create(width + 20, 0, hazardKey).setDisplaySize(40, 40);
		obstacle.setVelocityX(-speed);
		obstacle.setImmovable(true);
		obstacle.setScale(0.5);

		obstacle.body.setAllowGravity(false);
		obstacle.setY(type === 0 ? height - 22 : height - 55);
		if (hazardKey === "flyingHazard11") {
			obstacle.play("flyingHazard_anim");
			obstacle.setFlipX(true);
		} else if (Math.random() > 0.5) {
			obstacle.setScale(0.5);
		} else {
			obstacle.setScale(0.5, 1);
		}

		if (negativeFilter) {
			obstacle.setTint(0x0000ff);
		}
	}
}
