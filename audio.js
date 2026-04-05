// ========================
// Audio Engine – lightweight synth-based sound effects
// ========================

class AudioEngine {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    _ensureContext() {
        if (!this._initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play a short tone
    _tone(freq, duration, type = 'square', volume = 0.12) {
        if (!this.enabled || !this.ctx) return;
        this._ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    // Piece moves left/right
    playMove() {
        this._tone(300, 0.06, 'square', 0.06);
    }

    // Piece rotates
    playRotate() {
        this._tone(500, 0.08, 'sine', 0.1);
    }

    // Piece lands (locks)
    playLand() {
        this._tone(150, 0.15, 'triangle', 0.15);
    }

    // Line clear
    playClear(lineCount) {
        const t = this.ctx ? this.ctx.currentTime : 0;
        if (!this.enabled || !this.ctx) return;
        this._ensureContext();

        // ascending arpeggio
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        const count = Math.min(lineCount, 4);
        for (let i = 0; i < count; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[i], t + i * 0.08);
            gain.gain.setValueAtTime(0.12, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.2);
        }
    }

    // Hard drop
    playDrop() {
        this._tone(100, 0.12, 'sawtooth', 0.1);
        setTimeout(() => this._tone(80, 0.1, 'triangle', 0.08), 50);
    }

    // Hold piece
    playHold() {
        this._tone(440, 0.05, 'sine', 0.08);
        setTimeout(() => this._tone(550, 0.05, 'sine', 0.08), 60);
    }

    // Game over
    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        this._ensureContext();
        const t = this.ctx.currentTime;
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            gain.gain.setValueAtTime(0.1, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.3);
        });
    }

    // Button press
    playButton() {
        this._tone(600, 0.04, 'sine', 0.06);
    }

    setEnabled(val) {
        this.enabled = val;
    }
}

const audio = new AudioEngine();
