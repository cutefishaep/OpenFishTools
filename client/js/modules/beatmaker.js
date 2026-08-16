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
        self.cs.evalScript('tools.BEATMARK()', function (res) {
            var data = null;
            try { data = JSON.parse(res); } catch (e) {}
            if (data && data.error) {
                if (window.ModalModule) window.ModalModule.warn(data.message, 'Beat Maker');
                return;
            }
            if (tapBtn) {
                tapBtn.classList.add('pulse');
                setTimeout(function () {
                    tapBtn.classList.remove('pulse');
                }, 250);
            }
        });
    }
};

BeatMakerModule.prototype.autoDetect = function (threshold, channel) {
    var self = this;
    if (!self.cs) return;

    var btn = document.getElementById(this.autoDetectBtnId);
    var origHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons rotating" style="font-size:15px; margin-right:6px;">sync</span> Analyzing Audio...';
    }

    self.cs.evalScript('tools.BEAT_AUTO("' + threshold + '", "' + channel + '")', function (res) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHTML;
        }

        var data = null;
        try {
            data = JSON.parse(res);
        } catch (e) {
            if (res && res.indexOf("ERROR:") === 0) {
                data = { error: true, message: res.replace("ERROR:", "") };
            } else if (res && res.indexOf("SUCCESS") === 0) {
                data = { success: true, message: "Beat markers generated!" };
            }
        }

        if (!data) return;

        if (data.error) {
            if (window.ModalModule) {
                if (data.type === 'warn') {
                    window.ModalModule.warn(data.message, 'Auto Beat Detect');
                } else {
                    window.ModalModule.error(data.message, 'Auto Beat Detect');
                }
            }
        } else if (data.success) {
            if (window.ModalModule) {
                window.ModalModule.info(data.message || (data.count + ' beat markers created!'), 'Auto Beat Detect');
            }
        }
    });
};

BeatMakerModule.prototype.clearAll = function () {
    var self = this;
    if (!self.cs) return;

    self.cs.evalScript('tools.CLEARBEATS()', function (res) {
        var data = null;
        try { data = JSON.parse(res); } catch (e) {}
        if (data && data.error) {
            if (window.ModalModule) window.ModalModule.warn(data.message, 'Beat Maker');
        } else if (data && data.success) {
            if (window.ModalModule) window.ModalModule.info(data.message, 'Beat Maker');
        }
    });
};
