'use strict';

window.BeatMakerModule = function BeatMakerModule() {
    this.cs = null;
    this.tapBtnId = 'beat-tap-btn';
    this.clearBtnId = 'beat-clear-btn';
    this.manualBtnId = 'btn-beat-manual';
    this.autoBtnId = 'btn-beat-auto';
    this.autoDetectBtnId = 'btn-beat-auto-detect';
    this.manualControlsId = 'beat-manual-controls';
    this.autoControlsId = 'beat-auto-controls';
};

BeatMakerModule.prototype.init = function (csInterface) {
    this.cs = csInterface;
    this.setupListeners();
};

BeatMakerModule.prototype.setupListeners = function () {
    var self = this;

    // Mode Switching
    var btnManual = document.getElementById(this.manualBtnId);
    var btnAuto = document.getElementById(this.autoBtnId);
    var panelManual = document.getElementById(this.manualControlsId);
    var panelAuto = document.getElementById(this.autoControlsId);

    if (btnManual && btnAuto) {
        btnManual.addEventListener('click', function () {
            btnManual.classList.add('active');
            btnAuto.classList.remove('active');
            panelManual.style.display = 'block';
            panelAuto.style.display = 'none';
        });

        btnAuto.addEventListener('click', function () {
            btnAuto.classList.add('active');
            btnManual.classList.remove('active');
            panelAuto.style.display = 'block';
            panelManual.style.display = 'none';
        });
    }

    // Manual Tap
    var tapBtn = document.getElementById(this.tapBtnId);
    if (tapBtn) {
        tapBtn.addEventListener('click', function (e) {
            self.tap(e);
        });
    }

    // Auto Detect
    var autoDetectBtn = document.getElementById(this.autoDetectBtnId);
    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', function () {
            self.autoDetect();
        });
    }

    // Clear All
    var clearBtn = document.getElementById(this.clearBtnId);
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            self.clearAll();
        });
    }
};

BeatMakerModule.prototype.tap = function (e) {
    var self = this;
    var tapBtn = document.getElementById(this.tapBtnId);

    // Anim feedback
    tapBtn.classList.add('pulse');
    setTimeout(function () { 
        tapBtn.classList.remove('pulse');
    }, 300);

    if (self.cs) {
        self.cs.evalScript('executeTool("BEATMARK")', function () { });
    }
};

BeatMakerModule.prototype.autoDetect = function () {
    var self = this;
    if (!self.cs) return;

    // Check if layer is selected first (Simple check via evalScript)
    self.cs.evalScript('app.project.activeItem && app.project.activeItem.selectedLayers.length > 0', function (res) {
        if (res === "false" || res === "0") {
            if (window.ModalModule) {
                window.ModalModule.error("Please select an audio layer first!", "Auto Beat");
            }
            return;
        }

        // Run the auto beat script
        self.cs.evalScript('executeTool("BEAT_AUTO")', function (res) {
            if (res && res.indexOf("ERROR") !== -1) {
                if (window.ModalModule) window.ModalModule.error(res.replace("ERROR:", ""), "Auto Beat");
            }
        });
    });
};

BeatMakerModule.prototype.clearAll = function () {
    var self = this;
    if (self.cs) {
        self.cs.evalScript('executeTool("CLEARBEATS")', function () { });
    }
};
