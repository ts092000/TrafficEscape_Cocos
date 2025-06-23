export enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

export interface VehicleConfig {
    type: string; // 'car', 'truck', 'bus', etc.
    startX: number; // Vị trí bắt đầu X trên grid
    startY: number; // Vị trí bắt đầu Y trên grid
    direction: Direction; // Hướng di chuyển (UP, DOWN, LEFT, RIGHT)
    length: number; // Chiều dài của xe (số ô chiếm)
}

export interface ExitPoint {
    x: number;
    y: number;
    direction: Direction; // Hướng xe cần đi qua điểm này để thoát
}

export interface LevelData {
    levelId: number;
    gridSizeX: number; // Kích thước grid theo X
    gridSizeY: number; // Kích thước grid theo Y
    vehicles: VehicleConfig[];
    exitPoints: ExitPoint[];
    // Có thể thêm pedestrian, obstacles, boosters...
}