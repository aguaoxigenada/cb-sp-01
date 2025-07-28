import Phaser from "phaser";

export default class RunnerScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private gameSpeed: number = 200;
  private walletAddress: string = "0x123...";

  constructor() {
    super("RunnerScene");
  }

  preload() {
    this.load.image("ground", "assets/ground.png");
    this.load.image("cactus", "assets/cactus.png");
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, 800, 600);
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Ground
    this.add.tileSprite(0, 568, 800, 32, "ground").setOrigin(0, 0);

    // Player
    this.player = this.physics.add.sprite(100, 500, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(800);

    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.player.play("run");

    // Score
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "20px",
      color: "#fff",
    });

    // Obstacles
    this.obstacles = this.physics.add.group();

    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.collider(
      this.player,
      this.obstacles,
      this.handleGameOver,
      undefined,
      this
    );
  }

  update(time: number, delta: number) {
    // Jump
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
    ) {
    if (this.player.body?.touching.down) {
      this.player.setVelocityY(-450);
    }
   }

    // Duck
    if (this.cursors.down.isDown) {
      this.player.setVelocityY(600);
    }

    // Score
    this.score += delta * 0.01;
    this.scoreText.setText("Score: " + Math.floor(this.score));

    // Move obstacles
    this.obstacles.children.iterate((child) => {
      const obs = child as Phaser.Physics.Arcade.Sprite;
      obs.x -= this.gameSpeed * (delta / 1000);
      if (obs.x < -obs.width) obs.destroy();
      return null;
    });
  }

private spawnObstacle() {
  const obstacle = this.obstacles.create(800, 520, "cactus") as Phaser.Physics.Arcade.Sprite;
  obstacle.setImmovable(true);

  // Correct way:
  obstacle.body && (obstacle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
}


  private handleGameOver() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.scoreText.setText(
      `GAME OVER\nScore: ${Math.floor(this.score)}\nWallet: ${this.walletAddress}`
    );

    // TODO: Send score to backend API with walletAddress
  }
}
