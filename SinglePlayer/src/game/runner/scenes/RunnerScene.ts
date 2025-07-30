import Phaser from "phaser";

export default class RunnerScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private gameSpeed: number = 200;
  private walletAddress: string = "0x123...";
  private isGameOver: boolean = false;

  constructor() {
    super("RunnerScene");
  }

  create() {
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create player as a simple colored box
    this.player = this.physics.add.sprite(100, height - 40, "")
      .setDisplaySize(20, 20)
      .setTint(0xffffff);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(800);

    // Score text (top-right)
    this.scoreText = this.add.text(width - 20, 10, "Score: 0", {
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(1, 0); // Align right-top

    // Ground platform (invisible)
    const ground = this.physics.add.staticGroup();
    ground.create(width / 2, height - 10, "")
      .setDisplaySize(width, 20)
      .setVisible(false)
      .refreshBody();

    this.physics.add.collider(this.player, ground);

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
    if (this.isGameOver) return;

    // Controls
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
    ) {
      if (this.player.body?.touching.down) {
        this.player.setVelocityY(-400);
      }
    }

    if (this.cursors.down.isDown) {
      this.player.setVelocityY(600);
    }

    // Update score
    this.score += delta * 0.01;
    this.scoreText.setText("Score: " + Math.floor(this.score));

    // Move obstacles
    this.obstacles.children.iterate((child) => {
    const obs = child as Phaser.Physics.Arcade.Sprite;
    if (!obs || !obs.active) return; // 🛡 prevent crash

    obs.x -= this.gameSpeed * (delta / 1000);
    if (obs.x < -obs.width) obs.destroy();
    return null;

});

  }

  private spawnObstacle() {
    const { width, height } = this.scale;
    const obstacle = this.obstacles.create(width + 20, height - 30, "")
      .setDisplaySize(20, 20)
      .setTint(0x888888);
    obstacle.setImmovable(true);
    (obstacle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  private handleGameOver = () => {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.physics.pause();
    this.player.setTint(0xff0000);

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, `GAME OVER\nScore: ${Math.floor(this.score)}`, {
      fontSize: "20px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }
}
