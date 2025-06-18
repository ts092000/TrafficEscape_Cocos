import { _decorator, Component, Node, Label, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager | null = null; // Singleton pattern

    @property(Node) // Reference to the level clear/game over UI panel
    public endLevelPanel: Node | null = null;

    @property(Label) // Optional: message for level clear
    public endLevelMessageLabel: Label | null = null;

    onLoad() {
        // Implement simple singleton
        if (GameManager.instance && GameManager.instance !== this) {
            this.destroy();
            return;
        }
        GameManager.instance = this;
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
        director.loadScene(director.getScene().name); // Reload current scene
    }
}


