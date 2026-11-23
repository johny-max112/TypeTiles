import Phaser from "phaser";

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly pauseButton: Phaser.GameObjects.Container;
  private readonly pauseModal: Phaser.GameObjects.Container;
  private readonly isSolo: boolean;
  private readonly onRestart: () => void;
  private readonly onExit: () => void;
  private readonly onPauseChange: (paused: boolean) => void;

  private paused = false;

  constructor(scene: Phaser.Scene, options: { isSolo: boolean; onRestart: () => void; onExit: () => void; onPauseChange?: (paused: boolean) => void }) {
    this.scene = scene;
    this.isSolo = options.isSolo;
    this.onRestart = options.onRestart;
    this.onExit = options.onExit;
    this.onPauseChange = options.onPauseChange ?? (() => {});

    const btnBg = this.scene.add
      .rectangle(0, 0, 86, 32, 0x101820, 0.85)
      .setStrokeStyle(2, 0x66ccff, 1)
      .setInteractive({ useHandCursor: true });
    const btnText = this.scene.add
      .text(0, 0, "Pause", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.pauseButton = this.scene.add
      .container(this.scene.scale.width - 58, 28, [btnBg, btnText])
      .setDepth(20);
    btnBg.on("pointerup", () => this.open());

    const backdrop = this.scene.add
      .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive();

    const panelHeight = this.isSolo ? 258 : 150;
    const panel = this.scene.add
      .rectangle(0, 0, 300, panelHeight, 0x0f1620, 0.95)
      .setStrokeStyle(3, 0x66ccff, 1)
      .setOrigin(0.5);

    const title = this.scene.add
      .text(0, this.isSolo ? -88 : -40, "Paused", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const modalChildren: Phaser.GameObjects.GameObject[] = [backdrop, panel, title];
    const actions = this.isSolo
      ? [
          { label: "Resume", y: -30, action: () => this.close() },
          { label: "Restart", y: 26, action: this.onRestart },
          { label: "Exit", y: 82, action: this.onExit },
        ]
      : [{ label: "Resume", y: 20, action: () => this.close() }];

    for (const { label, y, action } of actions) {
      const button = this.scene.add
        .rectangle(0, y, 172, 40, 0x1f7acc, 1)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setInteractive({ useHandCursor: true });
      const text = this.scene.add
        .text(0, y, label, {
          fontFamily: "monospace",
          fontSize: "19px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      button.on("pointerup", action);
      modalChildren.push(button, text);
    }

    this.pauseModal = this.scene.add
      .container(0, 0, modalChildren)
      .setDepth(200)
      .setVisible(false);

    this.layout(this.scene.scale.width, this.scene.scale.height);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  layout(width: number, height: number): void {
    this.pauseButton.setPosition(width - 58, 28);
    this.pauseModal.setPosition(width / 2, height / 2);

    const backdrop = this.pauseModal.list[0] as Phaser.GameObjects.Rectangle;
    backdrop.setSize(width, height);
    backdrop.setPosition(-width / 2, -height / 2);
  }

  toggle(): void {
    if (this.paused) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.paused) return;

    this.paused = true;
    this.pauseModal.setVisible(true);
    this.scene.tweens.pauseAll();
    this.onPauseChange(true);
  }

  close(): void {
    if (!this.paused) return;

    this.paused = false;
    this.pauseModal.setVisible(false);
    this.scene.tweens.resumeAll();
    this.onPauseChange(false);
  }
}
