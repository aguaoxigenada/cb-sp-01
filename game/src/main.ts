import Phaser from "phaser";
import RunnerScene from "./scenes/RunnerScene";

const config: Phaser.Types.Core.GameConfig = {
type: Phaser.AUTO,
	scale: {
		mode: Phaser.Scale.RESIZE,
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
			debug: false,
		},
	},
  scene: [RunnerScene],
};

new Phaser.Game(config);
