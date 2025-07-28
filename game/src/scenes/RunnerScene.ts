import Phaser from "phaser";

export default class RunnerScene extends Phaser.Scene {
  constructor() {
    super("RunnerScene");
  }

  preload() {
    this.load.image("sky", "assets/sky.png");
  }

  create() {
    this.add.image(400, 300, "sky");
    this.add.text(200, 300, "Hello Phaser + Vite!", {
      fontSize: "32px",
      color: "#fff",
    });
  }
}
