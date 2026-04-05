// ========================
// Tetris Game Logic Engine
// ========================

const COLS = 10;
const ROWS = 20;

// Colors for pieces (I, J, L, O, S, T, Z)
const COLORS = [
    null,
    '#00e5ff', // Cyan (I)
    '#2962ff', // Blue (J)
    '#ff6d00', // Orange (L)
    '#ffe500', // Yellow (O)
    '#00e676', // Green (S)
    '#ff00e5', // Magenta (T)
    '#ff1744'  // Red (Z)
];

// Tetromino shapes 
const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

class Piece {
    constructor(typeId) {
        this.typeId = typeId;
        this.shape = SHAPES[typeId];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }
}

class Game {
    constructor() {
        this.reset();
        this.onGameOver = null;
        this.onLineClear = null;
        this.onScoreChange = null;
        this.onDraw = null;
        
        this.ghostEnabled = true;
    }

    reset() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.isGameOver = false;
        this.isPaused = false;
        this.current = this.randomPiece();
        this.next = this.randomPiece();
        this.hold = null;
        this.canHold = true;
        
        this.dropInterval = 1000;
        this.lastDropTime = 0;
        this.fastDrop = false;
        this.updateSpeed();
    }

    randomPiece() {
        const typeId = Math.floor(Math.random() * 7) + 1;
        return new Piece(typeId);
    }

    updateSpeed() {
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    }

    update(time) {
        if (this.isGameOver || this.isPaused) return;

        const deltaTime = time - this.lastDropTime;
        const currentInterval = this.fastDrop ? this.dropInterval / 10 : this.dropInterval;

        if (deltaTime > currentInterval) {
            this.moveDown();
            this.lastDropTime = time;
        }
        
        if (this.onDraw) this.onDraw();
    }

    move(dirX, dirY) {
        this.current.x += dirX;
        this.current.y += dirY;
        if (this.checkCollision()) {
            this.current.x -= dirX;
            this.current.y -= dirY;
            return false;
        }
        audio.playMove();
        return true;
    }

    moveDown() {
        if (!this.move(0, 1)) {
            this.lock();
            audio.playLand();
            this.clearLines();
            this.spawnNext();
        }
    }

    hardDrop() {
        while (this.move(0, 1)) {}
        this.lock();
        audio.playDrop();
        this.clearLines();
        this.spawnNext();
        
        if (this.onDraw) this.onDraw();
    }

    rotate() {
        const originalShape = this.current.shape;
        const N = originalShape.length;
        // Transpose and reverse rows (rotate 90 deg clockwise)
        const newShape = Array.from({length: N}, () => Array(N).fill(0));
        for (let y = 0; y < N; ++y) {
            for (let x = 0; x < N; ++x) {
                newShape[x][N - 1 - y] = originalShape[y][x];
            }
        }
        
        this.current.shape = newShape;
        
        let offset = 0;
        if (this.checkCollision()) {
            this.current.x += 1;
            if (this.checkCollision()) {
                this.current.x -= 2;
                if (this.checkCollision()) {
                    this.current.x += 1;
                    this.current.y -= 1; // Floor kick
                    if(this.checkCollision()) {
                        this.current.y += 1; // Revert everything
                        this.current.shape = originalShape;
                        return false;
                    }
                }
            }
        }
        audio.playRotate();
        return true;
    }

    holdPiece() {
        if (!this.canHold) return;
        
        const temp = this.current.typeId;
        if (this.hold === null) {
            this.hold = temp;
            this.spawnNext();
        } else {
            this.current = new Piece(this.hold);
            this.current.y = 0;
            this.hold = temp;
        }
        
        this.canHold = false;
        audio.playHold();
        if (this.onDraw) this.onDraw();
    }

    checkCollision(piece = this.current) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] !== 0) {
                    const gx = piece.x + x;
                    const gy = piece.y + y;
                    
                    if (gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && this.grid[gy][gx] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lock() {
        for (let y = 0; y < this.current.shape.length; y++) {
            for (let x = 0; x < this.current.shape[y].length; x++) {
                if (this.current.shape[y][x] !== 0) {
                    const gy = this.current.y + y;
                    const gx = this.current.x + x;
                    if (gy < 0) {
                        this.gameOver();
                        return;
                    }
                    this.grid[gy][gx] = this.current.shape[y][x];
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; 
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[linesCleared] * this.level;
            
            audio.playClear(linesCleared);
            
            if (this.lines >= this.level * 10) {
                this.level++;
                this.updateSpeed();
            }
            
            if (this.onLineClear) this.onLineClear();
            if (this.onScoreChange) this.onScoreChange();
        }
    }

    spawnNext() {
        this.current = this.next;
        this.next = this.randomPiece();
        this.canHold = true;
        this.fastDrop = false;
        
        if (this.checkCollision()) {
            this.gameOver();
        }
    }

    getGhost() {
        if (!this.ghostEnabled) return null;
        const ghost = new Piece(this.current.typeId);
        ghost.shape = this.current.shape;
        ghost.x = this.current.x;
        ghost.y = this.current.y;
        
        while (!this.checkCollision(ghost)) {
            ghost.y++;
        }
        ghost.y--;
        return ghost;
    }

    gameOver() {
        this.isGameOver = true;
        audio.playGameOver();
        if (this.onGameOver) this.onGameOver();
    }
}

const game = new Game();
