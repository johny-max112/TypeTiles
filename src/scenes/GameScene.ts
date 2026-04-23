import Phaser from "phaser";
import { WORDS } from "../words";
import { PauseMenu } from "./game/PauseMenu";
import { getLaneX, pickLaneNotSame, type Lane } from "./game/lanes";
import { WaterEffects, WATER_TEXTURE_KEY } from "./game/WaterEffects";
import { WordTarget } from "./game/WordTarget";

export default class GameScene extends Phaser.Scene {
  private readonly WATER_FRAME_SIZE = 1000;
  private readonly WATER_LAST_FRAME = 3;

  // === TUNING ===
  private readonly WORD_FONT_SIZE = 22;
  private readonly TYPED_FONT_SIZE = 22;
  private readonly TILE_HEIGHT = 52;
  private readonly TILE_PADDING_X = 50;
  private readonly fallSpeedPxPerSec = 75;
  // ==============

  private typedDisplay!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private pauseMenu!: PauseMenu;
  private wordTarget!: WordTarget;
  private waterEffects!: WaterEffects;

  private activeWord = "";
  private typedText = "";
  private score = 0;
  private wordX = 0;
  private wordY = 60;
  private lastLane: Lane = "center";

  constructor() {
    super("GameScene");
  }

  preload(): void {
    // Background gif is rendered by CSS so it stays animated.
    this.load.spritesheet(WATER_TEXTURE_KEY, new URL("../assets/waterdrop.jpg", import.meta.url).href, {
      frameWidth: this.WATER_FRAME_SIZE,
      frameHeight: this.WATER_FRAME_SIZE,
    });
  }

  create(): void {
    this.hudText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 },
      })
      .setDepth(10);

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

    this.pauseMenu = new PauseMenu(this);
    this.waterEffects = new WaterEffects(this, this.WATER_LAST_FRAME);
    this.waterEffects.ensureAnimations();

    this.wordTarget = new WordTarget(this, {
      wordFontSize: this.WORD_FONT_SIZE,
      tileHeight: this.TILE_HEIGHT,
      tilePaddingX: this.TILE_PADDING_X,
    });

    this.spawnWord();
    this.updateHud();

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.pauseMenu.toggle();
        return;
      }

      this.handleTyping(event.key);
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.typedDisplay.setPosition(gameSize.width / 2, gameSize.height - 80);
      this.pauseMenu.layout(gameSize.width, gameSize.height);

      this.wordX = getLaneX(gameSize.width, this.lastLane);
      this.wordTarget.setPosition(this.wordX, this.wordY);
    });
  }

  update(_: number, delta: number): void {
    if (this.pauseMenu.isPaused) return;

    const dt = delta / 1000;
    this.wordY += this.fallSpeedPxPerSec * dt;
    this.wordTarget.setPosition(this.wordX, this.wordY);

    const bottomLimit = this.scale.height - 120;
    if (this.wordY >= bottomLimit) {
      this.onMissBottom();
    }
  }

  private spawnWord(): void {
    const index = Phaser.Math.Between(0, WORDS.length - 1);
    this.activeWord = WORDS[index];

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");

    this.wordY = 60;

    const lane = pickLaneNotSame(this.lastLane);
    this.lastLane = lane;
    this.wordX = getLaneX(this.scale.width, lane);

    this.wordTarget.setWord(this.activeWord, this.wordX, this.wordY);
  }

  private handleTyping(key: string): void {
    if (this.pauseMenu.isPaused) return;

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

    this.waterEffects.shoot(this.typedDisplay.x, this.typedDisplay.y - 8, this.wordX, this.wordY);

    this.typedText += key;
    this.typedDisplay.setText(this.typedText);

    if (this.activeWord.toLowerCase().startsWith(this.typedText.toLowerCase())) {
      this.typedDisplay.setColor("#00ff00");
      this.refreshWordSplit();

      if (this.typedText.toLowerCase() === this.activeWord.toLowerCase()) {
        this.waterEffects.playSplash(this.wordX, this.wordY, 22);

        this.score += 10;
        this.updateHud();
        this.spawnWord();
      }
    } else {
      this.onWrongKey();
    }
  }

  private refreshWordSplit(): void {
    this.wordTarget.setTypedText(this.typedText);

    if (this.typedText.length === 0) {
      this.typedDisplay.setColor("#ffff00");
    }
  }

  private onWrongKey(): void {
    this.score -= 2;
    this.updateHud();

    this.cameras.main.shake(80, 0.003);

    this.typedText = "";
    this.typedDisplay.setText("");
    this.typedDisplay.setColor("#ffff00");
    this.wordTarget.resetToFullWord();
  }

  private onMissBottom(): void {
    this.score -= 5;
    this.updateHud();

    this.cameras.main.shake(120, 0.004);
    this.spawnWord();
  }

  private updateHud(): void {
    this.hudText.setText(`Score: ${this.score}`);
  }
}