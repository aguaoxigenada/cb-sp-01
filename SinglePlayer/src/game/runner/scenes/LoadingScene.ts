import jumpSound from "@game/public/assets/audio/sfx/jump.wav";
import scoreSound from "@game/public/assets/audio/sfx/score.wav";
import gameOverSound from "@game/public/assets/audio/sfx/gameOver.wav";

import Phaser from "phaser";

export default class LoadingScene extends Phaser.Scene {
	constructor() {
		super({ key: "LoadingScene" });
	}

	preload() {
		const { width, height } = this.scale;

		// Add loading background image
		this.add.image(0, 0, "loadingBackground").setOrigin(0).setDisplaySize(width, height);
		this.add.image(0, 0, "groundBackground").setOrigin(0).setDisplaySize(width, height);
		const rectangleWidth = width;
		const rectangleHeight = height;
		this.add.rectangle(0, 0, rectangleWidth, rectangleHeight, 0x000000, 0.6).setOrigin(0, 0);

		const loadingIcon = this.add.sprite(width / 2, height / 2 - 28, "ui_elements", "loading_icon").setOrigin(0.5);

		// === Progress Box Border ===
		const progressBorder = this.add.graphics();
		progressBorder.lineStyle(2, 0x888888, 1);
		progressBorder.strokeRoundedRect(width / 2 - 80, height / 2 - 12, 160, 24, 6);

		// === Progress Fill Bar ===
		const progressBar = this.add.graphics();

		this.load.on("progress", (value: number) => {
			progressBar.clear();
			progressBar.fillStyle(0xbbbbbb, 1);
			progressBar.fillRoundedRect(width / 2 - 75, height / 2 - 8, 150 * value, 16, 4);
		});

		this.load.on("complete", () => {
			this.tweens.add({
				targets: [progressBar, progressBorder, loadingIcon],
				alpha: 0,
				duration: 2000,
				ease: "Power2",
				onComplete: () => {
					this.time.delayedCall(1000, () => {
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

		this.load.audio("jumpSound", jumpSound);
		this.load.audio("scoreSound", scoreSound);
		this.load.audio("gameOverSound", gameOverSound);
	}
}
