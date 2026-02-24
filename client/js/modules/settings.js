'use strict';

window.SettingsModule = function SettingsModule() {
    this.defaults = {
        version: window.EXTENSION_VERSION,

        navAutoHide: false,
        tipsEnabled: true
    };

    this.settings = JSON.parse(JSON.stringify(this.defaults));
};

SettingsModule.prototype.init = function () {
    try {
        this.loadSettings();
        this.applySettings();
        this.setupListeners();
    } catch (e) {
        console.error("Settings init failure:", e);
    }
};

SettingsModule.prototype.setupListeners = function () {
    var self = this;

    var safeAddListener = function (id, event, callback) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, callback);
        }
    };

    safeAddListener('btn-reset-settings', 'click', function () { self.resetSettings(); });
};

SettingsModule.prototype.loadSettings = function () {
    try {
        var saved = localStorage.getItem('fishToolsConfig');
        if (saved) {
            try {
                var loaded = JSON.parse(saved);

                for (var key in loaded) {
                    if (loaded.hasOwnProperty(key)) {
                        if (key !== 'customColors') {
                            this.settings[key] = loaded[key];
                        }
                    }
                }
            } catch (parseError) {
                console.error("Settings: JSON parse error", parseError);
            }
        }
    } catch (e) {
        console.error("Settings load error:", e);
    }
};

SettingsModule.prototype.saveSettings = function () {
    try {
        var data = JSON.stringify(this.settings, null, 4);
        localStorage.setItem('fishToolsConfig', data);
    } catch (e) {
        console.error("Settings save error:", e);
    }
};

SettingsModule.prototype.applySettings = function () {

    this.restoreLastTab();
};

SettingsModule.prototype.restoreLastTab = function () {
    var lastTab = this.settings.lastTab || 'main';
    var tabBtn = document.querySelector('.tab-btn[data-tab="' + lastTab + '"]');
    if (tabBtn) {
        tabBtn.click();
    }
};

SettingsModule.prototype.get = function (key) {
    return this.settings[key];
};

SettingsModule.prototype.set = function (key, value) {
    this.settings[key] = value;
    this.saveSettings();
};

SettingsModule.prototype.saveLastTab = function (tabName) {
    if (this.settings.lastTab === tabName) return;
    this.settings.lastTab = tabName;
    this.saveSettings();
};

SettingsModule.prototype.resetSettings = function () {
    var self = this;
    window.ModalModule.confirm("Are you sure you want to reset all settings to factory default?", "Factory Reset", function (confirmed) {
        if (confirmed) {
            self.settings = JSON.parse(JSON.stringify(self.defaults));
            self.saveSettings();
            setTimeout(function () { location.reload(); }, 150);
        }
    });
};
