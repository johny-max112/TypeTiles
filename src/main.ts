import Phaser from "phaser"
import GameScene from "./scenes/GameScene"

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#1d1d1d",
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.RESIZE
    },
    parent: "app"
}

new Phaser.Game(config)