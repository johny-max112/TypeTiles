import Phaser from "phaser";
import { WORDS } from "../words";

type Lane = "left" | "center" | "right";

export default class GameScene extends Phaser.Scene {
  private readonly WATER_FRAME_SIZE = 1000;
  private readonly WATER_LAST_FRAME = 3;

  // === TUNING ===
  private WORD_FONT_SIZE = 22;
  private TYPED_FONT_SIZE = 22;

  private TILE_HEIGHT = 52;
  private TILE_PADDING_X = 50;

  private fallSpeedPxPerSec = 75;
  // ==============

  // back to rectangle (no wordbox.jpg)
  private wordBlock!: Phaser.GameObjects.Rectangle;
  private wordTextTyped!: Phaser.GameObjects.Text;
  private wordTextRemaining!: Phaser.GameObjects.Text;

  private typedDisplay!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseModal!: Phaser.GameObjects.Container;

  private isPaused = false;

  private activeWord = "";
  private typedText = "";

  private score = 0;

  private wordX = 0;
  private wordY = 60;

  private lastLane: Lane = "center";

  constructor() {
    super("GameScene");
  }

  preload() {
    // Background gif is rendered by CSS so it stays animated
    this.load.spritesheet("waterDrop", new URL("../assets/waterdrop.jpg", import.meta.url).href, {
      frameWidth: this.WATER_FRAME_SIZE,
      frameHeight: this.WATER_FRAME_SIZE,
    });
  }

  create() {
    // HUD
    this.hudText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 },
      })
      .setDepth(10);

    // Typed display
    this.typedDisplay = this.add
      .text(this.scale.width / 2, this.scale.height - 80, "", {
        fontFamily: "monospace",
        fontSize: `${this.TYPED_FONT_SIZE}px`,
        color: "#ffff00",
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.createPauseUi();

    if (!this.anims.exists("waterSplash")) {
      this.anims.create({
        key: "waterSplash",
        frames: this.anims.generateFrameNumbers("waterDrop", {
          start: 0,
          end: this.WATER_LAST_FRAME,
        }),
        frameRate: 16,
        repeat: 0,
      });
    }

    // Create visuals
    this.createWordObjects();

    // First word
    this.spawnWord();
    this.updateHud();

    // Input
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.togglePauseMenu();
        return;
      }

      this.handleTyping(event.key);
    });

    // Resize
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.typedDisplay.setPosition(gameSize.width / 2, gameSize.height - 80);
      this.layoutPauseUi(gameSize.width, gameSize.height);

      this.wordX = this.getLaneX(this.lastLane);
      this.setWordPosition(this.wordX, this.wordY);
    });
  }

  update(_: number, delta: number) {
    if (this.isPaused) return;

    const dt = delta / 1000;

    this.wordY += this.fallSpeedPxPerSec * dt;
    this.setWordPosition(this.wordX, this.wordY);

    const bottomLimit = this.scale.height - 120;
    if (this.wordY >= bottomLimit) {
      this.onMissBottom();
    }
  }

  private createWordObjects() {
    this.wordBlock = this.add.rectangle(0, this.wordY, 180, this.TILE_HEIGHT, 0x222222, 1.0);
    this.wordBlock.setStrokeStyle(2, 0x00ff66, 1.0);

    this.wordTextTyped = this.add
      .text(0, this.wordY, "", {
        fontFamily: "monospace",
        fontSize: `${this.WORD_FONT_SIZE}px`,
        color: "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.wordTextRemaining = this.add
      .text(0, this.wordY, "", {
        fontFamily: "monospace",
        fontSize: `${this.WORD_FONT_SIZE}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private spawnWord() {
    const index = Phaser.Math.Between(0, WORDS.length - 1);
    this.activeWord = WORDS[index];

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");

    this.wordY = 60;

    const lane = this.pickLaneNotSame(this.lastLane);
    this.lastLane = lane;
    this.wordX = this.getLaneX(lane);

    this.wordTextTyped.setText("");
    this.wordTextRemaining.setText(this.activeWord);

    // Resize box to the real rendered text size so long words stay inside
    const textWidth = this.wordTextRemaining.width;
    const textHeight = this.wordTextRemaining.height;
    this.wordBlock.width = Math.max(150, Math.ceil(textWidth + this.TILE_PADDING_X));
    this.wordBlock.height = Math.max(this.TILE_HEIGHT, Math.ceil(textHeight + 20));

    this.setWordPosition(this.wordX, this.wordY);
  }

  private pickLaneNotSame(last: Lane): Lane {
    const lanes: Lane[] = ["left", "center", "right"];
    const choices = lanes.filter((l) => l !== last);
    return Phaser.Utils.Array.GetRandom(choices);
  }

  private getLaneX(lane: Lane) {
    const w = this.scale.width;
    const left = Math.max(170, w * 0.25);
    const center = w * 0.5;
    const right = Math.min(w - 170, w * 0.75);
    return lane === "left" ? left : lane === "right" ? right : center;
  }

  private setWordPosition(x: number, y: number) {
    this.wordBlock.setPosition(x, y);
    this.layoutWordParts(x, y);
  }

  private layoutWordParts(x: number, y: number) {
    const typedWidth = this.wordTextTyped.width;
    const remainingWidth = this.wordTextRemaining.width;
    const totalWidth = typedWidth + remainingWidth;

    const startX = x - totalWidth / 2;

    this.wordTextTyped.setPosition(startX, y);
    this.wordTextRemaining.setPosition(startX + typedWidth, y);
  }

  private handleTyping(key: string) {
    if (this.isPaused) return;

    if (key === "Backspace") {
      if (this.typedText.length > 0) {
        this.typedText = this.typedText.slice(0, -1);
        this.typedDisplay.setText(this.typedText);
        this.refreshWordSplit();
      }
      return;
    }

    const specialKeys = [
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "CapsLock",
      "Tab",
      "Enter",
      "Escape",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];
    if (specialKeys.includes(key)) return;
    if (key.length !== 1) return;

    // Fire a water shot for every typed character.
    this.shootWaterAtWord();

    this.typedText += key;
    this.typedDisplay.setText(this.typedText);

    if (this.activeWord.toLowerCase().startsWith(this.typedText.toLowerCase())) {
      this.typedDisplay.setColor("#00ff00");
      this.refreshWordSplit();

      if (this.typedText.toLowerCase() === this.activeWord.toLowerCase()) {
        // Bigger burst when the full word is completed.
        this.playSplash(this.wordX, this.wordY, 22);

        this.score += 10;
        this.updateHud();
        this.spawnWord();
      }
    } else {
      this.onWrongKey();
    }
  }

  private refreshWordSplit() {
    const typedPart = this.activeWord.substring(0, this.typedText.length);
    const remainingPart = this.activeWord.substring(this.typedText.length);

    this.wordTextTyped.setText(typedPart);
    this.wordTextRemaining.setText(remainingPart);

    if (this.typedText.length === 0) {
      this.typedDisplay.setColor("#ffff00");
    }
  }

  private onWrongKey() {
    this.score -= 2;
    this.updateHud();

    this.cameras.main.shake(80, 0.003);

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");
    this.wordTextTyped.setText("");
    this.wordTextRemaining.setText(this.activeWord);
  }

  private shootWaterAtWord() {
    const startX = this.typedDisplay.x;
    const startY = this.typedDisplay.y - 8;
    const targetX = this.wordX;
    const targetY = this.wordY;

    const frame = Phaser.Math.Between(0, this.WATER_LAST_FRAME);
    const shot = this.add.sprite(startX, startY, "waterDrop", frame);
    shot.setDepth(99);
    shot.setScale(0.045);
    shot.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: shot,
      x: targetX,
      y: targetY,
      duration: 110,
      ease: "Sine.easeIn",
      onComplete: () => {
        shot.destroy();
        this.playSplash(targetX, targetY, 8);
      },
    });
  }

  private playSplash(x: number, y: number, count = 14) {

    for (let i = 0; i < count; i++) {
      const frame = Phaser.Math.Between(0, this.WATER_LAST_FRAME);
      const drop = this.add.sprite(x, y, "waterDrop", frame);
      drop.setDepth(100);
      drop.setBlendMode(Phaser.BlendModes.ADD);
      drop.setScale(Phaser.Math.FloatBetween(0.03, 0.06));
      drop.play("waterSplash");

      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(200, 340));
      const speed = Phaser.Math.Between(80, 220);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const life = Phaser.Math.Between(220, 460);

      this.tweens.add({
        targets: drop,
        x: x + dx * (life / 1000),
        y: y + dy * (life / 1000) + 0.5 * 420 * Math.pow(life / 1000, 2),
        alpha: 0,
        duration: life,
        ease: "Quad.easeOut",
        onComplete: () => drop.destroy(),
      });
    }
  }

  private onMissBottom() {
    this.score -= 5;
    this.updateHud();

    this.cameras.main.shake(120, 0.004);

    this.spawnWord();
  }

  private updateHud() {
    this.hudText.setText(`Score: ${this.score}`);
  }

  private createPauseUi() {
    const btnBg = this.add
      .rectangle(0, 0, 86, 32, 0x101820, 0.85)
      .setStrokeStyle(2, 0x66ccff, 1)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add
      .text(0, 0, "Pause", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.pauseButton = this.add.container(this.scale.width - 58, 28, [btnBg, btnText]).setDepth(20);
    btnBg.on("pointerup", () => this.openPauseMenu());

    const backdrop = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive();

    const panel = this.add
      .rectangle(0, 0, 360, 220, 0x0f1620, 0.95)
      .setStrokeStyle(3, 0x66ccff, 1)
      .setOrigin(0.5);

    const title = this.add
      .text(0, -46, "Paused", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(0, -10, "Press ESC or click Resume", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#99ccee",
      })
      .setOrigin(0.5);

    const resumeBg = this.add
      .rectangle(0, 50, 150, 44, 0x1f7acc, 1)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const resumeText = this.add
      .text(0, 50, "Resume", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.pauseModal = this.add
      .container(0, 0, [backdrop, panel, title, hint, resumeBg, resumeText])
      .setDepth(200)
      .setVisible(false);

    resumeBg.on("pointerup", () => this.closePauseMenu());

    this.layoutPauseUi(this.scale.width, this.scale.height);
  }

  private layoutPauseUi(width: number, height: number) {
    this.pauseButton.setPosition(width - 58, 28);
    this.pauseModal.setPosition(width / 2, height / 2);

    const backdrop = this.pauseModal.list[0] as Phaser.GameObjects.Rectangle;
    backdrop.setSize(width, height);
    backdrop.setPosition(-width / 2, -height / 2);
  }

  private togglePauseMenu() {
    if (this.isPaused) {
      this.closePauseMenu();
    } else {
      this.openPauseMenu();
    }
  }

  private openPauseMenu() {
    if (this.isPaused) return;

    this.isPaused = true;
    this.pauseModal.setVisible(true);
    this.tweens.pauseAll();
  }

  private closePauseMenu() {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.pauseModal.setVisible(false);
    this.tweens.resumeAll();
  }
}