import { _decorator, Component, Node, Vec2, PhysicsSystem2D, BoxCollider2D, Enum } from 'cc'; // Changed to Vec2, PhysicsSystem2D, BoxCollider2D
const { ccclass, property } = _decorator;

// Enum to define movement axis
export enum CarMoveDirection {
    HORIZONTAL,
    VERTICAL
}

// Register the enum with Cocos Creator for better editor support
Enum(CarMoveDirection);

@ccclass('PuzzleCar')
export class PuzzleCar extends Component {
    @property({ type: CarMoveDirection })
    public moveDirection: CarMoveDirection = CarMoveDirection.HORIZONTAL;

    @property
    public carLengthUnits: number = 2; // 2 for cars, 3 for trucks

    @property
    public isRedCar: boolean = false; // True if this is the player's goal car

    private originalPosition: Vec2 = new Vec2(); // Changed to Vec2
    private boxCollider: BoxCollider2D | null = null; // Changed to BoxCollider2D

    onLoad() {
        this.originalPosition.set(this.node.position.x, this.node.position.y); // Set from Node's Vec3 to Vec2
        this.boxCollider = this.getComponent(BoxCollider2D); // Changed to BoxCollider2D
        if (!this.boxCollider) {
            console.error("PuzzleCar: BoxCollider2D not found!");
        }
    }

    // Called by LevelManager to move the car
    public tryMove(newPos: Vec2) { // Changed to Vec2
        this.node.setPosition(newPos.x, newPos.y); // Set 2D position
    }

    // Reset car to its original position (for level restart)
    public resetPosition() {
        this.node.setPosition(this.originalPosition.x, this.originalPosition.y); // Set 2D position
    }
}
