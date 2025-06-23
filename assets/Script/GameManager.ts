import { _decorator, Component, Node, Label, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager | null = null; // Singleton pattern
    public static time: number = 5;
    public static timeCdCallback: any;

    @property(Node) // Reference to the level clear/game over UI panel
    public endLevelPanel: Node | null = null;

    @property(Label) // Optional: message for level clear
    public endLevelMessageLabel: Label | null = null;

    @property(Label) // Optional: message for level clear
    public timeLabel: Label | null = null;

    @property(Node) // Optional: message for level clear
    public winNode: Node | null = null;

    @property(Node) // Optional: message for level clear
    public loseNode: Node | null = null;

    onLoad() {
        // Implement simple singleton
        if (GameManager.instance && GameManager.instance !== this) {
            this.destroy();
            return;
        }
        GameManager.instance = this;
        GameManager.time = 5;
        this.timeCd();
        // director.addPersistRootNode(this.node); // Optional: if you want it to persist between scenes
    }

    start() {
        if (this.endLevelPanel) {
            this.endLevelPanel.active = false; // Hide panel initially
        }
    }

    update(deltaTime: number) {
        
    }

    public levelCleared() {
        console.log("GameManager: Level Cleared!");
        this.winNode.active = true;
        this.loseNode.active = false;
        if (this.endLevelPanel) {
            this.endLevelPanel.active = true; // Show panel
        }
        if (this.endLevelMessageLabel) {
            this.endLevelMessageLabel.string = "Level Cleared!";
        }
        // You might want to pause game here or load next level
    }

    public resetGame() {
        console.log("GameManager: Restarting Current Level!");
        GameManager.time = 5;
        this.timeCd();
        this.endLevelMessageLabel.node.active = true;
        this.endLevelPanel.active = false;
        director.preloadScene(director.getScene().name); // Reload current scene
    }

    public gameOver(): void {
        if (this.endLevelPanel) {
            this.endLevelPanel.active = true; // Show panel
        }
        this.winNode.active = false;
        this.loseNode.active = true;
        this.endLevelMessageLabel.string = "Game Over, please try again!";
    }
    
    public timeCd(): void {
        GameManager.time = 5;
        GameManager.timeCdCallback = function () {
            this.timeLabel.string = `${GameManager.time}`;
            if (GameManager.time === 0) {
                // Cancel this timer at the sixth call-back
                GameManager.time = 5;
                this.unschedule(GameManager.timeCdCallback);
                this.gameOver();
            }
            GameManager.time--;
        }
        this.schedule(GameManager.timeCdCallback, 1);
    }
}


