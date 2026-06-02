'use strict';


try {
    window.csInterface = new CSInterface();
    window.tips = new window.TipsModule();
    window.stopwatch = new window.StopwatchModule();
} catch (e) {
    console.error("FishTools: Pre-init failed", e);
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

    var btnWomtools = document.getElementById('btn-womtools');
    if (btnWomtools) {
        btnWomtools.addEventListener('click', function () {
            csInterface.openURLInDefaultBrowser('https://www.tiktok.com/@womxsy');
        });
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

    
    try {
        if (window.FileStore && window.csInterface) {
            var _extPath = window.csInterface.getSystemPath(SystemPath.EXTENSION);
            var _userPath = window.csInterface.getSystemPath(SystemPath.USER_DATA);
            window.FileStore.init(_extPath, _userPath);
        }
        if (window.SettingsModule) {
            window.settings = new window.SettingsModule();
            
            window.settings.loadSettings();
            window.settings.setupListeners();
        }
    } catch (e) {
        console.error('FishTools: Settings init failed', e);
    }

    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function () {
            if (window.settings) {
                window.settings.set('theme', this.value);
                window.settings.applySettings(true);
            }
        });
    }

    var styleSelect = document.getElementById('style-select');
    if (styleSelect) {
        styleSelect.addEventListener('change', function () {
            if (window.settings) {
                window.settings.set('uiStyle', this.value);
                window.settings.applySettings(true);
            }
        });
    }

    var animToggle = document.getElementById('anim-toggle');
    if (animToggle) {
        animToggle.addEventListener('change', function () {
            if (window.settings) {
                window.settings.set('animEnabled', this.checked);
                window.settings.applySettings(true);
            }
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

        if (window.tips) {
            try {
                window.tips.init();
            } catch (e) { console.error("Tips init error", e); }
        }

        if (window.stopwatch) {
            try {
                window.stopwatch.init();
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
        if (window.settings) {
            window.settings.applySettings();
        }

        
        checkScriptPermissions();
    });
});

function checkScriptPermissions() {
    if (!window.csInterface) return;

    
    if (window.settings && window.settings.get('showIntro') === false) return;

    
    
    var testScript = [
        '(function() {',
        '  try {',
        '    if (app.preferences && app.preferences.getPrefAsLong) {',
        '      var hasPref = app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY");',
        '      if (hasPref === 1) return "ok";',
        '      if (hasPref === 0) return "denied";',
        '    }',
        '  } catch(e) {}',
        '  ',
        '  // Fallback: Try writing a small test file if pref lookup failed or is unavailable',
        '  try {',
        '    var tempPath = Folder.temp.fullName || Folder.temp.toString();',
        '    if (tempPath.slice(-1) === "/" || tempPath.slice(-1) === "\\\\") {',
        '      tempPath = tempPath.slice(0, -1);',
        '    }',
        '    var f = new File(tempPath + "/fishtools_permtest.tmp");',
        '    if (f.open("w")) {',
        '      f.write("ok");',
        '      f.close();',
        '      f.remove();',
        '      return "ok";',
        '    }',
        '  } catch(e) {}',
        '  return "denied";',
        '})()'
    ].join('\n');

    csInterface.evalScript(testScript, function (result) {
        if (result === 'ok') {
            
            if (window.settings) window.settings.set('showIntro', false);
            return;
        }
        
        showPermissionModal();
    });
}

function showPermissionModal() {
    
    var overlay = document.createElement('div');
    overlay.id = 'perm-modal-overlay';
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(0,0,0,0.75)', 'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)', 'padding:16px'
    ].join(';');

    var box = document.createElement('div');
    box.style.cssText = [
        'background:var(--surface, #1a1a1a)',
        'border:1px solid var(--border, #333)',
        'border-radius:14px',
        'padding:20px 20px 16px',
        'max-width:320px', 'width:100%',
        'box-shadow:0 24px 60px rgba(0,0,0,0.6)',
        'font-family:var(--font, sans-serif)',
        'animation:modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both'
    ].join(';');

    
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
    header.innerHTML = [
        '<span class="material-icons" style="color:#ffbb33;font-size:22px;">lock</span>',
        '<span style="font-weight:700;font-size:13px;color:var(--text,#fff);letter-spacing:0.5px;">Permission Required</span>'
    ].join('');

    
    var desc = document.createElement('p');
    desc.style.cssText = 'font-size:11px;color:var(--text-mut,#888);line-height:1.6;margin:0 0 14px;';
    desc.textContent = 'Fish Tools needs write access to save your settings, presets, and graph data. Please enable it in After Effects preferences.';

    
    var steps = document.createElement('div');
    steps.style.cssText = 'background:var(--bg,#111);border-radius:8px;padding:12px;margin-bottom:16px;';

    var stepsData = [
        { icon: 'settings', text: 'Open After Effects' },
        { icon: 'tune', text: 'Preferences → Scripting & Expressions' },
        { icon: 'check_box', text: 'Enable \'Allow Scripts to Write Files and Access Network\'' },
        { icon: 'refresh', text: 'Restart After Effects' }
    ];

    stepsData.forEach(function (s, i) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;' + (i < stepsData.length - 1 ? 'border-bottom:1px solid var(--border,#222);' : '');
        row.innerHTML = [
            '<span style="width:20px;height:20px;border-radius:50%;background:var(--accent,#ffb400);display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
            '  <span style="font-size:9px;font-weight:bold;color:#000;">' + (i + 1) + '</span>',
            '</span>',
            '<span class="material-icons" style="font-size:14px;color:var(--accent,#ffb400);">' + s.icon + '</span>',
            '<span style="font-size:10px;color:var(--text,#ddd);line-height:1.4;">' + s.text + '</span>'
        ].join('');
        steps.appendChild(row);
    });

    
    var note = document.createElement('div');
    note.style.cssText = [
        'font-size:9.5px', 'color:var(--text-mut,#666)',
        'border-top:1px solid var(--border,#333)',
        'padding-top:10px', 'margin-bottom:14px',
        'line-height:1.5', 'display:flex', 'align-items:flex-start', 'gap:6px'
    ].join(';');
    note.innerHTML = '<span class="material-icons" style="font-size:12px;color:#ffbb33;flex-shrink:0;margin-top:1px;">info</span>' +
        '<span>Without this, settings won\'t be saved between sessions. The extension will still work but all changes will reset on reload.</span>';

    
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:8px;';

    var btnIgnore = document.createElement('button');
    btnIgnore.textContent = 'Continue Anyway';
    btnIgnore.className = 'btn-secondary';
    btnIgnore.style.cssText = 'flex:1;font-size:10px;padding:7px;';
    btnIgnore.addEventListener('click', function () {
        document.body.removeChild(overlay);
    });

    var btnOk = document.createElement('button');
    btnOk.textContent = 'Got It!';
    btnOk.className = 'btn-primary';
    btnOk.style.cssText = 'flex:2;font-size:10px;padding:7px;font-weight:700;';
    btnOk.addEventListener('click', function () {
        
        if (window.settings) window.settings.set('showIntro', false);
        document.body.removeChild(overlay);
    });

    footer.appendChild(btnIgnore);
    footer.appendChild(btnOk);

    box.appendChild(header);
    box.appendChild(desc);
    box.appendChild(steps);
    box.appendChild(note);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    
    var style = document.createElement('style');
    style.textContent = '@keyframes modal-in { from { opacity:0; transform:scale(0.88) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }';
    document.head.appendChild(style);
}

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
        var _selIdx = select.selectedIndex;
        var _selText = (_selIdx >= 0 && select.options[_selIdx]) ? select.options[_selIdx].text : 'Select...';
        trigger.innerHTML = '<span>' + _selText + '</span><span class="material-icons chevron">expand_more</span>';
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
