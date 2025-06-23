import { _decorator, Component, Node, Label, director, Prefab, input, UITransform, Size, Input, instantiate, EventTouch, Vec3, tween } from 'cc';
import { Direction, LevelData } from './LevelData';
import { Vehicle } from './Vehicle';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager | null = null; // Singleton pattern
    public static time: number = 15;
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

    @property({ type: Prefab })
    carPrefab: Prefab = null; // Kéo Prefab xe hơi vào đây từ Inspector
    @property({ type: Prefab })
    truckPrefab: Prefab = null; // Kéo Prefab xe tải vào đây từ Inspector
    // Thêm các prefab khác nếu có

    @property(Node)
    gameBoardNode: Node = null; // Node để chứa các xe (ví dụ: một Node rỗng làm cha)

    @property(Label)
    levelLabel: Label = null; // Label hiển thị số màn chơi
    @property(Label)
    movesLabel: Label = null; // Label hiển thị số lượt di chuyển

    private currentLevelIndex: number = 0;
    private currentLevelData: LevelData = null;
    private vehicles: Vehicle[] = [];
    private movesCount: number = 0;

    // Kích thước của mỗi ô trong grid (ví dụ 64x64 pixel)
    private readonly GRID_CELL_SIZE: number = 64; 

    // Grid ảo để quản lý vị trí xe
    private grid: Node[][] = []; 
    private gridSizeX: number = 0;
    private gridSizeY: number = 0;

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private selectedVehicle: Vehicle = null;

    // Vị trí node của xe khi bắt đầu chạm (để tính toán delta)
    private selectedVehicleStartPos: Vec3 = new Vec3(); 

    private isMovingVehicle: boolean = false; // Cờ để ngăn bấm nhiều xe cùng lúc khi đang di chuyển

    onLoad() {
        // Implement simple singleton
        if (GameManager.instance && GameManager.instance !== this) {
            this.destroy();
            return;
        }
        GameManager.instance = this;
        GameManager.time = 15;
        this.timeCd();
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.gameBoardNode.getComponent(UITransform).setContentSize(new Size(0,0));
        // director.addPersistRootNode(this.node); // Optional: if you want it to persist between scenes
    }

    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }

    start() {
        if (this.endLevelPanel) {
            this.endLevelPanel.active = false; // Hide panel initially
        }
        this.loadLevel(this.currentLevelIndex);
    }

    update(deltaTime: number) {
        
    }

    private async loadLevel(index: number): Promise<void> {
        // Tải dữ liệu màn chơi từ file JSON
        // Trong ví dụ này, tôi sẽ tạo dữ liệu giả lập.
        // Thực tế bạn sẽ load từ `resources/levels/level_x.json`
        // Ví dụ: `const levelAsset = await resources.load('levels/level_0', JsonAsset);`

        this.currentLevelData = this.getMockLevelData(index); // Dữ liệu giả lập
        if (!this.currentLevelData) {
            console.warn("No more levels or level data not found!");
            return;
        }

        // Reset game board
        this.gameBoardNode.removeAllChildren();
        this.vehicles = [];
        this.movesCount = 0;
        this.updateMovesLabel();

        // this.levelLabel.string = `Level: ${this.currentLevelData.levelId}`;
        
        this.gridSizeX = this.currentLevelData.gridSizeX;
        this.gridSizeY = this.currentLevelData.gridSizeY;

        // Cập nhật kích thước GameBoardNode để căn giữa
        this.gameBoardNode.getComponent(UITransform).setContentSize(
            new Size(this.gridSizeX * this.GRID_CELL_SIZE, this.gridSizeY * this.GRID_CELL_SIZE)
        );
        // Căn giữa gameBoardNode trên màn hình
        this.gameBoardNode.setPosition(
            -this.gridSizeX * this.GRID_CELL_SIZE / 2 + this.GRID_CELL_SIZE / 2, 
            -this.gridSizeY * this.GRID_CELL_SIZE / 2 + this.GRID_CELL_SIZE / 2, 
            0
        );

        // Khởi tạo grid trống
        this.grid = Array(this.gridSizeY).fill(0).map(() => Array(this.gridSizeX).fill(null));

        // Khởi tạo các xe
        this.currentLevelData.vehicles.forEach(vc => {
            let vehicleNode: Node = null;
            switch (vc.type) {
                case 'car':
                    vehicleNode = instantiate(this.carPrefab);
                    break;
                case 'truck':
                    vehicleNode = instantiate(this.truckPrefab);
                    break;
                // Thêm các loại xe khác
                default:
                    console.warn(`Unknown vehicle type: ${vc.type}`);
                    return;
            }

            if (vehicleNode) {
                this.gameBoardNode.addChild(vehicleNode);
                const vehicleComponent = vehicleNode.getComponent(Vehicle);
                vehicleComponent.init(vc.startX, vc.startY, vc.direction, vc.length, this.GRID_CELL_SIZE);
                this.vehicles.push(vehicleComponent);

                // Cập nhật grid khi xe được khởi tạo
                this.placeVehicleOnGrid(vehicleComponent, vc.startX, vc.startY);
            }
        });
    }

    // Đặt xe vào grid và đánh dấu các ô xe chiếm
    private placeVehicleOnGrid(vehicle: Vehicle, x: number, y: number) {
        for (let i = 0; i < vehicle.length; i++) {
            let cellX = x;
            let cellY = y;
            if (vehicle.direction === Direction.RIGHT) {
                cellX += i;
            } else if (vehicle.direction === Direction.DOWN) {
                cellY += i;
            }
            // Thêm logic cho LEFT, UP nếu có

            if (cellX >= 0 && cellX < this.gridSizeX && cellY >= 0 && cellY < this.gridSizeY) {
                this.grid[cellY][cellX] = vehicle.node; // Lưu node của xe tại vị trí đó
            } else {
                console.warn(`Vehicle out of grid bounds: ${vehicle.node.name} at (${cellX}, ${cellY})`);
            }
        }
    }

    // Di chuyển xe trên grid
    public moveVehicleOnGrid(vehicle: Vehicle, oldX: number, oldY: number, newX: number, newY: number) {
        // Xóa xe khỏi vị trí cũ trên grid
        for (let i = 0; i < vehicle.length; i++) {
            let cellX = oldX;
            let cellY = oldY;
            if (vehicle.direction === Direction.RIGHT) {
                cellX += i;
            } else if (vehicle.direction === Direction.DOWN) {
                cellY += i;
            }
            if (cellX >= 0 && cellX < this.gridSizeX && cellY >= 0 && cellY < this.gridSizeY) {
                this.grid[cellY][cellX] = null;
            }
        }

        // Đặt xe vào vị trí mới trên grid
        for (let i = 0; i < vehicle.length; i++) {
            let cellX = newX;
            let cellY = newY;
            if (vehicle.direction === Direction.RIGHT) {
                cellX += i;
            } else if (vehicle.direction === Direction.DOWN) {
                cellY += i;
            }
            if (cellX >= 0 && cellX < this.gridSizeX && cellY >= 0 && cellY < this.gridSizeY) {
                this.grid[cellY][cellX] = vehicle.node;
            }
        }
    }

     // Kiểm tra xem xe có thể di chuyển đến vị trí cụ thể trên grid không
    // (Kiểm tra từng ô trên đường đi của xe)
    public canMoveTo(vehicle: Vehicle, targetGridX: number, targetGridY: number): boolean {
        for (let i = 0; i < vehicle.length; i++) {
            let checkX = targetGridX;
            let checkY = targetGridY;

            if (vehicle.direction === Direction.RIGHT) {
                checkX += i;
            } else if (vehicle.direction === Direction.DOWN) {
                checkY += i;
            } else if (vehicle.direction === Direction.LEFT) {
                checkX -= i;
            } else if (vehicle.direction === Direction.UP) {
                checkY -= i;
            }

            // Kiểm tra ra ngoài biên giới của grid (trừ điểm thoát)
            // Nếu xe đã ra ngoài grid ở điểm thoát, thì coi là hợp lệ
            // Cần tinh chỉnh logic này sau để kiểm tra chính xác điểm thoát
            if (checkX < 0 || checkX >= this.gridSizeX || checkY < 0 || checkY >= this.gridSizeY) {
                // Đây có thể là vị trí thoát. Logic chính xác sẽ được kiểm tra ở checkForWinCondition
                continue; 
            }

            const cellOccupant = this.grid[checkY][checkX];
            if (cellOccupant && cellOccupant !== vehicle.node) {
                // Ô này đang bị chiếm bởi một xe khác
                return false;
            }
        }
        return true;
    }

    // Hàm tiện ích để chuyển đổi từ tọa độ thế giới (node.position) sang tọa độ grid
    public convertWorldToGrid(worldPos: Vec3): { gridX: number, gridY: number } {
        const boardUITransform = this.gameBoardNode.getComponent(UITransform);
        const localPos = boardUITransform.convertToNodeSpaceAR(worldPos);

        const gridX = Math.floor((localPos.x + boardUITransform.width / 2) / this.GRID_CELL_SIZE);
        const gridY = Math.floor((localPos.y + boardUITransform.height / 2) / this.GRID_CELL_SIZE);
        return { gridX, gridY };
    }
    // private onTouchStart(event: EventTouch) {
    //     console.log('alo')
    //     // Chuyển đổi vị trí chạm từ tọa độ màn hình sang tọa độ của gameBoardNode
    //     const touchLocation = event.getLocation();
    //     const localPos = this.gameBoardNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(touchLocation.x, touchLocation.y));

    //     // Chuyển đổi từ tọa độ địa phương sang tọa độ grid
    //     const gridX = Math.floor((localPos.x + this.gameBoardNode.getComponent(UITransform).width / 2) / this.GRID_CELL_SIZE);
    //     const gridY = Math.floor((localPos.y + this.gameBoardNode.getComponent(UITransform).height / 2) / this.GRID_CELL_SIZE);

    //     if (gridX >= 0 && gridX < this.gridSizeX && gridY >= 0 && gridY < this.gridSizeY) {
    //         const nodeAtTouch = this.grid[gridY][gridX];
    //         if (nodeAtTouch) {
    //             this.selectedVehicle = nodeAtTouch.getComponent(Vehicle);
    //             this.touchStartX = localPos.x;
    //             this.touchStartY = localPos.y;
    //             input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    //             input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    //             input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this); // Trong trường hợp cancel
    //         } else {
    //             this.selectedVehicle = null;
    //         }
    //     }
    // }

    // private onTouchMove(event: EventTouch) {
    //     if (!this.selectedVehicle) return;

    //     const touchLocation = event.getLocation();
    //     const deltaX = touchLocation.x - this.touchStartX;
    //     const deltaY = touchLocation.y - this.touchStartY;

    //     let newPosX = this.selectedVehicleStartPos.x;
    //     let newPosY = this.selectedVehicleStartPos.y;

    //     if (this.selectedVehicle.direction === Direction.RIGHT || this.selectedVehicle.direction === Direction.LEFT) {
    //         newPosX += deltaX;
    //     } else if (this.selectedVehicle.direction === Direction.UP || this.selectedVehicle.direction === Direction.DOWN) {
    //         newPosY += deltaY;
    //     }
    //     this.selectedVehicle.node.setPosition(newPosX, newPosY);
    // }

    // private onTouchEnd(event: EventTouch) {
    //     if (!this.selectedVehicle) return;

    //     const vehicle = this.selectedVehicle;
    //     const oldGridX = vehicle.gridX;
    //     const oldGridY = vehicle.gridY;

    //     // Tính toán vị trí grid mà xe kết thúc sau khi thả
    //     const currentVehicleWorldPos = vehicle.node.worldPosition;
    //     const { gridX: endGridX, gridY: endGridY } = this.convertWorldToGrid(currentVehicleWorldPos);

    //     let finalGridX = oldGridX;
    //     let finalGridY = oldGridY;
    //     let movedThisTurn = false;

    //     if (vehicle.direction === Direction.RIGHT || vehicle.direction === Direction.LEFT) {
    //         let targetDeltaGridX = endGridX - oldGridX;
    //         let step = targetDeltaGridX > 0 ? 1 : -1;
            
    //         // Tìm ô lưới xa nhất mà xe có thể di chuyển đến
    //         for (let i = 1; i <= Math.abs(targetDeltaGridX) + vehicle.length; i++) { // Thêm vehicle.length để kiểm tra cả việc thoát màn hình
    //             let testGridX = oldGridX + (i * step);
                
    //             // Kiểm tra va chạm trên đường đi
    //             if (this.canMoveTo(vehicle, testGridX, oldGridY)) {
    //                  finalGridX = testGridX;
    //                  movedThisTurn = true;
    //             } else {
    //                 break; // Bị chặn bởi một xe khác
    //             }
    //         }
    //     } else if (vehicle.direction === Direction.UP || vehicle.direction === Direction.DOWN) {
    //         let targetDeltaGridY = endGridY - oldGridY;
    //         let step = targetDeltaGridY > 0 ? 1 : -1;

    //         for (let i = 1; i <= Math.abs(targetDeltaGridY) + vehicle.length; i++) { // Thêm vehicle.length để kiểm tra cả việc thoát màn hình
    //             let testGridY = oldGridY + (i * step);
                
    //             if (this.canMoveTo(vehicle, oldGridX, testGridY)) {
    //                 finalGridY = testGridY;
    //                 movedThisTurn = true;
    //             } else {
    //                 break;
    //             }
    //         }
    //     }

    //     // Cập nhật vị trí trên grid và di chuyển node
    //     if (movedThisTurn && (finalGridX !== oldGridX || finalGridY !== oldGridY)) {
    //         this.movesCount++;
    //         this.updateMovesLabel();

    //         this.moveVehicleOnGrid(vehicle, oldGridX, oldGridY, finalGridX, finalGridY);
    //         vehicle.setGridPosition(finalGridX, finalGridY);
    //         vehicle.snapToGrid(this.GRID_CELL_SIZE, this.gameBoardNode.getComponent(UITransform).width, this.gameBoardNode.getComponent(UITransform).height);
    //         this.checkForWinCondition();
    //     } else {
    //         // Nếu không di chuyển hoặc không hợp lệ, trả xe về vị trí cũ
    //         vehicle.snapToGrid(this.GRID_CELL_SIZE, this.gameBoardNode.getComponent(UITransform).width, this.gameBoardNode.getComponent(UITransform).height);
    //     }
       
    //     this.selectedVehicle = null;
    //     input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    //     input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    //     input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    // }

    // --- Xử lý Input MỚI: Bấm để Tự Động Di chuyển ---
    private onTouchStart(event: EventTouch) {
        console.log('123');
        if (this.isMovingVehicle) { // Ngăn không cho bấm xe khác khi một xe đang di chuyển
            return;
        }

        const touchLocation = event.getLocation();
        const { gridX, gridY } = this.convertWorldToGrid(new Vec3(touchLocation.x, touchLocation.y, 0));

        if (gridX >= 0 && gridX < this.gridSizeX && gridY >= 0 && gridY < this.gridSizeY) {
            const nodeAtTouch = this.grid[gridY][gridX];
            if (nodeAtTouch) {
                const selectedVehicle = nodeAtTouch.getComponent(Vehicle);
                this.moveVehicleAutomatically(selectedVehicle);
            }
        }
    }

    private moveVehicleAutomatically(vehicle: Vehicle) {
        const oldGridX = vehicle.gridX;
        const oldGridY = vehicle.gridY;

        let finalGridX = oldGridX;
        let finalGridY = oldGridY;
        let movedCells = 0; // Số ô mà xe thực sự di chuyển

        // Tìm ô lưới xa nhất mà xe có thể di chuyển đến
        // Lặp xa hơn một chút để tính đến trường hợp xe thoát ra khỏi màn hình
        const maxMovementRange = Math.max(this.gridSizeX, this.gridSizeY) + vehicle.length; 

        if (vehicle.direction === Direction.RIGHT) {
            for (let i = 1; i <= maxMovementRange; i++) {
                let testGridX = oldGridX + i;
                if (this.canMoveTo(vehicle, testGridX, oldGridY)) {
                    finalGridX = testGridX;
                    movedCells = i;
                } else {
                    break; // Bị chặn bởi một xe khác
                }
            }
        } else if (vehicle.direction === Direction.LEFT) {
            for (let i = 1; i <= maxMovementRange; i++) {
                let testGridX = oldGridX - i;
                if (this.canMoveTo(vehicle, testGridX, oldGridY)) {
                    finalGridX = testGridX;
                    movedCells = i;
                } else {
                    break;
                }
            }
        } else if (vehicle.direction === Direction.UP) {
            for (let i = 1; i <= maxMovementRange; i++) {
                let testGridY = oldGridY + i;
                if (this.canMoveTo(vehicle, oldGridX, testGridY)) {
                    finalGridY = testGridY;
                    movedCells = i;
                } else {
                    break;
                }
            }
        } else if (vehicle.direction === Direction.DOWN) {
            for (let i = 1; i <= maxMovementRange; i++) {
                let testGridY = oldGridY - i;
                if (this.canMoveTo(vehicle, oldGridX, testGridY)) {
                    finalGridY = testGridY;
                    movedCells = i;
                } else {
                    break;
                }
            }
        }

        // Nếu xe đã di chuyển ít nhất 1 ô
        if (movedCells > 0) {
            this.isMovingVehicle = true; // Đặt cờ đang di chuyển
            this.movesCount++;
            this.updateMovesLabel();

            // Cập nhật grid ngay lập tức để ngăn xe khác di chuyển vào vị trí cũ
            this.moveVehicleOnGrid(vehicle, oldGridX, oldGridY, finalGridX, finalGridY);
            vehicle.setGridPosition(finalGridX, finalGridY);

            const targetPos = vehicle.getLocalPositionFromGrid(finalGridX, finalGridY, this.GRID_CELL_SIZE, 
                this.gameBoardNode.getComponent(UITransform).width, this.gameBoardNode.getComponent(UITransform).height);

            // Di chuyển node xe bằng tween
            tween(vehicle.node)
                .to(movedCells * 0.05, { position: targetPos }, { easing: 'quadOut' }) // Tốc độ di chuyển phụ thuộc vào số ô
                .call(() => {
                    this.isMovingVehicle = false; // Xóa cờ khi hoàn thành di chuyển
                    this.checkForWinCondition();
                })
                .start();
        } else {
            // Xe không thể di chuyển (bị chặn ngay lập tức), không làm gì cả
            vehicle.snapToGrid(this.GRID_CELL_SIZE, this.gameBoardNode.getComponent(UITransform).width, this.gameBoardNode.getComponent(UITransform).height);
        }
    }

    private updateMovesLabel() {
        // this.movesLabel.string = `Moves: ${this.movesCount}`;
    }

    private checkForWinCondition() {
        // Điều kiện thắng: Xe chính (thường là xe hơi màu đỏ) đã thoát khỏi màn hình
        // Giả sử xe đầu tiên trong danh sách vehicles là xe cần thoát
        const mainCar = this.vehicles[0]; 
        const exitPoint = this.currentLevelData.exitPoints[0]; // Giả sử có 1 điểm thoát

        // Nếu không có xe nào trên màn hình, nghĩa là tất cả đã thoát (hoặc màn chơi trống)
        if (this.vehicles.length === 0) {
            this.handleWin();
            return;
        }

        let allVehiclesExited = true;

        // Lặp qua TẤT CẢ các xe hiện có trong danh sách
        for (let i = 0; i < this.vehicles.length; i++) {
            const vehicle = this.vehicles[i];

            // Nếu xe đã bị hủy (ví dụ: đã thoát và node đã bị remove), bỏ qua
            if (!vehicle || !vehicle.node || !vehicle.node.isValid) {
                continue; 
            }

            let isThisVehicleExited = false;

            // Để kiểm tra xem một xe đã thoát hay chưa, chúng ta cần so sánh vị trí của nó
            // với các điểm thoát có thể có HOẶC kiểm tra xem nó có nằm hoàn toàn ngoài lưới
            // theo hướng di chuyển của nó không.

            // Giả định rằng mỗi xe có một hướng thoát rõ ràng (dựa vào hướng của xe)
            // và rằng việc nó di chuyển ra ngoài biên là đủ điều kiện để thoát.
            // Nếu bạn có các "điểm thoát" cụ thể cho từng xe trong level data, bạn sẽ cần logic phức tạp hơn.
            // Với mô hình hiện tại (xe chỉ có một direction cố định), chúng ta có thể kiểm tra biên.

            const currentGridX = vehicle.gridX;
            const currentGridY = vehicle.gridY;

            switch (vehicle.direction) {
                case Direction.RIGHT:
                    // Xe thoát sang phải nếu phần cuối cùng của nó đã vượt qua biên phải của grid
                    if (currentGridX >= this.gridSizeX) { 
                        isThisVehicleExited = true;
                    }
                    break;
                case Direction.LEFT:
                    // Xe thoát sang trái nếu phần đầu tiên của nó đã vượt qua biên trái của grid
                    // (Lưu ý: Nếu vehicle.gridX là điểm bắt đầu của xe, thì nó cần nhỏ hơn 0 để thoát)
                    if (currentGridX + vehicle.length -1 < 0) { // Ví dụ xe dài 2, bắt đầu từ (0,y) -> (1,y). Muốn thoát sang trái thì gridX phải là -1, -2,...
                         isThisVehicleExited = true;
                    }
                    break;
                case Direction.UP:
                    // Xe thoát lên trên nếu phần cuối cùng của nó đã vượt qua biên trên của grid
                    if (currentGridY >= this.gridSizeY) { 
                        isThisVehicleExited = true;
                    }
                    break;
                case Direction.DOWN:
                    // Xe thoát xuống dưới nếu phần đầu tiên của nó đã vượt qua biên dưới của grid
                    if (currentGridY + vehicle.length - 1 < 0) {
                        isThisVehicleExited = true;
                    }
                    break;
            }

            if (isThisVehicleExited) {
                // Nếu xe này đã thoát, chúng ta có thể loại bỏ nó khỏi danh sách
                // để tránh kiểm tra lại và giảm số lượng xe cần duyệt.
                // Lưu ý: Việc modify array khi đang iterate cần cẩn thận.
                // Tốt hơn là tạo một danh sách mới các xe còn lại.
                
                // Để đơn giản hóa, chúng ta sẽ đánh dấu nó là "thoát"
                // và sẽ xóa nó khỏi danh sách vehicles sau khi vòng lặp kết thúc
                console.log(`Vehicle ${vehicle.node.name} (grid: ${vehicle.gridX}, ${vehicle.gridY}) has exited!`);
            } else {
                // Nếu có bất kỳ xe nào chưa thoát, thì toàn bộ điều kiện thắng chưa đạt
                allVehiclesExited = false;
                break; // Thoát vòng lặp sớm
            }
        }

        if (allVehiclesExited) {
            // Loại bỏ các node xe đã thoát khỏi scene và khỏi mảng `vehicles`
            // Đây là một cách an toàn để xóa các xe đã thoát
            this.vehicles = this.vehicles.filter(vehicle => {
                if (vehicle && vehicle.node && vehicle.node.isValid) {
                    // Kiểm tra lại điều kiện thoát cho xe này
                    const currentGridX = vehicle.gridX;
                    const currentGridY = vehicle.gridY;
                    let isIndeedExited = false;
                    switch (vehicle.direction) {
                        case Direction.RIGHT: if (currentGridX >= this.gridSizeX) isIndeedExited = true; break;
                        case Direction.LEFT: if (currentGridX + vehicle.length - 1 < 0) isIndeedExited = true; break;
                        case Direction.UP: if (currentGridY >= this.gridSizeY) isIndeedExited = true; break;
                        case Direction.DOWN: if (currentGridY + vehicle.length - 1 < 0) isIndeedExited = true; break;
                    }

                    if (isIndeedExited) {
                        vehicle.node.destroy(); // Hủy node của xe
                        return false; // Lọc bỏ xe này khỏi danh sách
                    }
                }
                return true; // Giữ lại xe này trong danh sách
            });
            
            // Sau khi lọc, nếu không còn xe nào trong mảng, nghĩa là tất cả đã thoát
            if (this.vehicles.length === 0) {
                this.handleWin();
            } else {
                // Điều này có thể xảy ra nếu có lỗi trong logic kiểm tra thoát hoặc level design
                console.warn("Some vehicles were thought to be exited but are still in the array after filtering. Check win condition logic or level setup.");
            }
        }
    }

     private handleWin() {
        console.log("You Win!");
        this.levelCleared();
        // Hiển thị pop-up thắng cuộc
        // Chuyển sang màn chơi tiếp theo sau một khoảng thời gian
        // this.currentLevelIndex++;
        // this.scheduleOnce(() => {
        //     this.loadLevel(this.currentLevelIndex);
        // }, 2); // 2 giây
    }

    // --- Dữ liệu màn chơi giả lập ---
    private getMockLevelData(index: number): LevelData | null {
        console.log('load data');
        const levels: LevelData[] = [
            {
                levelId: 1,
                gridSizeX: 6,
                gridSizeY: 6,
                vehicles: [
                    // { type: 'car', startX: -1, startY: 2, direction: Direction.RIGHT, length: 2 }, // Xe chính
                    // // { type: 'truck', startX: 2, startY: 0, direction: Direction.DOWN, length: 3 },
                    // { type: 'car', startX: 2, startY: 2, direction: Direction.RIGHT, length: 2 },
                    // // { type: 'truck', startX: 0, startY: 4, direction: Direction.RIGHT, length: 3 },
                    // { type: 'car', startX: -1, startY: 5, direction: Direction.RIGHT, length: 2 },
                    // { type: 'car', startX: 2, startY: 5, direction: Direction.RIGHT, length: 2 },
                    // { type: 'car', startX: 5, startY: 16, direction: Direction.DOWN, length: 2 },
                    { type: 'car', startX: 0, startY: 2, direction: Direction.RIGHT, length: 2 }, // Xe chính
                    // { type: 'truck', startX: 2, startY: 0, direction: Direction.DOWN, length: 3 },
                    { type: 'car', startX: 4, startY: 2, direction: Direction.RIGHT, length: 2 },
                    // { type: 'truck', startX: 0, startY: 4, direction: Direction.RIGHT, length: 3 },
                    { type: 'car', startX: 5, startY: 4, direction: Direction.DOWN, length: 2 },
                ],
                exitPoints: [{x: 5, y: 2, direction: Direction.RIGHT}] // Điểm thoát của xe chính
            },
            {
                levelId: 2,
                gridSizeX: 6,
                gridSizeY: 6,
                vehicles: [
                    { type: 'car', startX: 0, startY: 3, direction: Direction.RIGHT, length: 2 }, // Xe chính
                    { type: 'truck', startX: 2, startY: 0, direction: Direction.DOWN, length: 3 },
                    { type: 'car', startX: 4, startY: 1, direction: Direction.DOWN, length: 2 },
                    { type: 'truck', startX: 0, startY: 0, direction: Direction.DOWN, length: 3 },
                    { type: 'car', startX: 3, startY: 4, direction: Direction.RIGHT, length: 2 },
                ],
                exitPoints: [{x: 5, y: 3, direction: Direction.RIGHT}] // Điểm thoát của xe chính
            }
        ];
        return levels[index] || null;
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
        GameManager.time = 15;
        this.timeCd();
        this.endLevelMessageLabel.node.active = true;
        this.endLevelPanel.active = false;
        director.preloadScene("GameScene"); // Reload current scene
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
        GameManager.time = 15;
        GameManager.timeCdCallback = function () {
            this.timeLabel.string = `${GameManager.time}`;
            if (GameManager.time === 0) {
                // Cancel this timer at the sixth call-back
                GameManager.time = 15;
                this.unschedule(GameManager.timeCdCallback);
                this.gameOver();
            }
            GameManager.time--;
        }
        this.schedule(GameManager.timeCdCallback, 1);
    }
}


