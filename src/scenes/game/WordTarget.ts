import Phaser from "phaser";

type WordTargetOptions = {
  wordFontSize: number;
  tileHeight: number;
  tilePaddingX: number;
};

export class WordTarget {
  private readonly scene: Phaser.Scene;
  private readonly tileHeight: number;
  private readonly tilePaddingX: number;
  private readonly shadowOffset = 3;

  private readonly wordShadow: Phaser.GameObjects.Rectangle;
  private readonly wordBlock: Phaser.GameObjects.Rectangle;
  private readonly wordTextTyped: Phaser.GameObjects.Text;
  private readonly wordTextRemaining: Phaser.GameObjects.Text;

  private activeWord = "";

  constructor(scene: Phaser.Scene, options: WordTargetOptions) {
    this.scene = scene;
    this.tileHeight = options.tileHeight;
    this.tilePaddingX = options.tilePaddingX;

    this.wordShadow = this.scene.add.rectangle(0, 60, 180, this.tileHeight, 0x000000, 0.38);
    this.wordShadow.setDepth(1);

    this.wordBlock = this.scene.add.rectangle(0, 60, 180, this.tileHeight, 0x222222, 1.0);
    this.wordBlock.setStrokeStyle(2, 0x00ff66, 1.0);
    this.wordBlock.setDepth(2);

    this.wordTextTyped = this.scene.add
      .text(0, 60, "", {
        fontFamily: "monospace",
        fontSize: `${options.wordFontSize}px`,
        color: "#00ff00",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(3);

    this.wordTextRemaining = this.scene.add
      .text(0, 60, "", {
        fontFamily: "monospace",
        fontSize: `${options.wordFontSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(3);
  }

  setWord(word: string, x: number, y: number): void {
    this.activeWord = word;

    this.wordTextTyped.setText("");
    this.wordTextRemaining.setText(word);

    const textWidth = this.wordTextRemaining.width;
    const textHeight = this.wordTextRemaining.height;
    const blockWidth = Math.max(150, Math.ceil(textWidth + this.tilePaddingX));
    const blockHeight = Math.max(this.tileHeight, Math.ceil(textHeight + 20));

    this.wordBlock.setSize(blockWidth, blockHeight);
    this.wordShadow.setSize(blockWidth, blockHeight);

    this.setPosition(x, y);
  }

  setTypedText(typedText: string): void {
    const typedPart = this.activeWord.substring(0, typedText.length);
    const remainingPart = this.activeWord.substring(typedText.length);

    this.wordTextTyped.setText(typedPart);
    this.wordTextRemaining.setText(remainingPart);

    this.layoutWordParts(this.wordBlock.x, this.wordBlock.y);
  }

  resetToFullWord(): void {
    this.wordTextTyped.setText("");
    this.wordTextRemaining.setText(this.activeWord);
    this.layoutWordParts(this.wordBlock.x, this.wordBlock.y);
  }

  setPosition(x: number, y: number): void {
    const snappedX = Math.round(x);
    const snappedY = Math.round(y);

    this.wordBlock.setPosition(snappedX, snappedY);
    this.wordShadow.setPosition(snappedX + this.shadowOffset, snappedY + this.shadowOffset);
    this.layoutWordParts(snappedX, snappedY);
  }

  private layoutWordParts(x: number, y: number): void {
    const typedWidth = this.wordTextTyped.width;
    const remainingWidth = this.wordTextRemaining.width;
    const totalWidth = typedWidth + remainingWidth;

    const startX = x - totalWidth / 2;

    this.wordTextTyped.setPosition(startX, y);
    this.wordTextRemaining.setPosition(startX + typedWidth, y);
  }
}
