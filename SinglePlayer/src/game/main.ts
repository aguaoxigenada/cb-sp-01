import { Game, Types } from "phaser";
import RunnerScene from "./runner/scenes/RunnerScene";
import LoadingScene from "./runner/scenes/LoadingScene";
import BootScene from "./runner/scenes/BootScene";
import { EventBus } from "./EventBus";
import { CBEventSource, ExternalMessage } from "./eventTypes";

declare global {
	interface Window {
		phaserBridge: {
			send: (msg: ExternalMessage) => void;
		};
	}
}

const config: Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 600,
	height: 150,
	pixelArt: true,
	scale: {
		mode: Phaser.Scale.FIT,
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

window.phaserBridge = {
	send: msg => EventBus.emit(CBEventSource.EXTERNAL_MESSAGE, msg),
};
