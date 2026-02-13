const QRIS_DATA = "00020101021126610014COM.GO-JEK.WWW01189360091437879754150210G7879754150303UMI51440014ID.CO.QRIS.WWW0215ID10254474210390303UMI5204581653033605802ID5919CUTEFISHRBX, Gaming6009SUKOHARJO61055751362070703A0163041D6B";

// Initialize Modules
try {
    window.csInterface = new CSInterface();
    window.settings = new window.SettingsModule();
    window.tips = new window.TipsModule();
    window.stopwatch = new window.StopwatchModule();
} catch (e) {
    console.error("FishTools: Module instantiation failed", e);
}

function setupFlyoutMenu() {
    if (!csInterface) return;
    const menuXML = '<Menu>' +
        '<MenuItem Id="reloadInfo" Label="Reload Info" Enabled="true" Checked="false"/>' +
        '<MenuItem Id="reloadPanel" Label="Reload UI" Enabled="true" Checked="false"/>' +
        '</Menu>';

    try {
        csInterface.setPanelFlyoutMenu(menuXML);
        csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", (event) => {
            if (event.data.menuId === "reloadInfo") {
                loadSystemInfo();
            } else if (event.data.menuId === "reloadPanel") {
                location.reload();
            }
        });
    } catch (e) {
        console.error("Flyout error:", e);
    }
}

function getManifestVersion() {
    try {
        const interfaceObj = window.csInterface || new CSInterface();
        const extensionPath = interfaceObj.getSystemPath(SystemPath.EXTENSION);
        const manifestPath = extensionPath + "/CSXS/manifest.xml";
        if (window.cep && window.cep.fs) {
            const result = window.cep.fs.readFile(manifestPath);
            if (result.err === 0) {
                const match = /ExtensionBundleVersion\s*=\s*["'](.*?)["']/.exec(result.data);
                if (match && match[1]) return match[1];
            }
        }
    } catch (e) { }
    return "0.0.1";
}

window.EXTENSION_VERSION = getManifestVersion();

function detectExtensionVersion() {
    const extVerEl = document.getElementById("info-ext-ver");
    if (extVerEl) extVerEl.textContent = window.EXTENSION_VERSION;
    const updateVerEl = document.getElementById("update-ver");
    if (updateVerEl) updateVerEl.textContent = "v" + window.EXTENSION_VERSION;
}

function loadSystemInfo() {
    if (!window.csInterface) return;

    setInterval(() => {
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ":" +
            now.getMinutes().toString().padStart(2, '0');
        const el = document.getElementById("info-time");
        if (el) el.textContent = timeStr;
    }, 1000);

    csInterface.evalScript("app.version", (res) => {
        const el = document.getElementById("info-ae-ver");
        if (el) el.textContent = res || "Unknown";
    });

    csInterface.evalScript("$.os", (res) => {
        let osName = "Unknown";
        if (res) {
            if (res.indexOf("Windows") !== -1) osName = "Windows";
            else if (res.indexOf("Mac") !== -1) osName = "Mac OS";
            else osName = res;
        }
        const el = document.getElementById("info-os");
        if (el) el.textContent = osName;
    });

    csInterface.evalScript("(app.project.file) ? app.project.file.name : 'Unsaved Project'", (res) => {
        const el = document.getElementById("info-project");
        if (el) el.textContent = res || "None";
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const target = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const contentEl = document.getElementById('tab-' + target);
            if (contentEl) contentEl.classList.add('active');

            if (settings) {
                settings.saveLastTab(target);
            }

            if (target === 'graph' && window.GraphModule) {
                setTimeout(() => {
                    window.GraphModule.resize();
                }, 10);
            }
        });
    });
}

function setupDonation() {
    const btnPaypal = document.getElementById('btn-paypal');
    if (btnPaypal) {
        btnPaypal.addEventListener('click', () => {
            csInterface.openURLInDefaultBrowser("https://www.paypal.com/paypalme/cutefishae");
        });
    }

    const btnQris = document.getElementById('btn-qris');
    if (btnQris) {
        btnQris.addEventListener('click', () => {
            const modal = document.getElementById('qris-modal');
            const qrcodeDiv = document.getElementById('qrcode');
            if (modal) {
                modal.style.display = "flex";
                const apiURL = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(QRIS_DATA);
                qrcodeDiv.innerHTML = '<img src="' + apiURL + '" alt="QRIS Code" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">';
            }
        });
    }

    const closeQris = document.getElementById('close-qris');
    if (closeQris) {
        closeQris.addEventListener('click', () => {
            document.getElementById('qris-modal').style.display = 'none';
        });
    }
}

function loadHostScript(callback) {
    if (!csInterface) { if (callback) callback(); return; }
    try {
        const extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        const jsxPath = extPath + "/host/index.jsx";
        const result = window.cep && window.cep.fs ? window.cep.fs.readFile(jsxPath) : null;
        if (result && result.err === 0) {
            csInterface.evalScript(result.data, () => {
                if (callback) callback();
            });
        } else {
            csInterface.evalScript('$.evalFile("' + jsxPath.replace(/\\/g, '/') + '")', () => {
                if (callback) callback();
            });
        }
    } catch (e) {
        console.error("FishTools: Host script load failed", e);
        if (callback) callback();
    }
}

window.showTooltip = function (el, text, duration = 1500) {
    const tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;

    tooltip.textContent = text;
    tooltip.classList.add('visible');

    const rect = el.getBoundingClientRect();
    const winW = window.innerWidth;

    const tx = rect.left + (rect.width / 2);
    const ty = rect.top - 8;

    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';

    requestAnimationFrame(() => {
        const ttRect = tooltip.getBoundingClientRect();
        const halfW = ttRect.width / 2;
        let offset = 0;

        if (tx - halfW < 10) {
            offset = 10 - (tx - halfW);
        }
        else if (tx + halfW > winW - 10) {
            offset = (winW - 10) - (tx + halfW);
        }

        tooltip.style.transform = `translate(calc(-50% + ${offset}px), -100%)`;
        tooltip.style.setProperty('--arrow-offset', `${-offset}px`);
    });

    if (duration > 0) {
        if (el._ttTimeout) clearTimeout(el._ttTimeout);
        el._ttTimeout = setTimeout(() => {
            tooltip.classList.remove('visible');
            el._ttTimeout = null;
        }, duration);
    }
};

window.setupTooltips = function () {
    const tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;

    const elements = document.querySelectorAll('[title], [data-tooltip]');

    elements.forEach((el) => {
        if (el.hasAttribute('data-tt-init')) return;

        const text = el.getAttribute('title') || el.getAttribute('data-tooltip');
        if (!text) return;

        if (el.hasAttribute('title')) {
            el.setAttribute('data-tooltip', text);
            el.removeAttribute('title');
        }

        el.addEventListener('mouseenter', () => {
            window.showTooltip(el, text, 0); // 0 means don't auto-hide on hover
        });

        el.addEventListener('mouseleave', () => {
            if (!el._ttTimeout) {
                tooltip.classList.remove('visible');
            }
        });

        el.setAttribute('data-tt-init', 'true');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Splash Screen Logic
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.remove();
            }, 300); // Wait for CSS transition
        }, 800); // 0.8s duration
    }

    // Version already detected at top-level
    detectExtensionVersion();
    setupFlyoutMenu();
    setupTabs();
    setupDonation();

    loadHostScript(() => {
        if (window.ColorPicker) {
            window.ColorPicker.init();
        }

        if (settings) {
            try {
                settings.init();
            } catch (e) { console.error("Settings init error", e); }
        }

        if (tips) {
            try {
                tips.init();
            } catch (e) { console.error("Tips init error", e); }
        }

        if (stopwatch) {
            try {
                stopwatch.init();
            } catch (e) { console.error("Stopwatch init error", e); }
        }

        if (window.ColorPaletteModule) {
            try {
                window.ColorPaletteModule.init();
            } catch (e) { console.error("ColorPaletteModule init error", e); }
        }

        let updater;
        if (window.UpdaterModule) {
            try {
                updater = new window.UpdaterModule();
                updater.init();
            } catch (e) { console.error("Updater init error", e); }
        }

        if (window.ToolboxModule) {
            try {
                const toolbox = new window.ToolboxModule();
                toolbox.init();
            } catch (e) { console.error("Toolbox init error", e); }
        }

        if (window.ModalModule) {
            try {
                window.ModalModule.init();
            } catch (e) { console.error("ModalModule init error", e); }
        }

        if (window.GraphModule) {
            try {
                window.GraphModule.init();
            } catch (e) { console.error("GraphModule init error", e); }
        }

        setupTooltips();
        loadSystemInfo();
    });
});

window.onerror = (msg, url, line, col, error) => {
    console.error("Global Error: " + msg + "\nLine: " + line + "\nSource: " + url);
    return false;
};
