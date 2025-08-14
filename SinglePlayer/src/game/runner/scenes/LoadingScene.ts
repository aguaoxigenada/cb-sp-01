
import dinosaurSheet from "@game/public/assets/animations/dinoSpriteSheet.png";
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
		const rectangleWidth=200;
		const rectangleHeight=80;
		this.add.rectangle(width / 2-rectangleWidth/2, height / 2-rectangleHeight/2, rectangleWidth, rectangleHeight, 0xffffff, 1)
			.setOrigin(0, 0)
		
		// === Loading Text ===
		const loadingText = this.add
			.text(width / 2, height / 2 - 28, "LOADING..", {
				fontSize: "26px",
				fontFamily: '"Press Start 2P", monospace',
				color: "#000000",
			})
			.setOrigin(0.5);

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
				targets: [progressBar, progressBorder, loadingText],
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

		// Load assets
		this.load.spritesheet("dinosaurSheet", dinosaurSheet, {
			frameWidth: 68,
			frameHeight: 17,
		});
		

		this.load.audio("jumpSound", jumpSound);
		this.load.audio("scoreSound", scoreSound);
		this.load.audio("gameOverSound", gameOverSound);		
	}
}
