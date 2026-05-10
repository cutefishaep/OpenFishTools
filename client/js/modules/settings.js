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

SettingsModule.prototype.applySettings = function () {
    this.restoreLastTab();
    
    var theme = this.settings.theme || 'dark';
    var style = this.settings.uiStyle || 'capsule';
    var anim = this.settings.animEnabled !== false;

    // Apply to DOM
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-anim', anim ? 'on' : 'off');
    
    document.body.classList.remove('style-material-you', 'style-simple');
    if (style === 'material') document.body.classList.add('style-material-you');
    if (style === 'simple') document.body.classList.add('style-simple');

    // Sync UI elements
    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    var styleSelect = document.getElementById('style-select');
    if (styleSelect) styleSelect.value = style;

    var animToggle = document.getElementById('anim-toggle');
    if (animToggle) animToggle.checked = anim;

    // Refresh custom selects if they exist
    if (window.setupCustomSelects) {
        // Trigger a refresh on the original selects to update custom triggers
        ['theme-select', 'style-select'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                var event = new Event('refresh');
                el.dispatchEvent(event);
                
                // Also update trigger text manually since refresh just updates options
                var container = document.getElementById('container-' + id);
                if (container) {
                    var trigger = container.querySelector('.custom-select-trigger span');
                    if (trigger) trigger.textContent = el.options[el.selectedIndex]?.text || 'Select...';
                }
            }
        });
    }

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
