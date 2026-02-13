window.SettingsModule = class SettingsModule {
    constructor() {
        this.defaults = {
            version: window.EXTENSION_VERSION,

            // UI State
            lastTab: "tools",
            navAutoHide: false,
            tipsEnabled: true,

            // Theme Colors
            customColors: {
                enabled: true,
                accent: "#FFD700",
                bg: "#121212",
                card: "#1E1E1E",
                text: "#FFFFFF",
                border: "#333333"
            }
        };

        this.settings = JSON.parse(JSON.stringify(this.defaults));
        this.settingsPath = "config.json";
        this.csInterface = new CSInterface();

        try {
            this.extensionPath = this.csInterface.getSystemPath(SystemPath.EXTENSION);
            this.settingsFullPath = this.extensionPath + "/" + this.settingsPath;
        } catch (e) {
            console.error("Settings: Failed to get system paths", e);
            this.settingsFullPath = this.settingsPath;
        }
    }

    init() {
        try {
            this.loadSettings();
            this.applySettings();
            this.setupListeners();
        } catch (e) {
            console.error("Settings init failure:", e);
        }
    }

    setupListeners() {
        const safeAddListener = (id, event, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(event, callback);
            }
        };

        safeAddListener('btn-reset-settings', 'click', () => { this.resetSettings(); });

        const colorIds = ['color-accent', 'color-bg', 'color-card', 'color-text', 'color-border'];
        colorIds.forEach((id) => {
            safeAddListener(id, 'input', () => {
                const getVal = (id) => {
                    const el = document.getElementById(id);
                    return el ? el.value : this.settings.customColors[id.replace('color-', '')];
                };

                this.settings.customColors.accent = getVal('color-accent');
                this.settings.customColors.bg = getVal('color-bg');
                this.settings.customColors.card = getVal('color-card');
                this.settings.customColors.text = getVal('color-text');
                this.settings.customColors.border = getVal('color-border');

                this.saveSettings();
                this.applyCustomColors();
                this.updateSwatches();
            });
        });

        const swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.onclick = function () {
                const targetId = this.getAttribute('data-id');
                const input = document.getElementById(targetId);
                if (input && window.ColorPicker) {
                    window.ColorPicker.open(input);
                }
            };
        });
    }

    updateSwatches() {
        const colorIds = ['color-accent', 'color-bg', 'color-card', 'color-text', 'color-border'];
        colorIds.forEach((id) => {
            const input = document.getElementById(id);
            const swatch = document.querySelector('.color-swatch[data-id="' + id + '"]');
            if (input && swatch) {
                swatch.style.backgroundColor = input.value;
            }
        });
    }

    loadSettings() {
        try {
            if (window.cep && window.cep.fs) {
                const result = window.cep.fs.readFile(this.settingsFullPath);
                if (result.err === 0 && result.data) {
                    try {
                        const loaded = JSON.parse(result.data);

                        for (const key in loaded) {
                            if (loaded.hasOwnProperty(key)) {
                                if (key === 'customColors' && typeof loaded[key] === 'object') {
                                    for (const subKey in loaded[key]) {
                                        if (loaded[key].hasOwnProperty(subKey)) {
                                            this.settings.customColors[subKey] = loaded[key][subKey];
                                        }
                                    }
                                } else {
                                    this.settings[key] = loaded[key];
                                }
                            }
                        }
                    } catch (parseError) {
                        console.error("Settings: JSON parse error", parseError);
                    }
                }
            } else {
                const saved = localStorage.getItem('fishToolsConfig');
                if (saved) {
                    const obj = JSON.parse(saved);
                    for (const k in obj) { this.settings[k] = obj[k]; }
                }
            }
        } catch (e) {
            console.error("Settings load error:", e);
        }
    }

    saveSettings() {
        try {
            const data = JSON.stringify(this.settings, null, 4);
            if (window.cep && window.cep.fs) {
                window.cep.fs.writeFile(this.settingsFullPath, data);
            } else {
                localStorage.setItem('fishToolsConfig', data);
            }
        } catch (e) {
            console.error("Settings save error:", e);
        }
    }

    applySettings() {
        this.applyCustomColors();

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        if (this.settings.customColors) {
            setVal('color-accent', this.settings.customColors.accent);
            setVal('color-bg', this.settings.customColors.bg);
            setVal('color-card', this.settings.customColors.card);
            setVal('color-text', this.settings.customColors.text);
            setVal('color-border', this.settings.customColors.border);
        }
        this.updateSwatches();

        this.restoreLastTab();
    }

    restoreLastTab() {
        const lastTab = this.settings.lastTab || 'main';
        const tabBtn = document.querySelector('.tab-btn[data-tab="' + lastTab + '"]');
        if (tabBtn) {
            tabBtn.click();
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    saveLastTab(tabName) {
        if (this.settings.lastTab === tabName) return;
        this.settings.lastTab = tabName;
        this.saveSettings();
    }

    applyCustomColors(isPreview) {
        const root = document.documentElement;
        if (!root) return;

        let colors;
        if (isPreview) {
            colors = {
                accent: document.getElementById('color-accent').value,
                bg: document.getElementById('color-bg').value,
                card: document.getElementById('color-card').value,
                text: document.getElementById('color-text').value,
                border: document.getElementById('color-border').value
            };
        } else {
            colors = this.settings.customColors;
        }

        if (!colors) return;

        if (colors.accent) root.style.setProperty('--accent', colors.accent);
        if (colors.bg) root.style.setProperty('--bg-color', colors.bg);
        if (colors.card) root.style.setProperty('--card-bg', colors.card);
        if (colors.text) root.style.setProperty('--text-color', colors.text);
        if (colors.border) root.style.setProperty('--card-border', colors.border);
    }

    resetSettings() {
        window.ModalModule.confirm("Are you sure you want to reset all settings to factory default?", "Factory Reset", (confirmed) => {
            if (confirmed) {
                this.settings = JSON.parse(JSON.stringify(this.defaults));
                this.saveSettings();
                setTimeout(() => { location.reload(); }, 150);
            }
        });
    }
}
