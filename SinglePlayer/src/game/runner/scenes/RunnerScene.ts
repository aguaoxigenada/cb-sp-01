import { EventBus } from "@game/EventBus";
import { CBEventSource, EventTypes, ExternalMessage } from "@game/eventTypes";
import { GAMEPLAY, PLAYER_POSES, PlayerPose } from "@game/runner/constants";
import { ObstacleSpawner } from "@game/runner/ObstacleSpawner";
import { formatScore } from "@game/utils";
import Phaser from "phaser";
let hasStarted: boolean = false;
export default class RunnerScene extends Phaser.Scene {
	preload() {
		this.load.atlas("ui_elements", "assets/images/ui/elements.png", "assets/images/ui/elements.json");
		this.load.bitmapFont("font2bitmap", "assets/images/fonts/font2bitmap.png", "assets/images/fonts/font2bitmap.xml");
		for (let i = 1; i <= 8; i++) {
			this.load.image(`dino_run_${i}`, `assets/images/character/running/running${i}.png`);
			this.load.image(`dino_duck_${i}`, `assets/images/character/crouching/crouching${i}.png`);
			this.load.image(`dino_jump_${i}`, `assets/images/character/jump/jump${i}.png`);
		}
		for (let i = 1; i <= 7; i++) {
			this.load.image(`dino_death_${i}`, `assets/images/character/death/death${i}.png`);
		}
		this.load.image("groundHazard1", "assets/images/hazards/groundHazard1.png");
		this.load.image("groundHazard2", "assets/images/hazards/groundHazard2.png");
		this.load.image("flyingHazard1", "assets/images/hazards/flyingHazard1.png");
		this.load.image("flyingHazard11", "assets/images/hazards/flyingHazard11.png");
		this.load.image("flyingHazard12", "assets/images/hazards/flyingHazard12.png");

		this.load.image("parallax_bg", "assets/images/parallaxBackground1.png");
		this.load.image("parallax_bg2", "assets/images/parallaxBackground2.png");
		this.load.image("groundBackground", "assets/images/groundBackground.png");
		this.load.image("skyBackground", "assets/images/skyBackground.png");

		this.load.image("night_sky", "assets/images/night/skyBackground.png");
		this.load.image("night_parallax", "assets/images/night/parallaxBackground1.png");
		this.load.image("night_ground", "assets/images/night/groundBackground.png");

		this.load.image("title", "assets/images/ui/title.png");

		this.load.image("black_button_background", "assets/images/ui/black_button_background.png");
		this.load.image("black_panel", "assets/images/ui/black_panel.png");
		this.load.image("connect_wallet_icon", "assets/images/ui/connect_wallet_icon.png");
		this.load.image("loading_bars_icon", "assets/images/ui/loading_bars_icon.png");
		this.load.image("loading_icon", "assets/images/ui/loading_icon.png");
		this.load.image("play_again_icon", "assets/images/ui/play_again_icon.png");
		this.load.image("start_icon", "assets/images/ui/start_icon.png");
		this.load.image("white_button_background", "assets/images/ui/white_button_background.png");
		this.load.image("white_panel", "assets/images/ui/white_panel.png");
	}
	private player!: Phaser.Physics.Arcade.Sprite;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private obstacles!: Phaser.Physics.Arcade.Group;
	private spawner!: ObstacleSpawner;
	private score: number = 0;
	private scoreText!: Phaser.GameObjects.BitmapText;
	private gameSpeed: number = 120;
	private isGameOver: boolean = false;
	private isDucking: boolean = false;
	private obstacleTimer!: Phaser.Time.TimerEvent;
	private progressionTimer!: Phaser.Time.TimerEvent;
	private ground!: Phaser.GameObjects.TileSprite;
	private isGameStarted: boolean = false;
	private hiScore: number = 0;
	private hiScoreText!: Phaser.GameObjects.BitmapText;
	private milestoneCheckpoint: number = 0;
	private jumpSound!: Phaser.Sound.BaseSound;
	private scoreSound!: Phaser.Sound.BaseSound;
	private gameOverSound!: Phaser.Sound.BaseSound;
	private cursorUp!: Phaser.Input.Keyboard.Key;
	private cursorDown!: Phaser.Input.Keyboard.Key;
	private cursorSpace!: Phaser.Input.Keyboard.Key;
	private isJumping: boolean = false;
	private jumpHoldTime: number = 0;
	private maxJumpHold: number = GAMEPLAY.maxJumpHold;
	private elementScale: number = 1;
	private currentReward: number = 0;
	private hasNegativeFilter: boolean = false;
	private isNightMode: boolean = false;
	private isAuthenticated: boolean = false;
	private isAllowedToPlay: boolean = false;
	private baseFee: number = 200;
	private startButtonText: Phaser.GameObjects.Sprite | null = null;
	private startButtonSprite: Phaser.GameObjects.Sprite | null = null;
	private titleSprite: Phaser.GameObjects.Sprite | null = null;
	private feeText: Phaser.GameObjects.BitmapText | null = null;
	private feePanel: Phaser.GameObjects.Rectangle | null = null;

	private sky!: Phaser.GameObjects.TileSprite;
	private bg!: Phaser.GameObjects.TileSprite;
	constructor() {
		super("RunnerScene");
	}

	// Handles messages pushed in from the host page (wallet auth, balance unlock, rewards).
	private handleExternalMessage = (message: ExternalMessage) => {
		switch (message.type) {
			case EventTypes.EVENT_AUTHENTICATE:
				this.isAuthenticated = message.payload.isAuthenticated;
				this.refreshWalletConnection();

				if (this.cache.bitmapFont.exists("font2bitmap")) {
					this.refreshFeePanel();
				}
				break;

			case EventTypes.EVENT_UNLOCK_GAME:
				this.isAllowedToPlay = message.payload.isAllowedToPlay;
				this.baseFee = message.payload.baseFee || 200;
				if (this.isAllowedToPlay) {
					if (hasStarted) {
						this.scene.restart();
					} else {
						this.startGame();
					}
				}
				break;

			case EventTypes.EVENT_RECEIVE_REWARD:
				this.currentReward = message.payload.reward;
				this.currentContainer?.destroy();
				this.showRewardPopup();
				break;
		}
	};

	resizeGame() {
		this.cameras.main.setZoom(1);
	}

	create() {
		this.scale.on("resize", this.resizeGame, this);
		this.resizeGame();

		// Listen for host-page messages, and tear the listener down when the scene shuts down/restarts.
		EventBus.on(CBEventSource.EXTERNAL_MESSAGE, this.handleExternalMessage);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			EventBus.off(CBEventSource.EXTERNAL_MESSAGE, this.handleExternalMessage);
		});

		this.isNightMode = false;

		const { width, height } = this.scale;
		this.sky = this.add.tileSprite(0, 0, width, height, "skyBackground").setOrigin(0, 0).setScrollFactor(0);
		this.bg = this.add.tileSprite(0, 0, width, height, "parallax_bg").setOrigin(0, 0).setScrollFactor(0);

		this.ground = this.add.tileSprite(0, 0, width, height, "groundBackground").setOrigin(0, 0).setScrollFactor(0);

		this.physics.world.setBounds(0, 0, width, height);
		this.cursors = this.input.keyboard!.createCursorKeys();

		const { up, down, space } = this.cursors;
		this.cursorUp = up!;
		this.cursorDown = down!;
		this.cursorSpace = space!;

		this.isGameOver = false;
		this.isGameStarted = false;
		this.score = 0;
		this.physics.pause();
		this.gameSpeed = GAMEPLAY.startSpeed;

		const runFrames = [];
		for (let i = 1; i <= 8; i++) {
			runFrames.push({ key: `dino_run_${i}` });
		}
		this.anims.create({
			key: "run",
			frames: runFrames,
			frameRate: 10,
			repeat: -1,
		});

		const duckFrames = [];
		for (let i = 1; i <= 8; i++) {
			duckFrames.push({ key: `dino_duck_${i}` });
		}
		this.anims.create({
			key: "duck",
			frames: duckFrames,
			frameRate: 10,
			repeat: -1,
		});

		const deathFrames = [];
		for (let i = 1; i <= 8; i++) {
			deathFrames.push({ key: `dino_death_${i}` });
		}
		this.anims.create({
			key: "death",
			frames: deathFrames,
			frameRate: 10,
			repeat: 0,
		});

		const jumpUpFrames = [];
		for (let i = 1; i <= 5; i++) {
			jumpUpFrames.push({ key: `dino_jump_${i}` });
		}
		this.anims.create({
			key: "jump_up",
			frames: jumpUpFrames,
			frameRate: 10,
			repeat: 0,
		});

		const jumpDownFrames = [];
		for (let i = 6; i <= 8; i++) {
			jumpDownFrames.push({ key: `dino_jump_${i}` });
		}
		this.anims.create({
			key: "jump_down",
			frames: jumpDownFrames,
			frameRate: 10,
			repeat: 0,
		});
		this.anims.create({
			key: "flyingHazard_anim",
			frames: [{ key: "flyingHazard11" }, { key: "flyingHazard12" }],
			frameRate: 6,
			repeat: -1,
		});
		this.player = this.physics.add.sprite(50, 0, "dino_run_1");
		this.player.setOrigin(0.5, 1);
		this.player.setScale(this.elementScale);
		this.player.body.setSize(PLAYER_POSES.spawn.bodyWidth, PLAYER_POSES.spawn.bodyHeight);
		this.player.body.setOffset(PLAYER_POSES.spawn.offsetX, PLAYER_POSES.spawn.offsetY);
		this.player.setCollideWorldBounds(true);
		this.player.setGravityY(800);
		this.player.play("run");
		this.player.setDepth(10);

		// Ground platform (invisible)
		const groundHeight = 23;
		const groundY = height - groundHeight / 2;

		const ground = this.physics.add.staticGroup();
		ground
			.create(width / 2, groundY, "")
			.setDisplaySize(width, groundHeight)
			.setVisible(false)
			.refreshBody();

		this.jumpSound = this.sound.add("jumpSound", { volume: 0.1 });
		this.scoreSound = this.sound.add("scoreSound", { volume: 0.1 });
		this.gameOverSound = this.sound.add("gameOverSound", { volume: 0.1 });

		this.physics.add.collider(this.player, ground);

		// Obstacles group
		this.obstacles = this.physics.add.group({
			allowGravity: false,
			immovable: true,
		});
		this.spawner = new ObstacleSpawner(this, this.obstacles, () => ({
			speed: this.gameSpeed,
			score: this.score,
			negativeFilter: this.hasNegativeFilter,
		}));

		// Spawn obstacles on a loop; the progression timer tightens this delay over time.
		this.obstacleTimer = this.time.addEvent({
			delay: GAMEPLAY.spawnDelay,
			callback: () => this.spawner.spawn(),
			loop: true,
			paused: true,
		});

		// Ramp up speed and spawn rate on each progression tick.
		this.progressionTimer = this.time.addEvent({
			delay: GAMEPLAY.progressionInterval,
			paused: true,
			callback: () => {
				this.gameSpeed += GAMEPLAY.speedStep;
				const newDelay = Math.max(GAMEPLAY.minSpawnDelay, this.obstacleTimer.delay - GAMEPLAY.spawnDelayStep);
				this.obstacleTimer.remove(false);
				this.obstacleTimer = this.time.addEvent({
					delay: newDelay,
					callback: () => this.spawner.spawn(),
					loop: true,
				});
			},
			loop: true,
		});

		// Collision check
		this.physics.add.collider(this.player, this.obstacles, this.handleGameOver, undefined, this);

		this.input.on("pointerdown", () => {
			this.handleTouchInput();
		});

		this.input.on("pointerup", () => {
			this.isJumping = false;
		});

		this.refreshWalletConnection();
		this.showStartScreen();
	}

	/** Applies an animation and matching physics-body pose to the player in one call. */
	private setPlayerPose(anim: string, pose: PlayerPose): void {
		this.player.play(anim, true);
		this.player.setOrigin(0.5, 1);
		this.player.setScale(this.elementScale);
		const body = this.player.body as Phaser.Physics.Arcade.Body;
		body.setAllowGravity(true);
		body.setSize(pose.bodyWidth, pose.bodyHeight);
		body.setOffset(pose.offsetX, pose.offsetY);
	}

	update(time: number, delta: number) {
		if (this.isGameOver || !this.isGameStarted) return;

		if (this.bg) {
			this.bg.tilePositionX += this.gameSpeed * 0.3 * (delta / 1000);
		}
		this.sky.tilePositionX += this.gameSpeed * 0.1 * (delta / 1000);
		this.ground.tilePositionX += this.gameSpeed * (delta / 1000);
		// Start jump
		if (
			(Phaser.Input.Keyboard.JustDown(this.cursorSpace) || Phaser.Input.Keyboard.JustDown(this.cursorUp)) &&
			this.player.body?.touching.down &&
			!this.isDucking
		) {
			this.player.setVelocityY(GAMEPLAY.jumpVelocity);
			this.jumpSound.play();
			this.isJumping = true;
			this.jumpHoldTime = 0;
		}

		// While jump key is held, add velocity
		if (this.isJumping && (this.cursorSpace.isDown || this.cursorUp.isDown || this.input.activePointer.isDown)) {
			this.jumpHoldTime += delta;
			if (this.jumpHoldTime < this.maxJumpHold) {
				this.player.setVelocityY(this.player.body.velocity.y + GAMEPLAY.jumpHoldVelocity);
			} else {
				this.isJumping = false;
			}
		}

		if (Math.abs(this.player.body.velocity.y) > 1) {
			const anim = this.player.body.velocity.y < 0 ? "jump_up" : "jump_down";
			this.setPlayerPose(anim, PLAYER_POSES.upright);
		} else if (!this.isDucking) {
			this.setPlayerPose("run", PLAYER_POSES.upright);
		}

		// Stop jump when key is released
		if (Phaser.Input.Keyboard.JustUp(this.cursorSpace) || Phaser.Input.Keyboard.JustUp(this.cursorUp)) {
			this.isJumping = false;
		}

		if (Phaser.Input.Keyboard.JustDown(this.cursorDown) && !this.isDucking && this.player.body?.touching.down) {
			this.isDucking = true;
			this.setPlayerPose("duck", PLAYER_POSES.ducking);
		}

		// Stand (on key release)
		if (Phaser.Input.Keyboard.JustUp(this.cursorDown) && this.isDucking) {
			this.isDucking = false;
			this.setPlayerPose("run", PLAYER_POSES.upright);
		}
		// Update score
		this.score += delta * GAMEPLAY.scorePerMs;
		const currentRoundedScore = Math.floor(this.score);
		this.scoreText.setText(formatScore(currentRoundedScore));

		// Day/night cycling.
		const shouldBeNightMode = Math.floor(currentRoundedScore / GAMEPLAY.dayNightStep) % 2 === 1;
		if (shouldBeNightMode && !this.isNightMode) {
			this.switchToNightMode();
		} else if (!shouldBeNightMode && this.isNightMode) {
			this.switchToDayMode();
		}

		// Update milestone + blink
		if (currentRoundedScore >= this.milestoneCheckpoint + GAMEPLAY.milestoneStep) {
			this.milestoneCheckpoint += GAMEPLAY.milestoneStep;
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
			} else if (this.hasNegativeFilter && !obs.tintTopLeft) {
				obs.setTint(0x0000ff);
			}
			return null;
		});
	}

	private refreshWalletConnection() {
		this.rectangleWalletBg?.destroy();
		this.circleWalletStatus?.destroy();
		this.textWalletStatus?.destroy();
		this.showWalletConnection();
	}

	private rectangleWalletBg: Phaser.GameObjects.Rectangle | null = null;
	private circleWalletStatus: Phaser.GameObjects.Arc | null = null;
	private textWalletStatus: Phaser.GameObjects.Text | null = null;

	private showWalletConnection() {
		const text = this.isAuthenticated ? "CONNECTED" : "DISCONNECTED";
		const width = this.isAuthenticated ? 75 : 85;
		const scoreBgX = this.isAuthenticated ? 50 : 65;
		const offsetX = this.isAuthenticated ? 30 : 35;
		this.rectangleWalletBg = this.add
			.rectangle(scoreBgX, 18, width, 16, 0xffffff)
			.setOrigin(0.5, 0.5)
			.setDepth(1)
			.setStrokeStyle(1, 0x000000);

		this.circleWalletStatus = this.add
			.circle(scoreBgX - offsetX, 18, 3, this.isAuthenticated ? 0x00ff00 : 0xff0000)
			.setDepth(2);
		this.textWalletStatus = this.add
			.text(scoreBgX + 5, 18, text, {
				font: "9px font2bitmap",
				color: this.isAuthenticated ? "#00ff00" : "#ff0000",
				align: "right",
			})
			.setDepth(2)
			.setOrigin(0.5, 0.5);
	}

	private handleGameOver = () => {
		if (this.isGameOver) return;
		this.isGameOver = true;

		this.physics.pause();
		this.player.play("death", true);

		const { width, height } = this.scale;
		const scoreBgWidth = 180;
		const scoreBgHeight = 40;
		this.add
			.rectangle(width / 2 - scoreBgWidth / 2, height / 2 - scoreBgHeight / 2, scoreBgWidth, scoreBgHeight, 0xffffff, 1)
			.setOrigin(0, 0);

		if (this.score > this.hiScore) {
			this.hiScore = Math.floor(this.score);
			this.hiScoreText.setText(formatScore(this.hiScore));
			localStorage.setItem("hiScore", this.hiScore.toString());
		}
		this.gameOverSound.play();
		if (this.isAuthenticated && this.isAllowedToPlay) {
			// Send final score to the server:
			this.isAllowedToPlay = false;
			window.dispatchEvent(
				new CustomEvent(EventTypes.EVENT_GAME_OVER, {
					detail: { score: Math.floor(this.score) },
				}),
			);
			this.addLoadingSpinner();
		} else {
			this.showWalletPopup();
		}
	};

	private currentContainer?: Phaser.GameObjects.Container;

	private addLoadingSpinner() {
		// Create loading spinner with shapes
		const { width, height } = this.scale;

		// Add black background
		const loadingBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
		loadingBg.setDepth(25);

		const spinnerRadius = 20;
		this.currentContainer = this.add.container(width / 2, height / 2);
		this.currentContainer.setDepth(26);

		// Create dots around a circle
		const dots: Phaser.GameObjects.Arc[] = [];
		const numDots = 8;

		for (let i = 0; i < numDots; i++) {
			const angle = (i / numDots) * Math.PI * 2;
			const x = Math.cos(angle) * spinnerRadius;
			const y = Math.sin(angle) * spinnerRadius;

			const dot = this.add.circle(x, y, 3, 0xcacaca);
			dots.push(dot);
			this.currentContainer.add(dot);
		}

		// Animate the spinner
		this.tweens.add({
			targets: this.currentContainer,
			angle: 360,
			duration: 1000,
			repeat: -1,
			ease: "Linear",
		});

		// Fade in/out effect for dots
		dots.forEach((dot, index) => {
			this.tweens.add({
				targets: dot,
				alpha: { from: 0.3, to: 1 },
				duration: 150,
				delay: index * 125,
				yoyo: true,
				repeat: -1,
			});
		});
	}

	private showStartScreen(): void {
		if (hasStarted) {
			this.loadGame();
		} else {
			const { width, height } = this.scale;

			this.titleSprite = this.add
				.sprite(width / 2, height / 2 - 20, "title")
				.setOrigin(0.5)
				.setScale(0.27)
				.setDepth(9);
			this.startButtonSprite = this.add
				.sprite(width / 2, height / 2 + 20, "ui_elements", "white_panel")
				.setOrigin(0.5)
				.setScale(1.5, 1)
				.setInteractive({ useHandCursor: true })
				.setDepth(9);

			this.startButtonText = this.add
				.sprite(width / 2, height / 2 + 20, "ui_elements", "start_icon")
				.setOrigin(0.5)
				.setDepth(10);

			if (this.isAuthenticated) {
				this.refreshFeePanel();
			}

			this.startButtonSprite.on("pointerdown", async () => {
				if (this.isAuthenticated) {
					// Dispatch the event: event-check-balance
					// Check on the server if the player has enough balance to play
					// If the server response is affirmative, then set this.isAllowedToPlay to true
					// else show an error message : "Insufficient balance to play"
					window.dispatchEvent(new Event(EventTypes.EVENT_CHECK_BALANCE));
				} else {
					// Start Game as host
					this.startGame();
				}
			});
		}
	}

	private refreshFeePanel() {
		this.feePanel?.destroy();
		this.feeText?.destroy();
		if (this.isAuthenticated) {
			this.displayFeePanelStart();
		}
	}

	private displayFeePanelStart() {
		const feeBgX = this.isAuthenticated ? -10 : 0;
		this.feePanel = this.add
			.rectangle(23 + feeBgX, 40, 120, 15, 0xffffff)
			.setOrigin(0, 0.5)
			.setDepth(100)
			.setStrokeStyle(1, 0x000000);

		this.feeText = this.add
			.bitmapText(23 + feeBgX, 40, "font2bitmap", `Fee: ${this.baseFee} BST`, 10)
			.setOrigin(0, 0.5)
			.setDepth(10)
			.setLetterSpacing(0)
			.setTint(0x000000)
			.setDepth(100);
	}

	private displayFeePanelGameOver() {
		const { width, height } = this.scale;
		this.feePanel = this.add
			.rectangle(width / 2, height / 2 + 5, 120, 15, 0xffffff)
			.setOrigin(0.5)
			.setDepth(100);
		this.feeText = this.add
			.bitmapText(width / 2, height / 2 + 5, "font2bitmap", `Fee: ${this.baseFee} BST`, 10)
			.setOrigin(0.5, 0.5)
			.setDepth(10)
			.setLetterSpacing(0)
			.setTint(0x000000)
			.setDepth(100);
	}

	private loadGame(): void {
		const { width } = this.scale;
		this.add
			.sprite(width - 100, 18, "white_panel")
			.setOrigin(0.5, 0.5)
			.setDepth(1)
			.setScale(4, 1);

		// Score text (top-right)
		this.scoreText = this.add
			.bitmapText(width - 20, 13, "font2bitmap", formatScore(this.score), 10)
			.setOrigin(1, 0)
			.setDepth(2)
			.setTint(0x222222);

		// Load Hi Score from localStorage
		const highScore = localStorage.getItem("hiScore");
		this.hiScore = highScore ? parseInt(highScore, 10) : 0;
		this.milestoneCheckpoint = 0;

		this.add
			.bitmapText(width - 180, 13, "font2bitmap", "HI", 10)
			.setDepth(2)
			.setTint(0x666666);

		this.hiScoreText = this.add
			.bitmapText(width - 150, 13, "font2bitmap", formatScore(this.hiScore), 10)
			.setDepth(2)
			.setTint(0x222222);

		this.isGameStarted = true;
		this.physics.resume();
		this.obstacleTimer.paused = false;
		this.progressionTimer.paused = false;
	}

	private startGame(): void {
		hasStarted = true;
		this.startButtonSprite?.destroy();
		this.startButtonText?.destroy();
		this.titleSprite?.destroy();
		this.feePanel?.destroy();
		this.feeText?.destroy();
		this.loadGame();
	}

	private showWalletPopup(): void {
		this.obstacleTimer.paused = true;
		this.progressionTimer.paused = true;
		const { width, height } = this.scale;

		const popupWidth = 300;
		const popupHeight = 150;
		const y = height / 2 - popupHeight / 2;

		this.add
			.sprite(width / 2, height / 2, "ui_elements", "black_panel")
			.setScale(5, 4)
			.setOrigin(0.5, 0.5)
			.setDepth(20);

		this.add
			.bitmapText(
				width / 2,
				height / 2 - 20,
				"font2bitmap",
				"You could have\n earned BST tokens!\nDon't miss the \nopportunity again!",
				10,
				1,
			)
			.setOrigin(0.5, 0.5)
			.setDepth(21)
			.setTint(0xffffff);

		const popUpStartX = width / 2 - popupWidth / 2;

		const offsetX = 95;

		const connectButton = this.add
			.sprite(popUpStartX + offsetX, y + popupHeight - 50, "ui_elements", "white_panel")
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true })
			.setScale(1.95, 1.2)
			.setDepth(21);

		this.add
			.sprite(popUpStartX + offsetX, y + popupHeight - 45, "connect_wallet_icon")
			.setOrigin(0.5)
			.setDepth(22);

		const playAgainButton = this.add
			.sprite(popUpStartX + popupWidth - offsetX, y + popupHeight - 50, "ui_elements", "white_panel")
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true })
			.setScale(1.95, 1.2)
			.setDepth(21);

		this.add
			.sprite(popUpStartX + popupWidth - offsetX, y + popupHeight - 50, "ui_elements", "play_again_icon")
			.setOrigin(0.5)
			.setDepth(32);

		connectButton.on("pointerdown", () => {
			// Dispatch event to login into the web3 wallet
			window.dispatchEvent(new Event(EventTypes.EVENT_CONNECT_WALLET));
		});

		playAgainButton.on("pointerdown", () => {
			// Restart the game
			this.scene.restart();
		});
	}

	private showRewardPopup(): void {
		const { width, height } = this.scale;

		const popupHeight = 150;
		const y = height / 2 - popupHeight / 2;

		this.add
			.sprite(width / 2, height / 2, "ui_elements", "black_panel")
			.setScale(5, 4.25)
			.setOrigin(0.5, 0.5)
			.setDepth(30);
		this.add
			.bitmapText(
				width / 2,
				height / 2 - 20,
				"font2bitmap",
				"Perfect! We have\nsent you " + Math.floor(this.currentReward) + " BST!",
				10,
				1,
			)
			.setOrigin(0.5, 0.5)
			.setDepth(31)
			.setTint(0xffffff);

		const resetButton = this.add
			.sprite(width / 2, y + popupHeight - 40, "ui_elements", "white_panel")
			.setOrigin(0.5)
			.setScale(1.8, 1.2)
			.setInteractive({ useHandCursor: true })
			.setDepth(31);

		this.add
			.sprite(width / 2, y + popupHeight - 40, "ui_elements", "play_again_icon")
			.setOrigin(0.5)
			.setDepth(32);

		this.displayFeePanelGameOver();

		resetButton.on("pointerdown", () => {
			this.obstacleTimer.paused = false;
			this.progressionTimer.paused = false;

			if (this.isAuthenticated) {
				// Dispatch the event: event-check-balance
				// Check on the server if the player has enough balance to play
				// If the server response is affirmative, then set this.isAllowedToPlay to true
				// else show an error message : "Insufficient balance to play"
				window.dispatchEvent(new Event(EventTypes.EVENT_CHECK_BALANCE));
			} else {
				// Start Game as host
				this.scene.restart();
			}
		});
	}

	private handleTouchInput(): void {
		if (this.isGameOver || !this.isGameStarted) return;

		if (this.player.body?.touching.down && !this.isDucking) {
			this.player.setVelocityY(GAMEPLAY.touchJumpVelocity);
			this.jumpSound.play();
			this.isJumping = true;
			this.jumpHoldTime = 0;
		}
	}

	private switchToNightMode(): void {
		if (this.isNightMode) return;

		this.cameras.main.flash(300, 255, 255, 255);

		this.sky.setTexture("night_sky");
		this.bg.setTexture("night_parallax");
		this.ground.setTexture("night_ground");

		this.isNightMode = true;
	}

	private switchToDayMode(): void {
		if (!this.isNightMode) return;

		this.cameras.main.flash(300, 255, 255, 255);

		this.sky.setTexture("skyBackground");
		this.bg.setTexture("parallax_bg");
		this.ground.setTexture("groundBackground");

		this.isNightMode = false;
	}
}
