'use strict';

var QRIS_DATA = "00020101021126610014COM.GO-JEK.WWW01189360091437879754150210G7879754150303UMI51440014ID.CO.QRIS.WWW0215ID10254474210390303UMI5204581653033605802ID5919CUTEFISHRBX, Gaming6009SUKOHARJO61055751362070703A0163041D6B";

try {
    window.csInterface = new CSInterface();
    if (window.FileStore) {
        var _extPath = window.csInterface.getSystemPath(SystemPath.EXTENSION);
        window.FileStore.init(_extPath);
    }
    window.settings = new window.SettingsModule();
    window.tips = new window.TipsModule();
    window.stopwatch = new window.StopwatchModule();
    
    setupCustomSelects();
} catch (e) {
    console.error("FishTools: Module instantiation failed", e);
}

function setupFlyoutMenu() {
    if (!csInterface) return;
    var menuXML = '<Menu>' +
        '<MenuItem Id="reloadInfo" Label="Reload Info" Enabled="true" Checked="false"/>' +
        '<MenuItem Id="reloadPanel" Label="Reload UI" Enabled="true" Checked="false"/>' +
        '</Menu>';

    try {
        csInterface.setPanelFlyoutMenu(menuXML);
        csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function (event) {
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
        var interfaceObj = window.csInterface || new CSInterface();
        var extensionPath = interfaceObj.getSystemPath(SystemPath.EXTENSION);
        var manifestPath = extensionPath + "/CSXS/manifest.xml";
        if (window.cep && window.cep.fs) {
            var result = window.cep.fs.readFile(manifestPath);
            if (result.err === 0) {
                var match = /ExtensionBundleVersion\s*=\s*["'](.*?)["']/.exec(result.data);
                if (match && match[1]) return match[1];
            }
        }
    } catch (e) { }
    return "0.0.1";
}

window.EXTENSION_VERSION = getManifestVersion();

function detectExtensionVersion() {
    var extVerEl = document.getElementById("info-ext-ver");
    if (extVerEl) extVerEl.textContent = window.EXTENSION_VERSION;
    var updateVerEl = document.getElementById("update-ver");
    if (updateVerEl) updateVerEl.textContent = "v" + window.EXTENSION_VERSION;
}

function loadSystemInfo() {
    if (!window.csInterface) return;

    setInterval(function () {
        var now = new Date();
        var timeStr = String(now.getHours()).padStart(2, '0') + ":" +
            String(now.getMinutes()).padStart(2, '0');
        var el = document.getElementById("info-time");
        if (el) el.textContent = timeStr;
    }, 1000);

    csInterface.evalScript("app.version", function (res) {
        var el = document.getElementById("info-ae-ver");
        if (el) el.textContent = res || "Unknown";
    });

    csInterface.evalScript("$.os", function (res) {
        var osName = "Unknown";
        if (res) {
            if (res.indexOf("Windows") !== -1) osName = "Windows";
            else if (res.indexOf("Mac") !== -1) osName = "Mac OS";
            else osName = res;
        }
        var el = document.getElementById("info-os");
        if (el) el.textContent = osName;
    });

    csInterface.evalScript("(app.project.file) ? app.project.file.name : 'Unsaved Project'", function (res) {
        var el = document.getElementById("info-project");
        if (el) el.textContent = res || "None";
    });
}

function setupTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    var contents = document.querySelectorAll('.tab-content');

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var target = this.getAttribute('data-tab');

            tabs.forEach(function (t) { t.classList.remove('active'); });
            contents.forEach(function (c) { c.classList.remove('active'); });

            this.classList.add('active');
            var contentEl = document.getElementById('tab-' + target);
            if (contentEl) contentEl.classList.add('active');

            if (settings) {
                settings.saveLastTab(target);
            }

            if (target === 'graph' && window.GraphModule) {
                setTimeout(function () {
                    window.GraphModule.resize();
                }, 10);
            }
        });
    });
}

function setupDonation() {
    var btnPaypal = document.getElementById('btn-paypal');
    if (btnPaypal) {
        btnPaypal.addEventListener('click', function () {
            csInterface.openURLInDefaultBrowser("https://www.paypal.com/paypalme/cutefishae");
        });
    }

    var btnQris = document.getElementById('btn-qris');
    if (btnQris) {
        btnQris.addEventListener('click', function () {
            var modal = document.getElementById('qris-modal');
            var qrcodeDiv = document.getElementById('qrcode');
            if (modal) {
                modal.style.display = "flex";
                qrcodeDiv.innerHTML = '<img src="./assets/qris.png" alt="QRIS Code" style="width: 100%; max-width: 320px; height: auto; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">';
            }
        });
    }

    var closeQris = document.getElementById('close-qris');
    if (closeQris) {
        closeQris.addEventListener('click', function () {
            document.getElementById('qris-modal').style.display = 'none';
        });
    }

    var socialLinks = {
        'btn-yt': 'https://www.youtube.com/@cutefishYT',
        'btn-tt-aep': 'https://www.tiktok.com/@cutefishaep',
        'btn-tt-rbx': 'https://www.tiktok.com/@cutefishrbx',
        'btn-ig': 'https://www.instagram.com/cutefishae',
        'btn-gh': 'https://www.github.com/cutefishaep'
    };

    for (var id in socialLinks) {
        (function (btnId, url) {
            var el = document.getElementById(btnId);
            if (el) {
                el.addEventListener('click', function () {
                    csInterface.openURLInDefaultBrowser(url);
                });
            }
        })(id, socialLinks[id]);
    }
}

function loadHostScript(callback) {
    if (!csInterface) { if (callback) callback(); return; }
    try {
        var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var jsxPath = extPath + "/host/index.jsx";
        csInterface.evalScript('$.evalFile("' + jsxPath.replace(/\\/g, '/') + '")', function () {
            if (callback) callback();
        });
    } catch (e) {
        console.error("FishTools: Host script load failed", e);
        if (callback) callback();
    }
}

window.showTooltip = function (el, text, duration) {
    if (duration === undefined) duration = 1500;
    var tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;

    tooltip.textContent = text;
    tooltip.classList.add('visible');

    var rect = el.getBoundingClientRect();
    var winW = window.innerWidth;

    var tx = rect.left + (rect.width / 2);
    var ty = rect.top - 8;

    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';

    requestAnimationFrame(function () {
        var ttRect = tooltip.getBoundingClientRect();
        var halfW = ttRect.width / 2;
        var offset = 0;

        if (tx - halfW < 10) {
            offset = 10 - (tx - halfW);
        }
        else if (tx + halfW > winW - 10) {
            offset = (winW - 10) - (tx + halfW);
        }

        tooltip.style.transform = 'translate(calc(-50% + ' + offset + 'px), -100%)';
        tooltip.style.setProperty('--arrow-offset', (-offset) + 'px');
    });

    if (duration > 0) {
        if (el._ttTimeout) clearTimeout(el._ttTimeout);
        el._ttTimeout = setTimeout(function () {
            tooltip.classList.remove('visible');
            el._ttTimeout = null;
        }, duration);
    }
};

window.setupTooltips = function () {
    var tooltip = document.getElementById('custom-tooltip');
    if (!tooltip) return;

    var elements = document.querySelectorAll('[title], [data-tooltip]');

    elements.forEach(function (el) {
        if (el.hasAttribute('data-tt-init')) return;

        var text = el.getAttribute('title') || el.getAttribute('data-tooltip');
        if (!text) return;

        if (el.hasAttribute('title')) {
            el.setAttribute('data-tooltip', text);
            el.removeAttribute('title');
        }

        el.addEventListener('mouseenter', function () {
            window.showTooltip(el, text, 0);
        });

        el.addEventListener('mouseleave', function () {
            if (!el._ttTimeout) {
                tooltip.classList.remove('visible');
            }
        });

        el.setAttribute('data-tt-init', 'true');
    });
};

document.addEventListener('DOMContentLoaded', function () {

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme || 'dark');
        if (window.FileStore) window.FileStore.set('theme', theme);
        if (window.settings) window.settings.settings.theme = theme;
        var sel = document.getElementById('theme-select');
        if (sel) sel.value = theme;
        
        if (window.GraphModule && typeof window.GraphModule.refresh === 'function') {
            requestAnimationFrame(function() {
                window.GraphModule.refresh();
            });
        }
    }

    function applyAnim(enabled) {
        document.documentElement.setAttribute('data-anim', enabled ? 'on' : 'off');
        if (window.FileStore) window.FileStore.set('animEnabled', enabled);
        if (window.settings) window.settings.settings.animEnabled = enabled;
        var tog = document.getElementById('anim-toggle');
        if (tog) tog.checked = enabled;
    }

    function applyStyle(style) {
        document.body.classList.remove('style-material-you', 'style-simple');
        if (style === 'material') document.body.classList.add('style-material-you');
        if (style === 'simple') document.body.classList.add('style-simple');
        if (window.FileStore) window.FileStore.set('uiStyle', style);
        if (window.settings) window.settings.settings.uiStyle = style;
        var sel = document.getElementById('style-select');
        if (sel) sel.value = style;
    }

    var savedTheme = (window.FileStore && window.FileStore.get('theme')) || 'dark';
    var savedAnim  = window.FileStore ? window.FileStore.get('animEnabled') : true;
    var savedStyle = (window.FileStore && window.FileStore.get('uiStyle')) || 'capsule';
    
    if (savedAnim === undefined || savedAnim === null) savedAnim = true;
    
    applyTheme(savedTheme);
    applyAnim(savedAnim);
    applyStyle(savedStyle);

    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        themeSelect.addEventListener('change', function () {
            applyTheme(this.value);
        });
    }

    var styleSelect = document.getElementById('style-select');
    if (styleSelect) {
        styleSelect.value = savedStyle;
        styleSelect.addEventListener('change', function () {
            applyStyle(this.value);
        });
    }

    var animToggle = document.getElementById('anim-toggle');
    if (animToggle) {
        animToggle.checked = savedAnim;
        animToggle.addEventListener('change', function () {
            applyAnim(this.checked);
        });
    }

    var splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(function () {
            splash.classList.add('fade-out');
            setTimeout(function () {
                splash.remove();
            }, 300);
        }, 800);
    }

    detectExtensionVersion();
    setupFlyoutMenu();
    setupTabs();
    setupDonation();

    csInterface.evalScript("app.version", function (res) {
        var majorVersion = parseInt(res, 10);

        if (majorVersion && majorVersion <= 14) {
            window.addEventListener('wheel', function (e) {
                e.preventDefault();
                var container = document.querySelector('.content-container');
                if (container) {
                    var scrollMultiplier = 0.2;
                    container.scrollTop += (e.deltaY * scrollMultiplier);
                }
            }, { passive: false });
        }
    });

    loadHostScript(function () {
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

        if (window.ToolboxModule) {
            try {
                var toolbox = new window.ToolboxModule();
                toolbox.init();
            } catch (e) { console.error("Toolbox init error", e); }
        }

        if (window.ModalModule) {
            try {
                window.ModalModule.init();
            } catch (e) { console.error("ModalModule init error", e); }
        }

        if (window.UpdateModule) {
            try {
                window.UpdateModule.init();
            } catch (e) { console.error("UpdateModule init error", e); }
        }

        if (window.DashboardModule) {
            try {
                var dashboard = new window.DashboardModule();
                dashboard.init();
            } catch (e) { console.error("Dashboard init error", e); }
        }

        if (window.BeatMakerModule) {
            try {
                var beatMaker = new window.BeatMakerModule();
                beatMaker.init(csInterface);
            } catch (e) { console.error("BeatMaker init error", e); }
        }

        if (window.GraphModule) {
            try {
                window.GraphModule.init();
            } catch (e) { console.error("GraphModule init error", e); }
        }

        if (window.DebugModule) {
            try {
                window.DebugModule.init();
            } catch (e) { console.error("DebugModule init error", e); }
        }

        if (window.BubbleTextModule) {
            try {
                window.BubbleTextModule.init();
            } catch (e) { console.error("BubbleTextModule init error", e); }
        }

        setupTooltips();
        loadSystemInfo();
        setupCustomSelects();
    });
});

function setupCustomSelects() {
    var selects = document.querySelectorAll('select');
    selects.forEach(function (select) {
        if (select.parentElement.classList.contains('custom-select-container')) return;

        var container = document.createElement('div');
        container.className = 'custom-select-container';
        if (select.id) container.id = 'container-' + select.id;
        
        select.parentNode.insertBefore(container, select);
        container.appendChild(select);
        select.style.display = 'none';

        var trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = '<span>' + (select.options[select.selectedIndex]?.text || 'Select...') + '</span><span class="material-icons chevron">expand_more</span>';
        container.appendChild(trigger);

        var optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        container.appendChild(optionsContainer);

        function refreshOptions() {
            optionsContainer.innerHTML = '';
            Array.from(select.children).forEach(function (child) {
                if (child.tagName === 'OPTGROUP') {
                    var groupHeader = document.createElement('div');
                    groupHeader.className = 'custom-select-optgroup';
                    groupHeader.textContent = child.label;
                    optionsContainer.appendChild(groupHeader);

                    Array.from(child.children).forEach(function (option) {
                        addOption(option);
                    });
                } else {
                    addOption(child);
                }
            });
        }

        function addOption(option) {
            var opt = document.createElement('div');
            opt.className = 'custom-select-option';
            if (option.selected) opt.classList.add('selected');
            opt.textContent = option.text;

            opt.addEventListener('click', function (e) {
                e.stopPropagation();
                select.value = option.value;
                trigger.querySelector('span').textContent = option.text;
                
                var allOpts = optionsContainer.querySelectorAll('.custom-select-option');
                allOpts.forEach(function (o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                
                container.classList.remove('open');
                
                var event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            });
            optionsContainer.appendChild(opt);
        }

        refreshOptions();

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = container.classList.contains('open');
            document.querySelectorAll('.custom-select-container.open').forEach(function (c) {
                c.classList.remove('open');
            });
            if (!isOpen) container.classList.add('open');
        });
        
        select.addEventListener('refresh', refreshOptions);
    });

    document.addEventListener('click', function () {
        document.querySelectorAll('.custom-select-container.open').forEach(function (c) {
            c.classList.remove('open');
        });
    });
}

window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error: " + msg + "\nLine: " + line + "\nSource: " + url);
    return false;
};
