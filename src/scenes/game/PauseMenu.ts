import Phaser from "phaser";

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly pauseButton: Phaser.GameObjects.Container;
  private readonly pauseModal: Phaser.GameObjects.Container;

  private paused = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

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

    const panel = this.scene.add
      .rectangle(0, 0, 360, 220, 0x0f1620, 0.95)
      .setStrokeStyle(3, 0x66ccff, 1)
      .setOrigin(0.5);

    const title = this.scene.add
      .text(0, -46, "Paused", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hint = this.scene.add
      .text(0, -10, "Press ESC or click Resume", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#99ccee",
      })
      .setOrigin(0.5);

    const resumeBg = this.scene.add
      .rectangle(0, 50, 150, 44, 0x1f7acc, 1)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const resumeText = this.scene.add
      .text(0, 50, "Resume", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.pauseModal = this.scene.add
      .container(0, 0, [backdrop, panel, title, hint, resumeBg, resumeText])
      .setDepth(200)
      .setVisible(false);

    resumeBg.on("pointerup", () => this.close());

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
  }

  close(): void {
    if (!this.paused) return;

    this.paused = false;
    this.pauseModal.setVisible(false);
    this.scene.tweens.resumeAll();
  }
}
