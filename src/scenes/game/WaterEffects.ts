import Phaser from "phaser";

export const WATER_TEXTURE_KEY = "waterDrop";
export const WATER_SPLASH_ANIM_KEY = "waterSplash";

export class WaterEffects {
  private readonly scene: Phaser.Scene;
  private readonly lastFrame: number;

  constructor(scene: Phaser.Scene, lastFrame: number) {
    this.scene = scene;
    this.lastFrame = lastFrame;
  }

  ensureAnimations(): void {
    if (this.scene.anims.exists(WATER_SPLASH_ANIM_KEY)) return;

    this.scene.anims.create({
      key: WATER_SPLASH_ANIM_KEY,
      frames: this.scene.anims.generateFrameNumbers(WATER_TEXTURE_KEY, {
        start: 0,
        end: this.lastFrame,
      }),
      frameRate: 16,
      repeat: 0,
    });
  }

  shoot(startX: number, startY: number, targetX: number, targetY: number): void {
    const frame = Phaser.Math.Between(0, this.lastFrame);
    const shot = this.scene.add.sprite(startX, startY, WATER_TEXTURE_KEY, frame);
    shot.setDepth(99);
    shot.setScale(0.045);
    shot.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
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

  playSplash(x: number, y: number, count = 14): void {
    for (let i = 0; i < count; i++) {
      const frame = Phaser.Math.Between(0, this.lastFrame);
      const drop = this.scene.add.sprite(x, y, WATER_TEXTURE_KEY, frame);
      drop.setDepth(100);
      drop.setBlendMode(Phaser.BlendModes.ADD);
      drop.setScale(Phaser.Math.FloatBetween(0.03, 0.06));
      drop.play(WATER_SPLASH_ANIM_KEY);

      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(200, 340));
      const speed = Phaser.Math.Between(80, 220);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const life = Phaser.Math.Between(220, 460);

      this.scene.tweens.add({
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
}
