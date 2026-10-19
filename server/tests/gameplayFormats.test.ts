import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { validateClassroomConfig, createClassroomSequence } from "../src/classroomConfig.js";
import { SENTENCE_BANK } from "../src/sentenceBank.js";

// Exercise the real shared scene logic without requiring a browser/WebGL renderer.
// esbuild is already supplied by Vite/tsx; no dependency is added.
async function loadGameplay(dev: boolean) {
  const result = await build({
    stdin: {
      contents: 'export {default as GameScene} from "./src/scenes/GameScene"; export {WordTarget} from "./src/scenes/game/WordTarget";',
      resolveDir: fileURLToPath(new URL("../../", import.meta.url)), loader: "ts",
    },
    bundle: true, write: false, format: "esm", platform: "node", loader: { ".png": "dataurl" },
    define: {
      "import.meta.env.DEV": String(dev), "import.meta.env.VITE_DEV_GREGG_CATEGORY_CROPS": "undefined",
      "window.location.hostname": '"localhost"',
    },
    plugins: [{ name: "headless-phaser", setup(builder) {
      builder.onResolve({ filter: /^phaser$/ }, () => ({ path: "phaser", namespace: "stub" }));
      builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: `export default {
        Scene: class {}, Math: { Between: min => min, Clamp: (value,min,max) => Math.max(min,Math.min(max,value)) },
        Utils: { Array: { GetRandom: array => array[0] } }
      };` }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

function stubObject(): any {
  const object: any = { width: 200, height: 40, text: "", visible: true };
  for (const method of ["setColor", "setPosition", "setSize", "setOrigin", "setDepth", "setFontSize", "setWordWrapWidth", "setDisplaySize", "setTexture", "setScale"]) {
    object[method] = () => object;
  }
  object.setText = (text: string) => { object.text = text; return object; };
  object.setVisible = (visible: boolean) => { object.visible = visible; return object; };
  return object;
}

function prepareScene(scene: any) {
  scene.scale = { width: 1024, height: 800 };
  scene.typedDisplay = stubObject(); scene.pauseMenu = { isPaused: false };
  scene.waterEffects = { shoot() {}, playSplash() {} };
  scene.textures = { exists: () => true };
  scene.greggPlayBottom = 700;
  scene.wordTarget = { height: 40, width: 300, setWord() {}, setSentence() {}, setPosition() {}, setTypedText() {},
    setSoloGreggImage: () => true, setSoloGreggCrop: () => true };
  scene.updateHud = () => {};
}

test("shared Phaser engine: Solo/classroom text formats, server sequence, typing and existing difficulty speeds", async () => {
  const { GameScene } = await loadGameplay(false);
  for (const wordSet of Object.keys(SENTENCE_BANK)) for (const [difficulty, speed] of [["Easy", 55], ["Normal", 75], ["Hard", 105]] as const) {
    for (const practiceFormat of ["word-phrase", "full-sentence"] as const) for (const mode of ["solo", "multiplayer"]) {
      const config = validateClassroomConfig({ wordSet, practiceFormat, difficulty, roundTime: 30 });
      const sequence = createClassroomSequence(config);
      const scene = new GameScene(); scene.init({ mode, matchConfig: config, wordSequence: sequence });
      assert.equal(scene.isSentenceGameplay, practiceFormat === "full-sentence");
      assert.equal(scene.isGreggGameplay, false);
      assert.equal(scene.fallSpeedPxPerSec, speed * (practiceFormat === "full-sentence" ? 0.5 : 1));
      prepareScene(scene); scene.spawnWord();
      if (mode === "multiplayer") assert.equal(scene.activeWord, sequence[0]);
      const answer = scene.activeWord;
      for (const character of answer.toUpperCase()) scene.handleTyping(character);
      assert.equal(scene.completedWords, 1); assert.equal(scene.score, 10);
      assert.equal(scene.incorrectKeystrokes, 0); // Includes spaces/punctuation for sentence answers.
      if (mode === "multiplayer") assert.equal(scene.activeWord, sequence[1]);
    }
  }
});

test("shared Gregg engine preserves original 6–10 order, slower sentences, hidden captions and Solo-only crop preview", async () => {
  const production = await loadGameplay(false);
  const development = await loadGameplay(true);
  for (const { GameScene } of [production, development]) for (const mode of ["solo", "multiplayer"]) {
    for (const [difficulty, speed] of [["Easy", 55], ["Normal", 75], ["Hard", 105]] as const) {
      const config = validateClassroomConfig({ wordSet: "Stenography", practiceFormat: "full-sentence", difficulty, roundTime: 30 });
      const scene = new GameScene(); scene.init({ mode, matchConfig: config, wordSequence: createClassroomSequence(config) });
      assert.equal(scene.isGreggGameplay, true); assert.equal(scene.isGreggCropPilot, false);
      assert.equal(scene.fallSpeedPxPerSec, speed * 0.5);
      const prompts = scene.greggTargets(); assert.deepEqual(prompts.map((p: any) => p.exerciseNumber), [6, 7, 8, 9, 10]);
      assert(prompts.every((p: any) => p.image.startsWith("data:image/png") && !p.crop));
      prepareScene(scene);
      for (let index = 0; index < 6; index++) { scene.spawnWord(); assert.equal(scene.activeWord, prompts[index % 5].answer); }
      const answer = scene.activeWord;
      for (const character of answer.toUpperCase()) scene.handleTyping(character);
      assert.equal(scene.completedWords, 1); assert.equal(scene.incorrectKeystrokes, 0);
    }
  }
  const devCrop = new development.GameScene();
  devCrop.init({ mode: "solo", matchConfig: { wordSet: "Stenography", greggSubmode: "word-phrase", difficulty: "Normal", roundTime: 30 } });
  assert.equal(devCrop.isGreggCropPilot, true); assert.equal(devCrop.fallSpeedPxPerSec, 75);
  const prodCrop = new production.GameScene();
  prodCrop.init({ mode: "solo", matchConfig: { wordSet: "Stenography", greggSubmode: "word-phrase", difficulty: "Normal", roundTime: 30 } });
  assert.equal(prodCrop.isGreggCropPilot, false); assert.equal(prodCrop.fallSpeedPxPerSec, 37.5);
  const target = Object.create(production.WordTarget.prototype);
  target.wordTextTyped = stubObject(); target.wordTextRemaining = stubObject();
  target.wordBlock = stubObject(); target.wordShadow = stubObject(); target.wordImage = stubObject();
  target.setGreggImage("steno-6", "Hidden English answer", 300, 150);
  assert.equal(target.wordTextTyped.visible, false); assert.equal(target.wordTextRemaining.visible, false);
  assert.equal(target.wordTextRemaining.text, ""); assert.equal(target.activeWord, "Hidden English answer");
});
