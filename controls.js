// ========================
// Input Handling & Controls
// ========================

let controlMode = 'swipe';

document.addEventListener('keydown', (e) => {
    if (game.isGameOver) return;
    
    // Ignore keys if settings modal is open
    if (!document.getElementById('settingsModal').classList.contains('hidden')) return;
    
    if (e.key === 'p' || e.key === 'Escape') togglePause();
    
    if (game.isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            game.move(-1, 0);
            e.preventDefault();
            break;
        case 'ArrowRight':
            game.move(1, 0);
            e.preventDefault();
            break;
        case 'ArrowDown':
            game.fastDrop = true;
            e.preventDefault();
            break;
        case 'ArrowUp':
            game.rotate();
            e.preventDefault();
            break;
        case ' ':
            game.hardDrop();
            e.preventDefault();
            break;
        case 'c':
        case 'C':
            game.holdPiece();
            e.preventDefault();
            break;
    }
    
    if (game.onDraw) game.onDraw();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') {
        game.fastDrop = false;
    }
});

// Touch / Swipe
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
let touchVerticalTriggered = false;
const SWIPE_THRESHOLD = 30;

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.btn') || e.target.closest('.ctrl-btn') || e.target.closest('.overlay') || e.target.closest('.modal')) return;
    
    if (controlMode === 'buttons') return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
    touchVerticalTriggered = false;
}, {passive: false});

document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.btn') || e.target.closest('.ctrl-btn') || e.target.closest('.overlay') || e.target.closest('.modal')) return;
    if (controlMode === 'buttons') return;
    if (game.isPaused || game.isGameOver) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const dx = touchX - touchStartX;
    const dy = touchY - touchStartY;
    
    if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
        touchMoved = true;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0) {
                game.move(1, 0);
            } else {
                game.move(-1, 0);
            }
            touchStartX = touchX; // Reset to allow continuous moving
        } else {
            // Vertical swipe (padidintas jautrumo slenkstis iš 1.5 į 2.5)
            if (!touchVerticalTriggered) {
                if (dy > 0 && dy > SWIPE_THRESHOLD * 2.5) {
                    game.hardDrop();
                    touchVerticalTriggered = true;
                } else if (dy < -SWIPE_THRESHOLD * 2.5) {
                    game.holdPiece();
                    touchVerticalTriggered = true;
                }
            }
        }
        if (game.onDraw) game.onDraw();
        e.preventDefault(); 
    }
}, {passive: false});

document.addEventListener('touchend', (e) => {
    if (e.target.closest('.btn') || e.target.closest('.ctrl-btn') || e.target.closest('.overlay') || e.target.closest('.modal')) return;
    if (controlMode === 'buttons') return;
    if (game.isPaused || game.isGameOver) return;

    if (!touchMoved) {
        // Tap = rotate
        game.rotate();
        if (game.onDraw) game.onDraw();
        
        // Prevent synthesize click events on tap
        if (e.cancelable) e.preventDefault();
    }
}, {passive: false});

// Mobile Buttons
let controlIntervals = {};

function handleControlStart(action) {
    if (game.isPaused || game.isGameOver) return;
    
    audio.playButton();
    if (navigator.vibrate) navigator.vibrate(10); // Haptic feedback
    
    const trigger = () => {
        switch(action) {
            case 'left': game.move(-1, 0); break;
            case 'right': game.move(1, 0); break;
            case 'rotate': game.rotate(); break;
            case 'drop': game.hardDrop(); break;
        }
        if (game.onDraw) game.onDraw();
    };
    
    trigger();
    
    if (action === 'left' || action === 'right') {
        controlIntervals[action] = setTimeout(() => {
            controlIntervals[action] = setInterval(trigger, 100);
        }, 200);
    }
}

function handleControlEnd(action) {
    if (controlIntervals[action]) {
        clearInterval(controlIntervals[action]);
        clearTimeout(controlIntervals[action]);
        delete controlIntervals[action];
    }
}
