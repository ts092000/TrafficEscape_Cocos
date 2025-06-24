import { _decorator, Component, Sprite, UITransform, tween, Vec3 } from 'cc';
import { Direction } from './LevelData';
import { GameManager } from './GameManager'; // Để gọi các hàm kiểm tra từ GameManager

const { ccclass, property } = _decorator;

@ccclass('Vehicle')
export class Vehicle extends Component {
    @property(Sprite)
    sprite: Sprite = null; // Component Sprite của xe

    public gridX: number = 0;
    public gridY: number = 0;
    public direction: Direction = Direction.RIGHT;
    public length: number = 2; // Ví dụ: xe 2 ô, xe tải 3 ô

    public initialPosition: Vec3 = new Vec3(); // Vị trí ban đầu khi chạm để kéo

    private gameManager: GameManager = null;

    protected onLoad(): void {
        // Tìm GameManager trong Scene
        this.gameManager = this.node.getParent().getParent().getComponent(GameManager); 
        console.log(this.gameManager);
        // Giả sử GameManager gắn trên Canvas, và gameBoardNode là con của Canvas, xe là con của gameBoardNode
        // Điều chỉnh lại path nếu cấu trúc hierarchy khác
    }

    // Đảm bảo hàm init có tham số manager: GameManager
    public init(startX: number, startY: number, direction: Direction, length: number, cellSize: number, manager: GameManager) {
        this.gridX = startX;
        this.gridY = startY;
        this.direction = direction;
        this.length = length;
        this.gameManager = manager; // Dòng này quan trọng

        if (!this.gameManager) {
            console.error("[Vehicle] GameManager is null in Vehicle init! Cannot get GameBoardNode UITransform.");
            return;
        }

        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            // ... (logic setContentSize và angle của xe)
            if (this.direction === Direction.LEFT || this.direction === Direction.RIGHT) {
                uiTransform.setContentSize(this.length * cellSize, cellSize);
                this.sprite.node.angle = 0; 
                if (this.direction === Direction.LEFT) this.sprite.node.scale = new Vec3(-1, 1, 1); 
                else this.sprite.node.scale = new Vec3(1, 1, 1); 
            } else { 
                uiTransform.setContentSize(this.length * cellSize, cellSize);
                this.sprite.node.angle = -90; 
                if (this.direction === Direction.UP) {
                    this.sprite.node.scale = new Vec3(-1, 1, 1); 
                }
                else {
                    this.sprite.node.scale = new Vec3(1, 1, 1); 
                }
                // Cần điều chỉnh scale cho UP/DOWN nếu sprite gốc là ngang
                // Ví dụ: if (this.direction === Direction.UP) { this.sprite.node.scale = new Vec3(1, -1, 1); }
            }
        } else {
             console.error("[Vehicle] UITransform component not found on vehicle node!");
             return;
        }
        
        // Lấy kích thước gameBoardNode TẠI THỜI ĐIỂM NÀY, sau khi đã được setContentSize trong GameManager
        const boardUITransform = this.gameManager.gameBoardNode.getComponent(UITransform);
        if (!boardUITransform) {
            console.error("[Vehicle] GameBoardNode does not have a UITransform component when initializing vehicle!");
            return;
        }
        const boardWidth = boardUITransform.width;
        const boardHeight = boardUITransform.height;
        console.log(`[Vehicle] Initializing ${this.node.name}:`);
        console.log(`[Vehicle]  - Board Size received (from GameManager): W=${boardWidth.toFixed(2)}, H=${boardHeight.toFixed(2)}`);
        console.log(`[Vehicle]  - GRID_CELL_SIZE used: ${cellSize}`);
        this.node.setPosition(this.getLocalPositionFromGrid(startX, startY, cellSize, boardWidth, boardHeight));
        this.initialPosition.set(this.node.position);

        console.log(`[Vehicle] Initialized ${this.node.name} at Grid(${startX}, ${startY}), Local Pos: (${this.node.position.x.toFixed(2)}, ${this.node.position.y.toFixed(2)})`);
    }

    // Chuyển đổi tọa độ grid sang tọa độ thế giới (local của parent node)
    public getLocalPositionFromGrid(gridX: number, gridY: number, cellSize: number, boardWidth: number, boardHeight: number): Vec3 {
         // boardWidth/2 và boardHeight/2: dịch gốc tọa độ từ tâm gameBoardNode về góc dưới bên trái của gameBoardNode.
        // gridX * cellSize và gridY * cellSize: tính toán vị trí góc dưới bên trái của ô lưới.
        // + cellSize / 2: dịch vị trí từ góc dưới bên trái của ô lưới đến tâm của ô lưới.
        
        // Tính vị trí X cục bộ
        const posX = (gridX * cellSize) - (boardWidth / 2) + (cellSize / 2);
        
        // Tính vị trí Y cục bộ
        const posY = (gridY * cellSize) - (boardHeight / 2) + (cellSize / 2);
        
        console.log(`[getLocalPositionFromGrid] For grid (${gridX}, ${gridY}): Local Position X=${posX.toFixed(2)}, Y=${posY.toFixed(2)}`);
        
        return new Vec3(posX, posY);
    }

    // "Snap" xe vào vị trí grid đúng
    public snapToGrid(cellSize: number, boardWidth: number, boardHeight: number) {
        const targetPos = this.getLocalPositionFromGrid(this.gridX, this.gridY, cellSize, boardWidth, boardHeight);
        tween(this.node)
            .to(0.1, { position: targetPos }) // Di chuyển mượt mà về vị trí grid
            .start();
        this.initialPosition.set(targetPos); // Cập nhật vị trí ban đầu cho lần kéo tiếp theo
    }

    // Cập nhật vị trí grid của xe
    public setGridPosition(newX: number, newY: number) {
        this.gridX = newX;
        this.gridY = newY;
    }
}


