window.StopwatchModule = class StopwatchModule {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isRunning = false;

        this.display = null;
        this.startBtn = null;
        this.stopBtn = null;
        this.resetBtn = null;
    }

    init() {
        this.display = document.getElementById('stopwatch-display');
        this.startBtn = document.getElementById('sw-start');
        this.stopBtn = document.getElementById('sw-stop');
        this.resetBtn = document.getElementById('sw-reset');

        if (!this.display || !this.startBtn || !this.stopBtn || !this.resetBtn) {
            console.error("StopwatchModule: One or more UI elements not found.");
            return;
        }

        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.updateDisplay();
    }

    start() {
        if (!this.isRunning) {
            this.startTime = Date.now() - this.elapsedTime;
            this.timerInterval = setInterval(() => {
                this.elapsedTime = Date.now() - this.startTime;
                this.updateDisplay();
            }, 10);
            this.isRunning = true;
            this.toggleButtons();
        }
    }

    stop() {
        if (this.isRunning) {
            clearInterval(this.timerInterval);
            this.elapsedTime = Date.now() - this.startTime;
            this.isRunning = false;
            this.toggleButtons();
        }
    }

    reset() {
        this.stop();
        this.elapsedTime = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.display) return;
        const time = new Date(this.elapsedTime);
        const minutes = String(time.getUTCMinutes()).padStart(2, '0');
        const seconds = String(time.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(Math.floor(time.getUTCMilliseconds() / 10)).padStart(2, '0');
        this.display.textContent = `${minutes}:${seconds}:${milliseconds}`;
    }

    toggleButtons() {
        if (this.startBtn) this.startBtn.disabled = this.isRunning;
        if (this.stopBtn) this.stopBtn.disabled = !this.isRunning;
    }
}
