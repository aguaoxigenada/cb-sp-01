import Phaser from 'phaser'
import loadingBackground from "@game/public/assets/images/loadingBackground.png";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Load minimal assets needed for the loading screen

	this.load.image("loadingBackground", loadingBackground);
  }

  create() {
    // Set pixel art scaling


    // Immediately start the LoadingScene
    this.scene.start('LoadingScene');
  }
}
