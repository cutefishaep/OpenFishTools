'use strict';

var ColorPaletteModule = (function () {

    var container, btnGenerate, inputCount, schemeSelect, baseTrigger, baseHidden, savedList;

    function init() {
        container = document.getElementById('palette-container');
        savedList = document.getElementById('saved-palettes-list');
        btnGenerate = document.getElementById('btn-generate-palette');
        inputCount = document.getElementById('palette-count');
        schemeSelect = document.getElementById('palette-scheme');
        baseTrigger = document.getElementById('palette-base-trigger');
        baseHidden = document.getElementById('palette-base-color');

        if (btnGenerate) {
            btnGenerate.addEventListener('click', function () {
                var newBase = getRandomHex();
                if (baseHidden) {
                    baseHidden.value = newBase;
                    if (baseTrigger) baseTrigger.style.backgroundColor = newBase;
                }
                generate();
            });
        }

        if (baseTrigger && baseHidden && window.ColorPicker) {
            baseTrigger.addEventListener('click', function (e) {
                window.ColorPicker.open(baseHidden, baseTrigger);
            });

            baseHidden.addEventListener('input', function () {
                var color = baseHidden.value;
                baseTrigger.style.backgroundColor = color;
                generate();
            });
            baseHidden.addEventListener('change', function () {
                var color = baseHidden.value;
                baseTrigger.style.backgroundColor = color;
                generate();
            });
        }

        if (schemeSelect) {
            schemeSelect.addEventListener('change', generate);
        }
        if (inputCount) {
            inputCount.addEventListener('change', generate);
            inputCount.addEventListener('input', generate);
        }

        loadSaved();
        generate();
    }

    function generate() {
        if (!container) return;
        container.innerHTML = '';

        var tooltips = document.querySelectorAll('#custom-tooltip');
        tooltips.forEach(function (t) { t.classList.remove('visible'); });

        var count = parseInt(inputCount.value) || 1;
        count = Math.max(1, Math.min(10, count));
        inputCount.value = count;

        var schemes = ['analogous', 'complementary', 'triadic', 'hue'];
        var selectedScheme = schemeSelect ? schemeSelect.value : 'analogous';

        var originalBaseHex = baseHidden ? baseHidden.value : getRandomHex();

        for (var i = 0; i < count; i++) {

            var baseHex = originalBaseHex;
            var scheme = selectedScheme;

            if (i > 0 && scheme !== 'hue') {
                baseHex = getRandomHex();
            }

            var baseHSL = hexToHSL(baseHex);
            var colors = [];

            if (scheme === 'analogous') {
                var hues = [baseHSL.h - 30, baseHSL.h, baseHSL.h + 30, baseHSL.h + 60];
                colors = hues.map(function (h) { return hslToHex((h + 360) % 360, baseHSL.s, baseHSL.l); });
            } else if (scheme === 'complementary') {
                var hues = [baseHSL.h, baseHSL.h + 180, baseHSL.h + 150, baseHSL.h + 210];
                colors = hues.map(function (h) { return hslToHex((h + 360) % 360, baseHSL.s, baseHSL.l); });
            } else if (scheme === 'triadic') {
                var hues = [baseHSL.h, baseHSL.h + 120, baseHSL.h + 240, baseHSL.h + 60];
                colors = hues.map(function (h) { return hslToHex((h + 360) % 360, baseHSL.s, baseHSL.l); });
            } else if (scheme === 'hue') {
                var safeMinL = 15;
                var rowStartL = baseHSL.l;

                if (count > 1) {
                    var targetEndRowL = Math.max(safeMinL + 15, baseHSL.l - 40);
                    var rowDrop = (baseHSL.l - targetEndRowL) / (count - 1);
                    rowStartL = baseHSL.l - (i * rowDrop);
                }

                var intraBoxDrop = 6;

                var l0 = rowStartL;
                var l1 = rowStartL - (1 * intraBoxDrop);
                var l2 = rowStartL - (2 * intraBoxDrop);
                var l3 = rowStartL - (3 * intraBoxDrop);

                colors = [
                    hslToHex(baseHSL.h, baseHSL.s, Math.max(safeMinL, l0)),
                    hslToHex(baseHSL.h, baseHSL.s, Math.max(safeMinL, l1)),
                    hslToHex(baseHSL.h, baseHSL.s, Math.max(safeMinL, l2)),
                    hslToHex(baseHSL.h, baseHSL.s, Math.max(safeMinL, l3))
                ];
            }

            var el = createPaletteElement(colors, false);
            container.appendChild(el);
        }

        if (window.setupTooltips) window.setupTooltips();
    }

    function getRandomHex() {
        
        var h = Math.floor(Math.random() * 360);
        var s = Math.floor(Math.random() * 30) + 70;
        var l = Math.floor(Math.random() * 25) + 55;
        return hslToHex(h, s, l);
    }

    function hexToHSL(hex) {
        hex = hex.replace('#', '');
        var r = parseInt(hex.substr(0, 2), 16) / 255;
        var g = parseInt(hex.substr(2, 2), 16) / 255;
        var b = parseInt(hex.substr(4, 2), 16) / 255;

        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }

        return { h: h, s: s * 100, l: l * 100 };
    }

    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        var k = function (n) { return (n + h / 30) % 12; };
        var a = s * Math.min(l, 1 - l);
        var f = function (n) {
            return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        };

        var rgb = [f(0), f(8), f(4)];
        return "#" + rgb.map(function (x) {
            var hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    function createPaletteElement(colors, isSaved) {
        var row = document.createElement('div');
        row.className = 'palette-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.padding = '4px';
        row.style.background = 'rgba(255,255,255,0.03)';
        row.style.border = '1px solid rgba(255,255,255,0.05)';
        row.style.borderRadius = '6px';
        row.style.transition = 'all 0.2s ease';
        row.style.marginBottom = '6px';

        colors.forEach(function (color) {
            var swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.flex = '1';
            swatch.style.height = '34px';
            swatch.style.background = color;
            swatch.style.borderRadius = '4px';
            swatch.style.cursor = 'pointer';
            swatch.style.position = 'relative';
            swatch.style.transition = 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            swatch.style.marginRight = '4px';
            swatch.setAttribute('data-tooltip', color.substring(1).toUpperCase());

            var copiedText = document.createElement('span');
            copiedText.innerText = 'COPIED';
            copiedText.style.position = 'absolute';
            copiedText.style.top = '50%';
            copiedText.style.left = '50%';
            copiedText.style.transform = 'translate(-50%, -50%)';
            copiedText.style.fontSize = '8px';
            copiedText.style.fontWeight = '900';
            copiedText.style.color = '#fff';
            copiedText.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
            copiedText.style.opacity = '0';
            copiedText.style.pointerEvents = 'none';
            copiedText.style.transition = 'opacity 0.2s ease';
            swatch.appendChild(copiedText);

            swatch.addEventListener('mousedown', function () { swatch.style.transform = 'scale(0.92)'; });
            swatch.addEventListener('mouseup', function () { swatch.style.transform = 'scale(1)'; });
            swatch.addEventListener('mouseleave', function () { swatch.style.transform = 'scale(1)'; });

            swatch.addEventListener('click', function () {
                var hexCode = color.substring(1).toUpperCase();
                copyToClipboard(hexCode);

                if (window.showTooltip) window.showTooltip(swatch, hexCode, 1000);

                copiedText.style.opacity = '1';
                setTimeout(function () { copiedText.style.opacity = '0'; }, 800);
            });

            row.appendChild(swatch);
        });

        var actionBtn = document.createElement('button');
        actionBtn.style.background = 'transparent';
        actionBtn.style.border = 'none';
        actionBtn.style.color = isSaved ? '#ff4444' : '#ffb400';
        actionBtn.style.cursor = 'pointer';
        actionBtn.style.padding = '0 6px';
        actionBtn.style.display = 'flex';
        actionBtn.style.alignItems = 'center';
        actionBtn.innerHTML = '<span class="material-icons" style="font-size: 18px;">' + (isSaved ? 'delete' : 'save_alt') + '</span>';
        actionBtn.setAttribute('data-tooltip', isSaved ? "Delete" : "Save");

        actionBtn.addEventListener('click', function () {
            if (isSaved) {
                deletePalette(colors, row);
            } else {
                savePalette(colors);
                actionBtn.style.color = '#44ff44';
                actionBtn.innerHTML = '<span class="material-icons" style="font-size: 18px;">done</span>';
            }
        });

        row.appendChild(actionBtn);
        return row;
    }

    function copyToClipboard(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    function savePalette(colors) {
        if (!window.settings) return;
        var current = window.settings.get('saved_palettes') || [];
        var exists = current.some(function (p) { return JSON.stringify(p) === JSON.stringify(colors); });
        if (exists) return;
        current.push(colors);
        window.settings.set('saved_palettes', current);
        loadSaved();
    }

    function deletePalette(colors, rowElement) {
        if (!window.settings) return;
        var current = window.settings.get('saved_palettes') || [];
        var filtered = current.filter(function (p) { return JSON.stringify(p) !== JSON.stringify(colors); });
        window.settings.set('saved_palettes', filtered);
        if (rowElement && rowElement.parentNode) rowElement.parentNode.removeChild(rowElement);
    }

    function loadSaved() {
        if (!savedList) return;
        savedList.innerHTML = '';
        if (!window.settings) return;
        var current = window.settings.get('saved_palettes') || [];
        if (current.length === 0) {
            savedList.innerHTML = '<div style="font-size: 0.65rem; opacity: 0.4; font-style: italic; padding: 10px; text-align: center;">Empty library.</div>';
            return;
        }
        current.forEach(function (colors) { savedList.appendChild(createPaletteElement(colors, true)); });

        if (window.setupTooltips) window.setupTooltips();
    }

    return { init: init };
})();

window.ColorPaletteModule = ColorPaletteModule;
