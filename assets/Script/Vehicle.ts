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
        this.gameManager = this.node.getParent().getParent().getParent().getComponent(GameManager); 
        console.log(this.gameManager);
        // Giả sử GameManager gắn trên Canvas, và gameBoardNode là con của Canvas, xe là con của gameBoardNode
        // Điều chỉnh lại path nếu cấu trúc hierarchy khác
    }

    public init(startX: number, startY: number, direction: Direction, length: number, cellSize: number) {
        this.gridX = startX;
        this.gridY = startY;
        this.direction = direction;
        this.length = length;

        // Đặt kích thước cho sprite của xe
        // Ví dụ: Xe ngang (width = length * cellSize, height = cellSize)
        // Xe dọc (width = cellSize, height = length * cellSize)
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            if (this.direction === Direction.LEFT || this.direction === Direction.RIGHT) {
                uiTransform.setContentSize(this.length * cellSize, cellSize);
                this.sprite.node.angle = 0; // Đặt góc quay cho sprite nếu cần (xe ngang)
            } else if (this.direction === Direction.UP) {
                uiTransform.setContentSize(this.length * cellSize, cellSize);
                this.sprite.node.angle = 90; // Đặt góc quay cho sprite nếu cần (xe dọc)
            } else {
                uiTransform.setContentSize(this.length * cellSize, cellSize);
                this.sprite.node.angle = -90; // Đặt góc quay cho sprite nếu cần (xe dọc)
            }
        }

        // Đặt vị trí ban đầu của xe trên Scene dựa trên tọa độ grid
        this.snapToGrid(cellSize, this.gameManager.gameBoardNode.getComponent(UITransform).width, this.gameManager.gameBoardNode.getComponent(UITransform).height);
        this.initialPosition.set(this.node.position);
    }

    // Chuyển đổi tọa độ grid sang tọa độ thế giới (local của parent node)
    public getLocalPositionFromGrid(gridX: number, gridY: number, cellSize: number, boardWidth: number, boardHeight: number): Vec3 {
        // Tính vị trí cục bộ của tâm ô lưới trong không gian của gameBoardNode.
        // boardWidth/2 và boardHeight/2 là offset từ tâm gameBoardNode đến góc dưới bên trái của nó.
        // (cellSize / 2) là offset để đặt tâm xe vào giữa ô lưới.
        const posX = gridX * cellSize - (boardWidth / 2) + (cellSize / 2);
        const posY = gridY * cellSize - (boardHeight / 2) + (cellSize / 2);
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


