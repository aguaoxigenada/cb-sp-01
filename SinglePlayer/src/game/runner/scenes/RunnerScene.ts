import Phaser from "phaser";

export default class RunnerScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private gameSpeed: number = 200;
  //private walletAddress: string = "0x123...";
  private isGameOver: boolean = false;
  private isDucking: boolean = false;
  private obstacleTimer!: Phaser.Time.TimerEvent;
  private ground!: Phaser.GameObjects.TileSprite;
  private hiScore: number = 0;
  private hiScoreText: Phaser.GameObjects.Text;
  private milestoneCheckpoint: number = 0;
  private jumpSound!: Phaser.Sound.BaseSound;
  private scoreSound!: Phaser.Sound.BaseSound;
  private gameOverSound!: Phaser.Sound.BaseSound;

  constructor() {
    super("RunnerScene");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#f4f4f4"); // or any other color like "#ffffff"

    this.ground = this.add.tileSprite(0, 120, 1200, 12, "ground")
    .setOrigin(0, 0)
    .setScrollFactor(0);

    this.physics.world.setBounds(0, 0, width, height);
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.isGameOver = false;
    this.score = 0;
    this.physics.resume();
    this.gameSpeed = 200;

    // Create player as a simple colored box
    this.player = this.physics.add.sprite(20, height - 50, "")
      .setTint(0xffffff);
    this.player.setDisplaySize(20, 40);
    this.player.body.setSize(20, 40);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(800);


    // Score text (top-right)
    this.scoreText = this.add.text(this.scale.width - 20, 10, this.formatScore(this.score), {
      fontSize: "16px",
      color: "#808080ff",
    }).setOrigin(1, 0); // Align right-top


    // Load Hi Score from localStorage
    const savedScore = localStorage.getItem("hiScore");
    this.hiScore = savedScore ? parseInt(savedScore, 10) : 0;
    this.milestoneCheckpoint = 0;

    this.add.text(width - 180, 10, "HI", {
      fontSize: "16px",
      color: "#aaaaaa",
    });

    this.hiScoreText = this.add.text(width - 150, 10, this.formatScore(this.hiScore), {
      fontSize: "16px",
      color: "#808080ff",
    });


    // Ground platform (invisible)
    const groundHeight = 20;
    const groundY = height - groundHeight / 2;

    const ground = this.physics.add.staticGroup();
    ground.create(width / 2, groundY, "")
      .setDisplaySize(width, groundHeight)
      .setVisible(false)
      .refreshBody();
     // .setVisible(true)
    //  .setTint(0x00ff00);


    this.jumpSound = this.sound.add("jumpSound");
    this.scoreSound = this.sound.add("scoreSound");
    this.gameOverSound = this.sound.add("gameOverSound");


    this.physics.add.collider(this.player, ground);

     // Obstacles group
    this.obstacles = this.physics.add.group();

    // Initial obstacle spawn
    this.obstacleTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    // Difficulty progression every 10s
    this.time.addEvent({
      delay: 10000,
      callback: () => {
        this.gameSpeed += 30;
        const newDelay = Math.max(500, this.obstacleTimer.delay - 100);
        this.obstacleTimer.remove(false);
        this.obstacleTimer = this.time.addEvent({
          delay: newDelay,
          callback: this.spawnObstacle,
          callbackScope: this,
          loop: true,
        });
      },
      loop: true,
    });

    // Collision check
    this.physics.add.collider(this.player, this.obstacles, this.handleGameOver, undefined, this);
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;

    this.ground.tilePositionX += this.gameSpeed * (delta / 1000);

    // Jump
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
    ) {
      if (this.player.body?.touching.down && !this.isDucking) {
        this.player.setVelocityY(-400);
        this.jumpSound.play();
      }
    }

    // Ducking logic
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.down) &&
      !this.isDucking &&
      this.player.body?.touching.down
    ) {
      this.isDucking = true;
      this.player.setDisplaySize(20, 20);
    }

    // Stand (on key release)
    if (Phaser.Input.Keyboard.JustUp(this.cursors.down) && this.isDucking) {
      this.isDucking = false;
       this.player.y -= 20;
       this.player.setDisplaySize(20, 40);
    }
    // Update score
    this.score += delta * 0.01;
    const currentRoundedScore = Math.floor(this.score);
    this.scoreText.setText(this.formatScore(Math.floor(currentRoundedScore)));

    // Update milestone + blink
    if (currentRoundedScore >= this.milestoneCheckpoint + 100) {
      this.milestoneCheckpoint = Math.floor(currentRoundedScore / 100) * 100;
      this.scoreSound.play();
      this.tweens.add({
        targets: this.scoreText,
        alpha: 0,
        yoyo: true,
        duration: 100,
        repeat: 2,
      });
    }


    // Move obstacles
    this.obstacles.children.iterate((child) => {
    const obs = child as Phaser.Physics.Arcade.Sprite;
    if (!obs || !obs.active) return;

    obs.x -= this.gameSpeed * (delta / 1000);
    if (obs.x < -obs.width) obs.destroy();
    return null;
    });

  }

  private spawnObstacle() {
    const { width, height } = this.scale;
    const type = Phaser.Math.Between(0, 1); // 0 = ground, 1 = flying

    const obstacle = this.obstacles.create(width + 20, 0, "")
      .setDisplaySize(20, 20)
      .setTint(type === 0 ? 0x888888 : 0xffaaaa);

    obstacle.setImmovable(true);
    (obstacle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Position obstacle
    if (type === 0) {
      // Ground obstacle
      obstacle.setY(height - 30);
    } else {
      // Flying obstacle
      obstacle.setY(height - 60); 
    }
  }


  private handleGameOver = () => {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.physics.pause();
    this.player.setTint(0xff0000);

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, `GAME OVER\nScore: ${Math.floor(this.score)}`, {
      fontSize: "20px",
      color: "#828282ff",
      align: "center",
    }).setOrigin(0.5);

    if (this.score > this.hiScore) {
      this.hiScore = Math.floor(this.score);
      this.hiScoreText.setText(this.formatScore(this.hiScore));
      localStorage.setItem("hiScore", this.hiScore.toString());
    }
    this.gameOverSound.play();

    this.time.delayedCall(2000, () => {
      this.scene.restart();
    });
  }

  private formatScore(score: number): string {
    return score.toString().padStart(5, "0");
  }

}
