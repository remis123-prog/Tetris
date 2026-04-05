// ========================
// UI and Rendering Engine
// ========================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

let animationFrameId;

function resizeCanvas() {
    const container = document.querySelector('.board-container');
    const panel = document.querySelector('.left-panel');
    const isMobile = window.innerWidth <= 600;
    
    // Calculate max possible height. On mobile, leave room for top info bar (~70px) and bottom controls.
    const maxH = window.innerHeight - (isMobile ? document.getElementById('mobileControls').offsetHeight + 80 : 40);
    
    const tileH = Math.floor(maxH / ROWS);
    // On mobile, panels are at the top, so board can take almost full width
    const availableW = isMobile ? window.innerWidth - 20 : window.innerWidth - (panel.offsetWidth * 2 + 30);
    const tileW = Math.floor(availableW / COLS);
    
    // Let blocks be as large as possible without exceeding max dimensions
    const tileSize = Math.min(tileW, tileH, 45); 
    
    canvas.width = tileSize * COLS;
    canvas.height = tileSize * ROWS;
    
    window.TILE_SIZE = tileSize;
    
    if (game && game.onDraw) game.onDraw();
}

window.addEventListener('resize', resizeCanvas);


function drawBlock(context, x, y, size, color, glow = true) {
    if (!color) return;
    
    context.fillStyle = color;
    
    if (glow && color !== 'rgba(255, 255, 255, 0.2)') {
        context.shadowBlur = 10;
        context.shadowColor = color;
    } else {
        context.shadowBlur = 0;
    }
    
    const r = size * 0.15;
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + size - r, y);
    context.arcTo(x + size, y, x + size, y + r, r);
    context.lineTo(x + size, y + size - r);
    context.arcTo(x + size, y + size, x + size - r, y + size, r);
    context.lineTo(x + r, y + size);
    context.arcTo(x, y + size, x, y + size - r, r);
    context.lineTo(x, y + r);
    context.arcTo(x, y, x + r, y, r);
    context.fill();
    
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    context.fillRect(x + 2, y + 2, size - 4, size - 4);
}

function drawGrid(context, w, h, size) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    context.lineWidth = 1;
    context.beginPath();
    for (let i = 0; i <= w; i++) {
        context.moveTo(i * size, 0);
        context.lineTo(i * size, h * size);
    }
    for (let i = 0; i <= h; i++) {
        context.moveTo(0, i * size);
        context.lineTo(w * size, i * size);
    }
    context.stroke();
}

function drawMiniPiece(context, canvasObj, pieceType) {
    context.clearRect(0, 0, canvasObj.width, canvasObj.height);
    if (!pieceType) return;
    
    const shape = SHAPES[pieceType];
    const color = COLORS[pieceType];
    const size = 20;
    
    const shapeW = shape[0].length * size;
    const shapeH = shape.length * size;
    const offsetX = (canvasObj.width - shapeW) / 2;
    const offsetY = (canvasObj.height - shapeH) / 2;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(context, offsetX + x * size, offsetY + y * size, size, color, true);
            }
        }
    }
}

function draw() {
    const size = window.TILE_SIZE || 30;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, COLS, ROWS, size);
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (game.grid[y][x]) {
                drawBlock(ctx, x * size, y * size, size, COLORS[game.grid[y][x]]);
            }
        }
    }
    
    if (game.ghostEnabled && !game.isGameOver) {
        const ghost = game.getGhost();
        if (ghost) {
            for (let y = 0; y < ghost.shape.length; y++) {
                for (let x = 0; x < ghost.shape[y].length; x++) {
                    if (ghost.shape[y][x]) {
                        drawBlock(ctx, (ghost.x + x) * size, (ghost.y + y) * size, size, 'rgba(255, 255, 255, 0.2)', false);
                    }
                }
            }
        }
    }
    
    if (!game.isGameOver) {
        for (let y = 0; y < game.current.shape.length; y++) {
            for (let x = 0; x < game.current.shape[y].length; x++) {
                if (game.current.shape[y][x]) {
                    drawBlock(ctx, (game.current.x + x) * size, (game.current.y + y) * size, size, COLORS[game.current.typeId]);
                }
            }
        }
    }
    
    drawMiniPiece(nextCtx, nextCanvas, game.next.typeId);
    drawMiniPiece(holdCtx, holdCanvas, game.hold);
}

function gameLoop(time) {
    if (!game.isPaused && !game.isGameOver) {
        game.update(time);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('scoreDisplay').innerText = game.score;
    document.getElementById('levelDisplay').innerText = game.level;
    document.getElementById('linesDisplay').innerText = game.lines;
}

game.onScoreChange = updateUI;
game.onDraw = draw;
game.onGameOver = () => {
    document.getElementById('finalScore').innerText = game.score;
    document.getElementById('gameOverOverlay').classList.remove('hidden');
};

function startGame() {
    audio.playButton();
    audio.init();
    
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('gameOverOverlay').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');
    
    // Initial Setup for mobile
    setTimeout(() => {
        resizeCanvas();
        game.reset();
        updateUI();
        draw();
        
        cancelAnimationFrame(animationFrameId);
        game.lastDropTime = performance.now();
        gameLoop(game.lastDropTime);
    }, 50);
}

function togglePause() {
    audio.playButton();
    game.isPaused = !game.isPaused;
    const overlay = document.getElementById('pauseOverlay');
    if (game.isPaused) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
        game.lastDropTime = performance.now();
    }
}

function quitToMenu() {
    audio.playButton();
    cancelAnimationFrame(animationFrameId);
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('startScreen').classList.add('active');
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
}

function openSettings() {
    audio.playButton();
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    audio.playButton();
    document.getElementById('settingsModal').classList.add('hidden');
}

function updateSettingsUI(category, val) {
    const btns = document.querySelectorAll(`.opt-btn[data-${category}]`);
    btns.forEach(b => {
        if (b.dataset[category] === val) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

window.setControlMode = function(mode) {
    controlMode = mode;
    const mobileControls = document.getElementById('mobileControls');
    
    if (mode === 'swipe') {
        mobileControls.classList.add('hidden');
    } else {
        mobileControls.classList.remove('hidden');
    }
    updateSettingsUI('control', mode);
};

function toggleSound(enabled) {
    audio.playButton();
    audio.setEnabled(enabled);
    updateSettingsUI('sound', enabled ? 'on' : 'off');
}

function toggleGhost(enabled) {
    audio.playButton();
    game.ghostEnabled = enabled;
    updateSettingsUI('ghost', enabled ? 'on' : 'off');
    if (game.onDraw) game.onDraw();
}

// Ensure the starting set control UI matches initialization
setControlMode('swipe');
