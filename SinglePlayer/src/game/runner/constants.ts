// Central place for gameplay tunables and physics-body poses, so they aren't
// scattered as magic numbers across the scene.

/** Player physics-body size + offset for each pose (origin is bottom-centre). */
export interface PlayerPose {
	bodyWidth: number;
	bodyHeight: number;
	offsetX: number;
	offsetY: number;
}

export const PLAYER_POSES = {
	/** Larger body used for the very first spawn frame. */
	spawn: { bodyWidth: 48, bodyHeight: 56, offsetX: 30, offsetY: 5 },
	/** Shared by running and jumping. */
	upright: { bodyWidth: 24, bodyHeight: 32, offsetX: 12, offsetY: 8 },
	ducking: { bodyWidth: 24, bodyHeight: 16, offsetX: 12, offsetY: 24 },
} satisfies Record<string, PlayerPose>;

export const GAMEPLAY = {
	/** Initial horizontal scroll speed (px/s). */
	startSpeed: 180,
	/** Speed added each progression tick. */
	speedStep: 50,
	/** How often difficulty ramps up (ms). */
	progressionInterval: 15000,
	/** Initial delay between obstacle spawns (ms). */
	spawnDelay: 1800,
	/** Lower bound the spawn delay decays toward (ms). */
	minSpawnDelay: 600,
	/** Amount the spawn delay shrinks each progression tick (ms). */
	spawnDelayStep: 100,
	/** Initial jump impulse (negative = up). */
	jumpVelocity: -180,
	/** Extra upward velocity applied per frame while the jump key is held. */
	jumpHoldVelocity: -12,
	/** Max time the jump can be held to gain height (ms). */
	maxJumpHold: 150,
	/** Jump impulse for touch input. */
	touchJumpVelocity: -250,
	/** Score gained per millisecond survived. */
	scorePerMs: 0.01,
	/** Score at which obstacle variety unlocks (ground-only before this). */
	varietyUnlockScore: 300,
	/** Points between score-milestone blinks. */
	milestoneStep: 100,
	/** Points between day/night swaps. */
	dayNightStep: 500,
} as const;
