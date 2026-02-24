'use strict';

window.StopwatchModule = function StopwatchModule() {
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isRunning = false;

    this.display = null;
    this.startBtn = null;
    this.stopBtn = null;
    this.resetBtn = null;
};

StopwatchModule.prototype.init = function () {
    var self = this;
    this.display = document.getElementById('stopwatch-display');
    this.startBtn = document.getElementById('sw-start');
    this.stopBtn = document.getElementById('sw-stop');
    this.resetBtn = document.getElementById('sw-reset');

    if (!this.display || !this.startBtn || !this.stopBtn || !this.resetBtn) {
        console.error("StopwatchModule: One or more UI elements not found.");
        return;
    }

    this.startBtn.addEventListener('click', function () { self.start(); });
    this.stopBtn.addEventListener('click', function () { self.stop(); });
    this.resetBtn.addEventListener('click', function () { self.reset(); });
    this.updateDisplay();
};

StopwatchModule.prototype.start = function () {
    var self = this;
    if (!this.isRunning) {
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(function () {
            self.elapsedTime = Date.now() - self.startTime;
            self.updateDisplay();
        }, 10);
        this.isRunning = true;
        this.toggleButtons();
    }
};

StopwatchModule.prototype.stop = function () {
    if (this.isRunning) {
        clearInterval(this.timerInterval);
        this.elapsedTime = Date.now() - this.startTime;
        this.isRunning = false;
        this.toggleButtons();
    }
};

StopwatchModule.prototype.reset = function () {
    this.stop();
    this.elapsedTime = 0;
    this.updateDisplay();
};

StopwatchModule.prototype.updateDisplay = function () {
    if (!this.display) return;
    var time = new Date(this.elapsedTime);
    var minutes = String(time.getUTCMinutes()).padStart(2, '0');
    var seconds = String(time.getUTCSeconds()).padStart(2, '0');
    var milliseconds = String(Math.floor(time.getUTCMilliseconds() / 10)).padStart(2, '0');
    this.display.textContent = minutes + ':' + seconds + ':' + milliseconds;
};

StopwatchModule.prototype.toggleButtons = function () {
    if (this.startBtn) this.startBtn.disabled = this.isRunning;
    if (this.stopBtn) this.stopBtn.disabled = !this.isRunning;
};
