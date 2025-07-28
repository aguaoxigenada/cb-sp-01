
import dinosaurSheet from "@game/public/assets/animations/dinoSprite.png";

import Phaser from "phaser";

export default class LoadingScene extends Phaser.Scene {
	constructor() {
		super({ key: "LoadingScene" });
	}

	preload() {
		const { width, height } = this.scale;

		// Add loading background image
		this.add.image(0, 0, "background").setOrigin(0).setDisplaySize(width, height);

		// === Loading Text ===
		const loadingText = this.add
			.text(width / 2, height / 2 - 80, "LOADING..", {
				fontSize: "32px",
				fontFamily: '"Press Start 2P", monospace',
				color: "#ffffff",
			})
			.setOrigin(0.5);

		// === Progress Box Border ===
		const progressBorder = this.add.graphics();
		progressBorder.lineStyle(4, 0x00aaff, 1);
		progressBorder.strokeRoundedRect(width / 2 - 160, height / 2 - 25, 320, 50, 12);

		// === Progress Fill Bar ===
		const progressBar = this.add.graphics();

		this.load.on("progress", (value: number) => {
			progressBar.clear();
			progressBar.fillStyle(0x00aaff, 1);
			progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 15, 300 * value, 30, 8);
		});

		this.load.on("complete", () => {
			this.tweens.add({
				targets: [progressBar, progressBorder, loadingText],
				alpha: 0,
				duration: 500,
				ease: "Power2",
				onComplete: () => {
					this.time.delayedCall(200, () => {
						this.cameras.main.fadeOut(500, 0, 0, 0);
						this.cameras.main.once("camerafadeoutcomplete", () => {
							this.cameras.main.fadeIn(100);
							this.scene.start("RunnerScene");
						});
					});
				},
			});
		});

		this.load.on("loaderror", () => {
			console.error("Load error occurred");
		});

		// Load assets
		//this.load.image("loadingBackground", loadingBackground);
		//this.load.audio("buttonPress", [buttonPressOgg, buttonPressWav]);
		this.load.spritesheet("dinosaurSheet", dinosaurSheet, {
		frameWidth: 68,
		frameHeight: 17,
		});

		//this.load.audio("gamePlaySong_1", song_1);
		
	}
}
