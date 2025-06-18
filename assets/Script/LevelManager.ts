import { _decorator, Component, Node, Vec2, input, Input, EventTouch, PhysicsSystem2D, BoxCollider2D, Camera, geometry, RigidBody2D, ERigidBody2DType, Vec3 } from 'cc'; // Added Vec3
import { PuzzleCar, CarMoveDirection } from './PuzzleCar'; // Import your PuzzleCar script
import { GameManager } from './GameManager'; // Import your GameManager

const { ccclass, property } = _decorator;

@ccclass('LevelManager')
export class LevelManager extends Component {
    @property({ type: PuzzleCar })
    public redCar: PuzzleCar | null = null; // Assign the Red Car node here

    @property(Node)
    public exitTriggerZone: Node | null = null; // An empty node with a trigger collider marking the exit

    @property(Camera) // Reference to the main camera to convert screen to world points
    public mainCamera: Camera | null = null;

    @property
    public gridSize: number = 6; // E.g., 6 for a 6x6 board

    @property
    public gridUnitSize: number = 100; // Size of one grid unit in pixels (world space)

    private allCars: PuzzleCar[] = [];
    private selectedCar: PuzzleCar | null = null;
    private mouseOffset: Vec2 = new Vec2(); // Changed to Vec2
    private originalCarPos: Vec2 = new Vec2(); // Changed to Vec2
    
    // Board boundaries in world coordinates (X and Y for 2D)
    private minX: number;
    private maxX: number;
    private minY: number; // Changed from minZ
    private maxY: number; // Changed from maxZ

    onLoad() {
        // Collect all PuzzleCar components in the scene
        const carNodes = this.node.scene.getComponentsInChildren(PuzzleCar);
        this.allCars = carNodes;

        // Calculate board boundaries based on grid size and unit size
        const halfBoardSize = (this.gridSize / 2) * this.gridUnitSize;
        this.minX = -halfBoardSize;
        this.maxX = halfBoardSize;
        this.minY = -halfBoardSize; // Using Y for vertical axis in 2D
        this.maxY = halfBoardSize; // Using Y for vertical axis in 2D

        // Add a BoxCollider2D and RigidBody2D to the exitTriggerZone and make it a trigger
        if (this.exitTriggerZone) {
            let collider = this.exitTriggerZone.getComponent(BoxCollider2D);
            if (!collider) {
                collider = this.exitTriggerZone.addComponent(BoxCollider2D);
            }
            // A trigger needs a RigidBody2D
            let rigidBody = this.exitTriggerZone.getComponent(RigidBody2D);
            if (!rigidBody) {
                rigidBody = this.exitTriggerZone.addComponent(RigidBody2D);
            }
            rigidBody.type = ERigidBody2DType.Static; // Set to Static, as it won't move
            rigidBody.awakeOnLoad = true; // Ensure it's awake for collision detection
            rigidBody.enabledContactListener = true; // Enable contact listener for trigger events

            collider.apply(); // Apply changes to the collider after modifying properties

            // Adjust collider size to match the exit area.
            // Example for a 1-unit wide exit at X=250, Y=0 extending to X=350, Y=100
            // Assuming exit is on the right edge, center X at maxX, center Y at a specific lane
            // collider.size.set(this.gridUnitSize, this.gridUnitSize); // A 1x1 grid unit size
            // collider.offset.set(this.maxX + this.gridUnitSize / 2, 0); // Position to the right of the board
        }
    }

    onEnable() {
        // Using touch events for 2D games, which also cover mouse events
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDisable() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        if (!this.mainCamera) {
            console.error("LevelManager: Main Camera not assigned!");
            return;
        }
        
        const touchLocation = event.getLocation(); // Screen coordinates of touch
        // Convert screen to world, passing a Vec3 with 0 for the Z component
        const worldPos = this.mainCamera.screenToWorld(new Vec3(touchLocation.x, touchLocation.y, 0)); 

        // Perform a 2D raycast (point test) to find a car
        const results = PhysicsSystem2D.instance.testPoint(new Vec2(worldPos.x, worldPos.y)); // Use Vec2 for 2D testPoint
        if (results.length > 0) {
            for (const collider of results) {
                const carComponent = collider.node.getComponent(PuzzleCar);
                if (carComponent) {
                    this.selectedCar = carComponent;
                    this.originalCarPos.set(this.selectedCar.node.position.x, this.selectedCar.node.position.y); // Store 2D pos
                    this.mouseOffset.set(worldPos.x - this.selectedCar.node.position.x, 
                                         worldPos.y - this.selectedCar.node.position.y); // Calculate 2D offset
                    return; // Found a car, stop checking
                }
            }
        }
    }

    onTouchMove(event: EventTouch) {
        if (!this.selectedCar || !this.mainCamera) return;

        const touchLocation = event.getLocation(); // Current screen coordinates of touch
        // Convert screen to world, passing a Vec3 with 0 for the Z component
        const currentWorldPos = this.mainCamera.screenToWorld(new Vec3(touchLocation.x, touchLocation.y, 0)); // Convert screen to world

        // Calculate potential new position based on mouse/touch movement and original offset
        let targetX = currentWorldPos.x - this.mouseOffset.x;
        let targetY = currentWorldPos.y - this.mouseOffset.y;
        
        let targetPos = new Vec2(targetX, targetY);

        // --- Important: Constrain movement to single axis and within bounds ---
        if (this.selectedCar.moveDirection === CarMoveDirection.HORIZONTAL) {
            targetPos.y = this.originalCarPos.y; // Lock Y for horizontal movement
            // Clamp X within board boundaries
            targetPos.x = Math.max(this.minX + (this.selectedCar.carLengthUnits * this.gridUnitSize / 2), targetPos.x);
            targetPos.x = Math.min(this.maxX - (this.selectedCar.carLengthUnits * this.gridUnitSize / 2), targetPos.x);

            // Calculate actual move delta from original
            const deltaX = targetPos.x - this.originalCarPos.x;
            const finalMoveDelta = this.checkBlockingHorizontal(this.selectedCar, deltaX);
            targetPos.x = this.originalCarPos.x + finalMoveDelta;

        } else { // VERTICAL
            targetPos.x = this.originalCarPos.x; // Lock X for vertical movement
            // Clamp Y within board boundaries
            targetPos.y = Math.max(this.minY + (this.selectedCar.carLengthUnits * this.gridUnitSize / 2), targetPos.y);
            targetPos.y = Math.min(this.maxY - (this.selectedCar.carLengthUnits * this.gridUnitSize / 2), targetPos.y);
            
            // Calculate actual move delta from original
            const deltaY = targetPos.y - this.originalCarPos.y; // Changed from deltaZ
            const finalMoveDelta = this.checkBlockingVertical(this.selectedCar, deltaY); // Changed from deltaZ
            targetPos.y = this.originalCarPos.y + finalMoveDelta; // Changed from targetPos.z
        }

        this.selectedCar.tryMove(targetPos);
    }

    onTouchEnd(event: EventTouch) {
        if (!this.selectedCar) return;

        // For "Unblock Me" style, cars usually snap to the furthest valid grid position.
        // The current `tryMove` logic updates continuously. If you want snapping:
        // 1. Calculate the final grid-aligned position based on `this.selectedCar.node.position`
        // 2. Call `this.selectedCar.tryMove(finalSnappedPos)` here.

        this.checkWinCondition(); // Check win condition after each move
        this.selectedCar = null;
    }

    // Helper to check for horizontal blocking (simplified)
    private checkBlockingHorizontal(car: PuzzleCar, desiredDeltaX: number): number {
        let actualDeltaX = desiredDeltaX;
        const currentPos = car.node.position;
        const carHalfLength = (car.carLengthUnits * this.gridUnitSize) / 2;

        for (const otherCar of this.allCars) {
            if (otherCar === car) continue; // Don't check against self

            // Check if cars are on the same Y (lane) to potentially block
            if (Math.abs(currentPos.y - otherCar.node.position.y) < 0.1 && // Same "lane" (Y-coordinate)
                otherCar.moveDirection === CarMoveDirection.VERTICAL) { // Vertical cars can block horizontal

                const otherCarHalfLength = (otherCar.carLengthUnits * this.gridUnitSize) / 2;

                // Check for blocking based on positions
                if (desiredDeltaX > 0) { // Moving right
                    const carFront = currentPos.x + carHalfLength;
                    const otherCarBack = otherCar.node.position.x - otherCarHalfLength;
                    if (carFront < otherCarBack && carFront + desiredDeltaX > otherCarBack) {
                        actualDeltaX = Math.min(actualDeltaX, otherCarBack - carFront);
                    }
                } else if (desiredDeltaX < 0) { // Moving left
                    const carBack = currentPos.x - carHalfLength;
                    const otherCarFront = otherCar.node.position.x + otherCarHalfLength;
                    if (carBack > otherCarFront && carBack + desiredDeltaX < otherCarFront) {
                        actualDeltaX = Math.max(actualDeltaX, otherCarFront - carBack);
                    }
                }
            }
        }
        return actualDeltaX;
    }

    // Helper to check for vertical blocking (simplified)
    private checkBlockingVertical(car: PuzzleCar, desiredDeltaY: number): number { // Changed desiredDeltaZ to desiredDeltaY
        let actualDeltaY = desiredDeltaY; // Changed actualDeltaZ to actualDeltaY
        const currentPos = car.node.position;
        const carHalfLength = (car.carLengthUnits * this.gridUnitSize) / 2;

        for (const otherCar of this.allCars) {
            if (otherCar === car) continue;

            // Check if cars are on the same X (lane) to potentially block
            if (Math.abs(currentPos.x - otherCar.node.position.x) < 0.1 && // Same "lane" (X-coordinate)
                otherCar.moveDirection === CarMoveDirection.HORIZONTAL) { // Horizontal cars can block vertical

                const otherCarHalfLength = (otherCar.carLengthUnits * this.gridUnitSize) / 2;

                if (desiredDeltaY > 0) { // Moving up (positive Y) // Changed from Z
                    const carFront = currentPos.y + carHalfLength; // Changed from Z
                    const otherCarBack = otherCar.node.position.y - otherCarHalfLength; // Changed from Z
                    if (carFront < otherCarBack && carFront + desiredDeltaY > otherCarBack) { // Changed from Z
                        actualDeltaY = Math.min(actualDeltaY, otherCarBack - carFront); // Changed from Z
                    }
                } else if (desiredDeltaY < 0) { // Moving down (negative Y) // Changed from Z
                    const carBack = currentPos.y - carHalfLength; // Changed from Z
                    const otherCarFront = otherCar.node.position.y + otherCarHalfLength; // Changed from Z
                    if (carBack > otherCarFront && carBack + desiredDeltaY < otherCarFront) { // Changed from Z
                        actualDeltaY = Math.max(actualDeltaY, otherCarFront - carBack); // Changed from Z
                    }
                }
            }
        }
        return actualDeltaY; // Changed from actualDeltaZ
    }


    checkWinCondition() {
        if (this.redCar && this.exitTriggerZone) {
            // Check if the red car's collider is overlapping the exit trigger zone
            // Cocos Creator uses 2D physics for triggers.
            const redCarBounds = this.redCar.getComponent(BoxCollider2D)?.worldAABB; // Changed to worldAABB
            const exitBounds = this.exitTriggerZone.getComponent(BoxCollider2D)?.worldAABB; // Changed to worldAABB

            if (redCarBounds && exitBounds && redCarBounds.intersects(exitBounds)) {
                console.log("Level Cleared!");
                if (GameManager.instance) {
                    GameManager.instance.levelCleared();
                }
            }
        }
    }

    // Call this to reset all cars to their initial positions
    public resetLevel() {
        this.allCars.forEach(car => car.resetPosition());
        console.log("Level Reset!");
        if (GameManager.instance) {
            GameManager.instance.resetGame();
        }
    }
}