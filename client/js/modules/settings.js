'use strict';

window.SettingsModule = function SettingsModule() {
    this.defaults = {
        version: window.EXTENSION_VERSION,
        tipsEnabled: true,
        lastTab: 'main',
        theme: 'dark',
        uiStyle: 'simple',
        animEnabled: true,
        snapScroll: false,
        showIntro: true,
        elevenLabsApiKey: '',
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
    safeAdd('btn-backup-settings', 'click', function () { self.backupSettings(); });
    safeAdd('btn-restore-settings', 'click', function () { self.restoreSettings(); });
    safeAdd('btn-open-settings-dir', 'click', function () { self.openSettingsDir(); });

    safeAdd('snap-scroll-toggle', 'change', function (e) {
        self.settings.snapScroll = e.target.checked;
        if (e.target.checked) {
            window.CardNavModule.enable();
        } else {
            window.CardNavModule.disable();
        }
        self.saveSettings();
    });
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
    var snap = this.settings.snapScroll === true;

    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-anim', anim ? 'on' : 'off');
    document.documentElement.setAttribute('data-snap', snap ? 'on' : 'off');

    document.body.classList.remove('style-material-you', 'style-simple');
    if (style === 'material') document.body.classList.add('style-material-you');
    if (style === 'simple') document.body.classList.add('style-simple');

    
    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;

    var styleSelect = document.getElementById('style-select');
    if (styleSelect) styleSelect.value = style;

    var animToggle = document.getElementById('anim-toggle');
    if (animToggle) animToggle.checked = anim;

    var snapToggle = document.getElementById('snap-scroll-toggle');
    if (snapToggle) snapToggle.checked = snap;

    
    if (window.CardNavModule) {
        if (snap && !window.CardNavModule.isEnabled()) {
            window.CardNavModule.enable();
        } else if (!snap && window.CardNavModule.isEnabled()) {
            window.CardNavModule.disable();
        }
    }

    
    ['theme-select', 'style-select'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;

        var container = document.getElementById('container-' + id);
        if (!container) return;

        
        var trigger = container.querySelector('.custom-select-trigger span');
        if (trigger) {
            var _idx = el.selectedIndex;
            trigger.textContent = (_idx >= 0 && el.options[_idx]) ? el.options[_idx].text : 'Select...';
        }

        
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
    if (window.ElasticGraphModule && typeof window.ElasticGraphModule.refresh === 'function') {
        window.ElasticGraphModule.refresh();
    }
    if (window.ControllerModule && typeof window.ControllerModule.refresh === 'function') {
        window.ControllerModule.refresh();
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

SettingsModule.prototype.backupSettings = function () {
    var store = window.FileStore;
    if (!store) return;

    if (store.isLocalStorage()) {
        window.ModalModule.alert('Cannot export settings because the extension is running in LocalStorage fallback mode.', 'Error');
        return;
    }

    if (!window.cep || !window.cep.fs) {
        window.ModalModule.alert('File system API not available.', 'Error');
        return;
    }

    var initialPath = (store.getDataDir() || '') + '/fishtools_backup.json';
    var saveFunc = window.cep.fs.showSaveDialogEx || window.cep.fs.showSaveDialog;
    var result;

    if (window.cep.fs.showSaveDialogEx) {
        result = window.cep.fs.showSaveDialogEx(
            'Backup Settings',
            initialPath,
            ['json'],
            'fishtools_backup.json',
            '', 
            '', 
            ''  
        );
    } else {
        result = window.cep.fs.showSaveDialog(
            'Backup Settings',
            initialPath,
            ['json'],
            'fishtools_backup.json'
        );
    }

    if (result.err === 0 && result.data) {
        var targetPath = result.data;
        var data = store.getAll();
        var jsonStr = JSON.stringify(data, null, 2);

        var writeRes = window.cep.fs.writeFile(targetPath, jsonStr);
        if (writeRes.err === 0) {
            window.ModalModule.alert('Settings successfully backed up to:\n' + targetPath, 'Backup Success');
        } else {
            window.ModalModule.alert('Failed to write backup file. Error code: ' + writeRes.err, 'Backup Error');
        }
    }
};

SettingsModule.prototype.restoreSettings = function () {
    var store = window.FileStore;
    if (!store) return;

    if (!window.cep || !window.cep.fs) {
        window.ModalModule.alert('File system API not available.', 'Error');
        return;
    }

    var initialPath = store.getDataDir() || '';
    var result;

    if (window.cep.fs.showOpenDialogEx) {
        result = window.cep.fs.showOpenDialogEx(
            false, 
            false, 
            'Restore Settings',
            initialPath,
            ['json'],
            '', 
            ''  
        );
    } else {
        result = window.cep.fs.showOpenDialog(
            false,
            false,
            'Restore Settings',
            initialPath,
            ['json']
        );
    }

    if (result.err === 0 && result.data && result.data.length > 0) {
        var selectedPath = result.data[0];
        var readRes = window.cep.fs.readFile(selectedPath);
        if (readRes.err === 0 && readRes.data) {
            try {
                var parsed = JSON.parse(readRes.data);
                if (parsed && (parsed.config || parsed.theme || parsed.uiStyle)) {
                    window.ModalModule.confirm(
                        'This will overwrite all your current settings and presets. Do you want to proceed?',
                        'Confirm Restore',
                        function (confirmed) {
                            if (confirmed) {
                                store.replace(parsed);
                                window.ModalModule.confirm(
                                    'Settings successfully restored! Click Reload to apply changes.',
                                    'Restore Success',
                                    function (reloadConfirmed) {
                                        if (reloadConfirmed) {
                                            location.reload();
                                        }
                                    },
                                    { confirmText: 'Reload', cancelText: 'Dismiss' }
                                );
                            }
                        }
                    );
                } else {
                    window.ModalModule.alert('Invalid backup file structure.', 'Restore Error');
                }
            } catch (e) {
                window.ModalModule.alert('Failed to parse backup file. Make sure it is a valid JSON file.', 'Restore Error');
            }
        } else {
            window.ModalModule.alert('Failed to read selected file. Error code: ' + readRes.err, 'Restore Error');
        }
    }
};

SettingsModule.prototype.openSettingsDir = function () {
    var store = window.FileStore;
    if (!store) return;
    var path = store.getDataDir();
    if (!path) {
        window.ModalModule.alert('Data directory is not available (using LocalStorage fallback).', 'Error');
        return;
    }

    if (window.csInterface) {
        var script = 'var f = new Folder("' + path + '"); if (f.exists) { f.execute(); "true"; } else { "false"; }';
        window.csInterface.evalScript(script, function (result) {
            if (result === 'false') {
                window.ModalModule.alert('Failed to open settings directory. Folder does not exist.', 'Error');
            }
        });
    }
};
