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
    this.loadSettings();
    this.setupListeners();
};

BeatMakerModule.prototype.loadSettings = function () {
    if (!window.settings) return;
    var settings = window.settings.get('beatMaker');
    if (!settings) return;

    var thresSlider = document.getElementById('beat-threshold');
    var thresLabel = document.getElementById('beat-threshold-val');
    var chanSelect = document.getElementById('beat-channel');

    if (thresSlider && settings.threshold !== undefined) {
        thresSlider.value = settings.threshold;
        if (thresLabel) thresLabel.textContent = settings.threshold;
    }
    if (chanSelect && settings.channel) {
        chanSelect.value = settings.channel;
    }

    if (settings.lastSubTab) {
        var btn = settings.lastSubTab === 'auto' ? document.getElementById(this.autoBtnId) : document.getElementById(this.manualBtnId);
        if (btn) btn.click();
    }
};

BeatMakerModule.prototype.saveSettings = function () {
    if (!window.settings) return;
    var thres = document.getElementById('beat-threshold').value;
    var chan = document.getElementById('beat-channel').value;
    var lastSub = document.getElementById(this.autoBtnId).classList.contains('active') ? 'auto' : 'manual';
    
    window.settings.set('beatMaker', {
        threshold: thres,
        channel: chan,
        lastSubTab: lastSub
    });
};

BeatMakerModule.prototype.setupListeners = function () {
    var self = this;

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
            self.saveSettings();
        });

        btnAuto.addEventListener('click', function () {
            btnAuto.classList.add('active');
            btnManual.classList.remove('active');
            panelAuto.style.display = 'block';
            panelManual.style.display = 'none';
            self.saveSettings();
        });
    }

    var tapBtn = document.getElementById(this.tapBtnId);
    if (tapBtn) {
        tapBtn.addEventListener('click', function (e) {
            self.tap(e);
        });
    }

    var autoDetectBtn = document.getElementById(this.autoDetectBtnId);
    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', function () {
            var thres = document.getElementById('beat-threshold').value;
            var chan = document.getElementById('beat-channel').value;
            self.autoDetect(thres, chan);
        });
    }

    var thresSlider = document.getElementById('beat-threshold');
    var thresLabel = document.getElementById('beat-threshold-val');
    if (thresSlider && thresLabel) {
        thresSlider.addEventListener('input', function() {
            thresLabel.textContent = this.value;
            self.saveSettings();
        });
    }

    var chanSelect = document.getElementById('beat-channel');
    if (chanSelect) {
        chanSelect.addEventListener('change', function () {
            self.saveSettings();
        });
    }

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

    if (self.cs) {
        self.cs.evalScript('executeTool("BEATMARK")', function (res) {
            if (res === 'NO_COMP') {
                if (window.ModalModule) {
                    window.ModalModule.warn('Please open a composition first before tapping beats.', 'Beat Maker');
                }
                return;
            }
            tapBtn.classList.add('pulse');
            setTimeout(function () {
                tapBtn.classList.remove('pulse');
            }, 300);
        });
    }
};

BeatMakerModule.prototype.autoDetect = function (threshold, channel) {
    var self = this;
    if (!self.cs) return;

    self.cs.evalScript('(function(){ var c = app.project.activeItem; if (!c || !(c instanceof CompItem)) return "NO_COMP"; if (c.selectedLayers.length === 0) return "NO_LAYER"; if (!c.selectedLayers[0].hasAudio) return "NO_AUDIO"; return "OK"; })()', function (res) {
        if (res === 'NO_COMP') {
            if (window.ModalModule) window.ModalModule.warn('Please open a composition first.', 'Auto Beat Detect');
            return;
        }
        if (res === 'NO_LAYER') {
            if (window.ModalModule) window.ModalModule.warn('Please select an audio layer in the composition.', 'Auto Beat Detect');
            return;
        }
        if (res === 'NO_AUDIO') {
            if (window.ModalModule) window.ModalModule.warn('The selected layer has no audio. Please select an audio layer.', 'Auto Beat Detect');
            return;
        }

        self.cs.evalScript('executeTool("BEAT_AUTO", "' + threshold + '", "' + channel + '")', function (res) {
            if (res && res.indexOf("ERROR") !== -1) {
                if (window.ModalModule) window.ModalModule.error(res.replace("ERROR:", ""), "Auto Beat");
            }
        });
    });
};

BeatMakerModule.prototype.clearAll = function () {
    var self = this;
    if (self.cs) {
        self.cs.evalScript('executeTool("CLEARBEATS")', function (res) {
            if (res === 'NO_COMP') {
                if (window.ModalModule) {
                    window.ModalModule.warn('Please open a composition first to clear beat markers.', 'Beat Maker');
                }
            }
        });
    }
};
