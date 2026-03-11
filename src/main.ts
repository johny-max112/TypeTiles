import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import "./style.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true,
  parent: "app",
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

new Phaser.Game(config);