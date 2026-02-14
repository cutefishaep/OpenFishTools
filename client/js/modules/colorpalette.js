var ColorPaletteModule = (function () {

    let container, btnGenerate, inputCount, schemeSelect, baseTrigger, baseHidden, savedList;

    function init() {
        container = document.getElementById('palette-container');
        savedList = document.getElementById('saved-palettes-list');
        btnGenerate = document.getElementById('btn-generate-palette');
        inputCount = document.getElementById('palette-count');
        schemeSelect = document.getElementById('palette-scheme');
        baseTrigger = document.getElementById('palette-base-trigger');
        baseHidden = document.getElementById('palette-base-color');

        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => {
                const newBase = getRandomHex();
                if (baseHidden) {
                    baseHidden.value = newBase;
                    if (baseTrigger) baseTrigger.style.backgroundColor = newBase;
                }
                generate();
            });
        }

        if (baseTrigger && baseHidden && window.ColorPicker) {
            baseTrigger.addEventListener('click', () => {
                window.ColorPicker.open(baseHidden);
            });


            baseHidden.addEventListener('input', () => {
                const color = baseHidden.value;
                baseTrigger.style.backgroundColor = color;

                generate();
            });
        }

        loadSaved();
        generate();
    }



    function generate() {
        if (!container) return;
        container.innerHTML = '';


        const tooltips = document.querySelectorAll('#custom-tooltip');
        tooltips.forEach(t => t.classList.remove('visible'));

        let count = parseInt(inputCount.value) || 1;
        count = Math.max(1, Math.min(10, count));
        inputCount.value = count;

        const schemes = ['analogous', 'complementary', 'triadic'];
        const selectedScheme = schemeSelect ? schemeSelect.value : 'random';

        for (let i = 0; i < count; i++) {

            let baseHex = baseHidden ? baseHidden.value : getRandomHex();


            if (i > 0) baseHex = getRandomHex();


            let scheme = selectedScheme;
            if (scheme === 'random') {
                scheme = schemes[Math.floor(Math.random() * schemes.length)];
            }


            const baseHSL = hexToHSL(baseHex);
            let hues = [];

            if (scheme === 'analogous') {
                hues = [
                    baseHSL.h - 30,
                    baseHSL.h,
                    baseHSL.h + 30,
                    baseHSL.h + 60
                ];
            } else if (scheme === 'complementary') {
                hues = [
                    baseHSL.h,
                    baseHSL.h + 180,
                    baseHSL.h + 150, // Accents
                    baseHSL.h + 210
                ];
            } else if (scheme === 'triadic') {
                hues = [
                    baseHSL.h,
                    baseHSL.h + 120,
                    baseHSL.h + 240,
                    baseHSL.h + 60 // Variation
                ];
            }


            const colors = hues.map(h => {

                let normalizedHue = (h + 360) % 360;
                return hslToHex(normalizedHue, baseHSL.s, baseHSL.l);
            });


            const el = createPaletteElement(colors, false);
            container.appendChild(el);
        }

        if (window.setupTooltips) window.setupTooltips();
    }

    function getRandomHex() {
        const hex = Math.floor(Math.random() * 16777215).toString(16);
        return "#" + ("000000" + hex).slice(-6);
    }


    function hexToHSL(hex) {
        hex = hex.replace('#', '');
        let r = parseInt(hex.substr(0, 2), 16) / 255;
        let g = parseInt(hex.substr(2, 2), 16) / 255;
        let b = parseInt(hex.substr(4, 2), 16) / 255;

        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
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

        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

        const rgb = [f(0), f(8), f(4)];
        return "#" + rgb.map(x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }



    function createPaletteElement(colors, isSaved) {
        const row = document.createElement('div');
        row.className = 'palette-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '4px';
        row.style.padding = '4px';
        row.style.background = 'rgba(255,255,255,0.03)';
        row.style.border = '1px solid rgba(255,255,255,0.05)';
        row.style.borderRadius = '6px';
        row.style.transition = 'all 0.2s ease';


        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.flex = '1';
            swatch.style.height = '34px';
            swatch.style.background = color;
            swatch.style.borderRadius = '4px';
            swatch.style.cursor = 'pointer';
            swatch.style.position = 'relative';
            swatch.style.transition = 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            swatch.setAttribute('data-tooltip', color.substring(1).toUpperCase());


            const copiedText = document.createElement('span');
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

            swatch.addEventListener('mousedown', () => swatch.style.transform = 'scale(0.92)');
            swatch.addEventListener('mouseup', () => swatch.style.transform = 'scale(1)');
            swatch.addEventListener('mouseleave', () => swatch.style.transform = 'scale(1)');

            swatch.addEventListener('click', function () {
                const hexCode = color.substring(1).toUpperCase();
                copyToClipboard(hexCode);


                if (window.showTooltip) window.showTooltip(swatch, hexCode, 1000);

                copiedText.style.opacity = '1';
                setTimeout(() => copiedText.style.opacity = '0', 800);
            });

            row.appendChild(swatch);
        });


        const actionBtn = document.createElement('button');
        actionBtn.style.background = 'transparent';
        actionBtn.style.border = 'none';
        actionBtn.style.color = isSaved ? '#ff4444' : 'var(--accent)';
        actionBtn.style.cursor = 'pointer';
        actionBtn.style.padding = '0 6px';
        actionBtn.style.display = 'flex';
        actionBtn.style.alignItems = 'center';
        actionBtn.innerHTML = `<span class="material-icons" style="font-size: 18px;">${isSaved ? 'delete' : 'save_alt'}</span>`;
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
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    function savePalette(colors) {
        if (!window.settings) return;
        const current = window.settings.get('saved_palettes') || [];
        const exists = current.some(p => JSON.stringify(p) === JSON.stringify(colors));
        if (exists) return;
        current.push(colors);
        window.settings.set('saved_palettes', current);
        loadSaved();
    }

    function deletePalette(colors, rowElement) {
        if (!window.settings) return;
        const current = window.settings.get('saved_palettes') || [];
        const filtered = current.filter(p => JSON.stringify(p) !== JSON.stringify(colors));
        window.settings.set('saved_palettes', filtered);
        if (rowElement && rowElement.parentNode) rowElement.parentNode.removeChild(rowElement);
    }

    function loadSaved() {
        if (!savedList) return;
        savedList.innerHTML = '';
        if (!window.settings) return;
        const current = window.settings.get('saved_palettes') || [];
        if (current.length === 0) {
            savedList.innerHTML = '<div style="font-size: 0.65rem; opacity: 0.4; font-style: italic; padding: 10px; text-align: center;">Empty library.</div>';
            return;
        }
        current.forEach(colors => savedList.appendChild(createPaletteElement(colors, true)));

        if (window.setupTooltips) window.setupTooltips();
    }

    return { init: init };
})();

window.ColorPaletteModule = ColorPaletteModule;
