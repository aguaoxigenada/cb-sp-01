import Phaser from "phaser";
import loadingBackground from "@game/public/assets/images/loadingBackground.png";
import groundBackground from "@game/public/assets/images/groundBackground.png";

export default class BootScene extends Phaser.Scene {
	constructor() {
		super({ key: "BootScene" });
	}

	preload() {
		// Load minimal assets needed for the loading screen

		this.load.image("loadingBackground", loadingBackground);
		this.load.image("groundBackground", groundBackground);
		this.load.atlas("ui_elements", "assets/images/ui/elements.png", "assets/images/ui/elements.json");
	}

	create() {
		// Set pixel art scaling

		// Immediately start the LoadingScene
		this.scene.start("LoadingScene");
	}
}
