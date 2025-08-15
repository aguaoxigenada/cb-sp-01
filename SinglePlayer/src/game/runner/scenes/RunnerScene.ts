import Phaser from "phaser";

export default class RunnerScene extends Phaser.Scene {

	preload() {
		for (let i = 1; i <= 8; i++) {
			this.load.image(`dino_run_${i}`, `assets/images/character/running/running${i}.png`);
			this.load.image(`dino_duck_${i}`, `assets/images/character/crouching/crouching${i}.png`);
			this.load.image(`dino_jump_${i}`, `assets/images/character/jump/jump${i}.png`);
		}
		for (let i = 1; i <= 7; i++) {
			this.load.image(`dino_death_${i}`, `assets/images/character/death/death${i}.png`);
		}
	this.load.image('groundHazard1', 'assets/images/hazards/groundHazard1.png');
	this.load.image('groundHazard2', 'assets/images/hazards/groundHazard2.png');
	this.load.image('flyingHazard1', 'assets/images/hazards/flyingHazard1.png');
		this.load.image('parallax_bg', 'assets/images/parallaxBackground1.png');
		this.load.image('parallax_bg2', 'assets/images/parallaxBackground2.png');
		this.load.image('groundBackground', 'assets/images/groundBackground.png');
		this.load.image('skyBackground', 'assets/images/skyBackground.png');
	}
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
	private cursorUp!: Phaser.Input.Keyboard.Key;
	private cursorDown!: Phaser.Input.Keyboard.Key;
	private cursorSpace!: Phaser.Input.Keyboard.Key;
	private isJumping: boolean = false;
	private jumpHoldTime: number = 0;
	private maxJumpHold: number = 150; // ms

	constructor() {
		super("RunnerScene");
	}

  resizeGame(gameSize: { width: number; height: number }) {
    const baseWidth = 600; 
    const baseHeight = 150;
    const scaleX = gameSize.width / baseWidth;
    const scaleY = gameSize.height / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    this.cameras.main.setZoom(scale);

    }
	create() {    
		this.scale.on('resize', this.resizeGame, this);
    	this.resizeGame({ width: this.scale.width, height: this.scale.height });
  
		const { width, height } = this.scale;
		this.sky= this.add.tileSprite(0, 0, width, height, 'skyBackground').setOrigin(0, 0).setScrollFactor(0);
		this.bg = this.add.tileSprite(0, 0, width, height, 'parallax_bg').setOrigin(0, 0).setScrollFactor(0);
		
		//this.cameras.main.setBackgroundColor("#f4f4f4");

		
		this.ground = this.add.tileSprite(0, 0, width, height, "groundBackground").setOrigin(0, 0).setScrollFactor(0);

		this.physics.world.setBounds(0, 0, width, height);
		this.cursors = this.input.keyboard!.createCursorKeys();

		const { up, down, space } = this.cursors;
		this.cursorUp = up!;
		this.cursorDown = down!;
		this.cursorSpace = space!;

		this.isGameOver = false;
		this.score = 0;
		this.physics.resume();
		this.gameSpeed = 200;

		const runFrames = [];
		for (let i = 1; i <= 8; i++) {
			runFrames.push({ key: `dino_run_${i}` });
		}
		this.anims.create({
			key: 'run',
			frames: runFrames,
			frameRate: 10,
			repeat: -1
		});

		const duckFrames = [];
		for (let i = 1; i <= 8; i++) {
			duckFrames.push({ key: `dino_duck_${i}` });
		}
		this.anims.create({
			key: 'duck',
			frames: duckFrames,
			frameRate: 10,
			repeat: -1
		});

		const deathFrames = [];
		for (let i = 1; i <= 8; i++) {
			deathFrames.push({ key: `dino_death_${i}` });
		}
		this.anims.create({
			key: 'death',
			frames: deathFrames,
			frameRate: 10,
			repeat: 0
		});

		const jumpUpFrames = [];
		for (let i = 1; i <= 4; i++) {
			jumpUpFrames.push({ key: `dino_jump_${i}` });
		}
		this.anims.create({
			key: 'jump_up',
			frames: jumpUpFrames,
			frameRate: 10,
			repeat: 0
		});

		const jumpDownFrames = [];
		for (let i = 5; i <= 8; i++) {
			jumpDownFrames.push({ key: `dino_jump_${i}` });
		}
		this.anims.create({
			key: 'jump_down',
			frames: jumpDownFrames,
			frameRate: 10,
			repeat: 0
		});

	this.player = this.physics.add.sprite(50, 0, 'dino_run_1');
	this.player.setOrigin(0.5, 1);
	this.player.setScale(1);
	this.player.body.setSize(48, 56);
	this.player.body.setOffset(30, 5);
	this.player.setCollideWorldBounds(true);
	this.player.setGravityY(800);
	this.player.play('run');
	this.player.setDepth(10);

	const scoreBgWidth = 180;
	const scoreBgHeight = 28;
	const scoreBgX = width - scoreBgWidth-10;
	const scoreBgY = 6;
	this.add.rectangle(scoreBgX, scoreBgY, scoreBgWidth, scoreBgHeight, 0xffffff, 1)
	  .setOrigin(0, 0)
	  .setDepth(1);

	// Score text (top-right)
	this.scoreText = this.add
	  .text(width - 20, 10, this.formatScore(this.score), {
		fontSize: "16px",
		color: "#222",
		fontStyle: "bold"
	  })
	  .setOrigin(1, 0)
	  .setDepth(2);

	// Load Hi Score from localStorage
	const highScore = localStorage.getItem("hiScore");
	this.hiScore = highScore ? parseInt(highScore, 10) : 0;
	this.milestoneCheckpoint = 0;

	this.add.text(width - 180, 10, "HI", {
	  fontSize: "16px",
	  color: "#666"
	}).setDepth(2);

	this.hiScoreText = this.add.text(width - 150, 10, this.formatScore(this.hiScore), {
	  fontSize: "16px",
	  color: "#222",
	  fontStyle: "bold"
	}).setDepth(2);

		// Ground platform (invisible)
		const groundHeight = 25;
		const groundY = height - groundHeight / 2;

		const ground = this.physics.add.staticGroup();
		ground
			.create(width / 2, groundY, "")
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
		//this.obstacles = this.physics.add.group();
		this.obstacles = this.physics.add.group({
			allowGravity: false,
			immovable: true,
		});
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
				this.gameSpeed += 60;
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

	if (this.bg) {
	  this.bg.tilePositionX += (this.gameSpeed * 0.3) * (delta / 1000);
	}
	this.ground.tilePositionX += this.gameSpeed * (delta / 1000);

		// Start jump
		if (
			(Phaser.Input.Keyboard.JustDown(this.cursorSpace) || Phaser.Input.Keyboard.JustDown(this.cursorUp)) &&
			this.player.body?.touching.down &&
			!this.isDucking
		) {
			this.player.setVelocityY(-300); // smaller initial jump
			this.jumpSound.play();
			this.isJumping = true;
			this.jumpHoldTime = 0;
		}

		// While jump key is held, add velocity
		if (this.isJumping && (this.cursorSpace.isDown || this.cursorUp.isDown)) {
			this.jumpHoldTime += delta;
			if (this.jumpHoldTime < this.maxJumpHold) {
				this.player.setVelocityY(this.player.body.velocity.y - 10);
			} else {
				this.isJumping = false;
			}
		}
		
		if (Math.abs(this.player.body.velocity.y) > 1) {
			if (this.player.body.velocity.y < 0) {
				this.player.play('jump_up', true);
			} else {
				this.player.play('jump_down', true);
			}
			this.player.setOrigin(0.5, 1);
			this.player.body.allowGravity = true;
			this.player.setScale(1);
	this.player.body.setSize(48, 56);
	this.player.body.setOffset(30, 21);
		} else if (!this.isDucking) {
			this.player.play('run', true);
			this.player.setOrigin(0.5, 1);
			this.player.body.allowGravity = true;
			this.player.setScale(1);
	this.player.body.setSize(48, 56);
	this.player.body.setOffset(30, 5);
		}

		// Stop jump when key is released
		if (Phaser.Input.Keyboard.JustUp(this.cursorSpace) || Phaser.Input.Keyboard.JustUp(this.cursorUp)) {
			this.isJumping = false;
		}

		if (Phaser.Input.Keyboard.JustDown(this.cursorDown) && !this.isDucking && this.player.body?.touching.down) {
			this.isDucking = true;
			this.player.play('duck', true);
			this.player.setOrigin(0.5, 1);
			this.player.setScale(1);
	this.player.body.setSize(48, 30);
this.player.body.setOffset(30, 56 - 30+5);
		}

		// Stand (on key release)
		if (Phaser.Input.Keyboard.JustUp(this.cursorDown) && this.isDucking) {
			this.isDucking = false;
			this.player.play('run', true);
			this.player.setOrigin(0.5, 1);
			this.player.body.allowGravity = true;
			this.player.setScale(1);
	this.player.body.setSize(48, 56);
	this.player.body.setOffset(30, 5);
		}
		// Update score
		this.score += delta * 0.01;
		const currentRoundedScore = Math.floor(this.score);
		this.scoreText.setText(this.formatScore(Math.floor(currentRoundedScore)));

		// Update milestone + blink
		if (currentRoundedScore >= this.milestoneCheckpoint + 100) {
			this.milestoneCheckpoint += 100;
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
		this.obstacles.children.iterate(child => {
			const obs = child as Phaser.Physics.Arcade.Sprite;
			if (!obs || !obs.active) return;

			obs.setVelocityX(-this.gameSpeed); // Let physics handle movement

			if (obs.x < -obs.width) {
				obs.destroy();
			}
			return null;
		});
	}

	private spawnObstacle() {
		//const stage = Math.floor(this.score / 200);
const stage=Phaser.Math.Between(0, 1)
		switch (stage) {
			case 0:
				this.spawnGroundObstacle();
				break;

			case 1:
				this.spawnFlyingObstacle();
				break;

			default:
				// Weighted mix
				const type = Phaser.Math.Between(0, 99);
				if (type < 60) {
					this.spawnGroundObstacle(); // 60%
				} else if (type < 80) {
					this.spawnFlyingObstacle(); // 20%
				} else {
					this.spawnMixedObstacle(); // 20%
				}
				break;
		}
	}

	private spawnGroundObstacle() {
		const { width, height } = this.scale;

		const isEarlyGame = this.score < 100;
		const count = isEarlyGame ? 1 : Phaser.Math.Between(1, 3);
		const spacing = 22;

		for (let i = 0; i < count; i++) {
			const hazardKey = Phaser.Math.RND.pick(['groundHazard1', 'groundHazard2']);
			const obstacle = this.obstacles
				.create(width + 20 + i * spacing, 0, hazardKey)
				.setOrigin(0, 1)
				.setDisplaySize(28, 17);
			obstacle.setVelocityX(-this.gameSpeed);
			obstacle.setImmovable(true);
			obstacle.body.setAllowGravity(false);
			obstacle.setY(height - 20);
		}
	}

	private spawnFlyingObstacle() {
		const { width, height } = this.scale;
		const type = Phaser.Math.Between(0, 1);
		const hazardKey = 'flyingHazard1';
		const obstacle = this.obstacles
			.create(width + 20, 0, hazardKey)
			.setDisplaySize(75, 29);
		obstacle.setVelocityX(-this.gameSpeed);
		obstacle.setImmovable(true);
		obstacle.body.setAllowGravity(false);
		obstacle.setY(height - 80);
		obstacle.setFlipX(true);
	}

	private spawnMixedObstacle() {
		const { width, height } = this.scale;
		const type = Phaser.Math.Between(0, 1);
		const hazardKey = type === 0 ? 'groundHazard1' : 'flyingHazard1';
		const obstacle = this.obstacles
			.create(width + 20, 0, hazardKey)
			.setDisplaySize(40, 40);
		obstacle.setVelocityX(-this.gameSpeed);
		obstacle.setImmovable(true);
		obstacle.body.setAllowGravity(false);
		obstacle.setY(type === 0 ? height - 30 : height - 60);
		if (hazardKey === 'flyingHazard1') {
			obstacle.setFlipX(true);
		}
	}

	private handleGameOver = () => {
		if (this.isGameOver) return;
		this.isGameOver = true;

		this.physics.pause();
	this.player.play('death', true);

		const { width, height } = this.scale;
		const scoreBgWidth = 180;
		const scoreBgHeight = 40;
		this.add.rectangle(width / 2-scoreBgWidth/2, height / 2-scoreBgHeight/2, scoreBgWidth, scoreBgHeight, 0xffffff, 1)
			.setOrigin(0, 0)

		this.add
			.text(width / 2, height / 2, `GAME OVER\nScore: ${Math.floor(this.score)}`, {
				fontSize: "20px",
				color: "#828282ff",
				align: "center",
			})
			.setOrigin(0.5);

			// Botón de reinicio
			const restartButton = this.add.text(width / 2, height / 2 + 50, 'Reiniciar', {
				fontSize: '18px',
				color: '#828282ff',
				backgroundColor: '#ffffff',
				padding: { left: 16, right: 16, top: 8, bottom: 8 },
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true })
			.setDepth(10);

			restartButton.on('pointerdown', () => {
				this.scene.restart();
			});

		if (this.score > this.hiScore) {
			this.hiScore = Math.floor(this.score);
			this.hiScoreText.setText(this.formatScore(this.hiScore));
			localStorage.setItem("hiScore", this.hiScore.toString());
		}
		this.gameOverSound.play();
		window.dispatchEvent(new CustomEvent('phaser-game-over', {
			detail: { score: Math.floor(this.score) }
		}));
	};

	private formatScore(score: number): string {
		return score.toString().padStart(5, "0");
	}
}
