import Phaser from "phaser"
import { WORDS } from "../words"

export default class GameScene extends Phaser.Scene {

    wordTextTyped!: Phaser.GameObjects.Text
    wordTextRemaining!: Phaser.GameObjects.Text
    wordBlock!: Phaser.GameObjects.Rectangle
    typedDisplay!: Phaser.GameObjects.Text
    activeWord: string = ""
    typedText: string = ""
    wordY: number = 50

    constructor(){
        super("GameScene")
    }

    preload(){
        // load background image
        this.load.image("bg1", "src/assets/bg1.png")
    }

    create(){
        // add background image and scale to fit screen
        const bg = this.add.image(0, 0, "bg1").setOrigin(0, 0)
        bg.displayWidth = this.scale.width
        bg.displayHeight = this.scale.height

        // create typed text display at bottom of screen
        this.typedDisplay = this.add.text(
            this.scale.width / 2,
            this.scale.height - 100,
            "",
            {
                fontSize: "36px",
                color: "#ffff00",
                backgroundColor: "#000000",
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5)

        // spawn first word
        this.spawnWord()

        // register keyboard input
        this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            this.handleTyping(event.key)
        })
    }

    spawnWord(){
        const index = Phaser.Math.Between(0, WORDS.length - 1)
        this.activeWord = WORDS[index]
        this.typedText = ""
        this.wordY = 50

        // destroy previous words if they exist
        if(this.wordTextTyped) this.wordTextTyped.destroy()
        if(this.wordTextRemaining) this.wordTextRemaining.destroy()
        if(this.wordBlock) this.wordBlock.destroy()

        // clear typed display
        this.typedDisplay.setText("")
        this.typedDisplay.setColor("#ffff00")

        // Calculate block size based on word length
        const blockWidth = this.activeWord.length * 28 + 40
        const blockHeight = 70

        // Create block/box background
        this.wordBlock = this.add.rectangle(
            this.scale.width / 2,
            this.wordY,
            blockWidth,
            blockHeight,
            0x333333,
            0.8
        )
        this.wordBlock.setStrokeStyle(3, 0x666666)

        // Create green text for typed part (empty initially)
        this.wordTextTyped = this.add.text(
            this.scale.width / 2,
            this.wordY,
            "",
            {
                fontSize: "32px",
                color: "#00ff00",
                fontStyle: "bold"
            }
        ).setOrigin(1, 0.5)

        // Create white text for remaining part
        this.wordTextRemaining = this.add.text(
            this.scale.width / 2,
            this.wordY,
            this.activeWord,
            {
                fontSize: "32px",
                color: "#ffffff",
                fontStyle: "bold"
            }
        ).setOrigin(0, 0.5)

        // Animate block and texts together
        this.tweens.add({
            targets: [this.wordBlock, this.wordTextTyped, this.wordTextRemaining],
            y: this.scale.height - 50,
            duration: 4000,
            onUpdate: () => {
                this.wordY = this.wordTextRemaining.y
            },
            onComplete: () => {
                // word reached bottom → spawn next
                this.spawnWord()
            }
        })
    }

    handleTyping(key: string){
        // handle backspace
        if(key === "Backspace" && this.typedText.length > 0){
            this.typedText = this.typedText.slice(0, -1)
            this.typedDisplay.setText(this.typedText)
            
            // update word display
            if(this.typedText.length === 0){
                this.wordTextTyped.setText("")
                this.wordTextRemaining.setText(this.activeWord)
                this.typedDisplay.setColor("#ffff00")
            } else {
                const typedPart = this.activeWord.substring(0, this.typedText.length)
                const remainingPart = this.activeWord.substring(this.typedText.length)
                this.wordTextTyped.setText(typedPart)
                this.wordTextRemaining.setText(remainingPart)
            }
            return
        }
        
        // handle space key specifically
        if(key === " " || key === "Space"){
            key = " "
        }
        
        // ignore special keys
        const specialKeys = ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", 
                           "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
        if(specialKeys.includes(key)) return
        
        // only allow single characters (letters, numbers, spaces)
        if(key.length !== 1) return

        this.typedText += key
        
        // update the typed text display
        this.typedDisplay.setText(this.typedText)

        // check if typed text matches the beginning of the word (case-insensitive)
        if(this.activeWord.toLowerCase().startsWith(this.typedText.toLowerCase())){
            // split word into typed and remaining parts
            const typedPart = this.activeWord.substring(0, this.typedText.length)
            const remainingPart = this.activeWord.substring(this.typedText.length)
            
            // update both text objects
            this.wordTextTyped.setText(typedPart)
            this.wordTextRemaining.setText(remainingPart)
            
            // update display color to green
            this.typedDisplay.setColor("#00ff00")
            
            // correct full word
            if(this.typedText.toLowerCase() === this.activeWord.toLowerCase()){
                this.spawnWord()
            }
        } else {
            // wrong letter → reset typed text
            this.typedText = ""
            this.typedDisplay.setText("")
            this.typedDisplay.setColor("#ffff00")
            this.wordTextTyped.setText("")
            this.wordTextRemaining.setText(this.activeWord)
        }
    }

}