'use strict';

window.SettingsModule = function SettingsModule() {
    this.defaults = {
        version: window.EXTENSION_VERSION,
        tipsEnabled: true,
        lastTab: 'main',
        theme: 'dark',
        uiStyle: 'capsule',
        animEnabled: true,
        beatMaker: {
            threshold: 15,
            channel: 'Both Channels',
            lastSubTab: 'manual'
        }
    };
    this.settings = JSON.parse(JSON.stringify(this.defaults));
};

SettingsModule.prototype.init = function () {
    try {
        this.loadSettings();
        this.applySettings();
        this.setupListeners();
    } catch (e) {
        console.error('Settings init failure:', e);
    }
};

SettingsModule.prototype.setupListeners = function () {
    var self = this;

    var safeAdd = function (id, event, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    safeAdd('btn-reset-settings', 'click', function () { self.resetSettings(); });
};

SettingsModule.prototype.loadSettings = function () {
    var store = window.FileStore;
    if (!store) return;
    var saved = store.get('config');
    if (saved) {
        for (var key in saved) {
            if (saved.hasOwnProperty(key)) {
                this.settings[key] = saved[key];
            }
        }
    }
};

SettingsModule.prototype.saveSettings = function () {
    var store = window.FileStore;
    if (store) store.set('config', this.settings);
};

SettingsModule.prototype.applySettings = function (skipTabRestore) {
    if (!skipTabRestore) {
        this.restoreLastTab();
    }

    var theme = this.settings.theme || 'dark';
    var style = this.settings.uiStyle || 'capsule';
    var anim = this.settings.animEnabled !== false;

    // Apply to DOM
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-anim', anim ? 'on' : 'off');

    document.body.classList.remove('style-material-you', 'style-simple');
    if (style === 'material') document.body.classList.add('style-material-you');
    if (style === 'simple') document.body.classList.add('style-simple');

    // Sync native select values
    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    var styleSelect = document.getElementById('style-select');
    if (styleSelect) styleSelect.value = style;

    var animToggle = document.getElementById('anim-toggle');
    if (animToggle) animToggle.checked = anim;

    // Sync custom select UI (trigger text + selected option highlight)
    ['theme-select', 'style-select'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;

        var container = document.getElementById('container-' + id);
        if (!container) return;

        // Update trigger label
        var trigger = container.querySelector('.custom-select-trigger span');
        if (trigger) {
            var _idx = el.selectedIndex;
            trigger.textContent = (_idx >= 0 && el.options[_idx]) ? el.options[_idx].text : 'Select...';
        }

        // Update selected highlight in options list
        var allOpts = container.querySelectorAll('.custom-select-option');
        var currentVal = el.value;
        var optEls = Array.from(el.options);
        allOpts.forEach(function (optEl, i) {
            var nativeOpt = optEls[i];
            optEl.classList.toggle('selected', !!(nativeOpt && nativeOpt.value === currentVal));
        });
    });

    if (window.GraphModule && typeof window.GraphModule.refresh === 'function') {
        window.GraphModule.refresh();
    }
};

SettingsModule.prototype.restoreLastTab = function () {
    var lastTab = this.settings.lastTab || 'main';
    var tabBtn = document.querySelector('.tab-btn[data-tab="' + lastTab + '"]');
    if (tabBtn) tabBtn.click();
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
    window.ModalModule.confirm(
        'Are you sure you want to reset all settings to factory default?',
        'Factory Reset',
        function (confirmed) {
            if (confirmed) {
                var store = window.FileStore;
                if (store) store.clear();
                self.settings = JSON.parse(JSON.stringify(self.defaults));
                setTimeout(function () { location.reload(); }, 150);
            }
        }
    );
};
