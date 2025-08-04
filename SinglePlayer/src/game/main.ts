import { Game, Types } from "phaser";
import RunnerScene from "./runner/scenes/RunnerScene";
import LoadingScene from "./runner/scenes/LoadingScene";
import BootScene from "./runner/scenes/BootScene";

const config: Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 600,
	height: 150,
	scale: {
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	input: {
		activePointers: 3,
	},
	render: {
		antialias: false,
		pixelArt: true,
		roundPixels: true,
	},
	physics: {
		default: "arcade",
		arcade: {
			gravity: {
				x: 0,
				y: 200,
			},
			fps: 300,
			debug: false,
		},
	},
	scene: [BootScene, LoadingScene, RunnerScene],
};

interface GameStartConfig {
	parent: string | HTMLElement;
}

const StartGame = (parent: GameStartConfig["parent"]): Game => {
	return new Game({ ...config, parent });
};

export default StartGame;

StartGame("game-container");
