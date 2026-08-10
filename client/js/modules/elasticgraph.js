'use strict';

var ElasticGraphModule = (function () {
    var canvas, ctx;
    var width, height;
    var padding = { top: 20, right: 25, bottom: 25, left: 25 };

    var handle = { x: 0.40, y: 0.55, radius: 10, isDragging: false };

    var isSnapEnabled = false;

    var btnSnap, btnCopy, btnPaste, btnApply, btnSavePreset, presetList;
    var elasticPresets = [];

    function init() {
        canvas = document.getElementById('elastic-graph-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        btnSnap = document.getElementById('btn-elastic-snap');
        btnCopy = document.getElementById('btn-elastic-copy');
        btnPaste = document.getElementById('btn-elastic-paste');
        btnApply = document.getElementById('btn-elastic-apply');
        btnSavePreset = document.getElementById('btn-save-elastic-preset');
        presetList = document.getElementById('elastic-preset-list');

        if (btnSnap) btnSnap.addEventListener('click', toggleSnap);
        if (btnCopy) btnCopy.addEventListener('click', copyValue);
        if (btnPaste) btnPaste.addEventListener('click', pasteValue);
        if (btnApply) btnApply.addEventListener('click', applyExpression);
        if (btnSavePreset) btnSavePreset.addEventListener('click', savePreset);

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onMouseUp);

        loadPresets();
        loadLastElasticValue();
        render();
    }

    function getCSSVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function hexToRgba(colorStr, alpha) {
        if (!colorStr) return 'rgba(255, 180, 0, ' + alpha + ')';
        var hex = colorStr.trim();
        if (hex.indexOf('rgba') === 0 || hex.indexOf('rgb') === 0) return hex;
        if (hex.charAt(0) === '#') hex = hex.substring(1);
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length === 6) {
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }
        return colorStr;
    }

    function resize() {
        if (!canvas) return;
        var parent = canvas.parentElement;
        var rect = parent.getBoundingClientRect();
        parent.style.height = (rect.width * 0.625) + 'px';
        canvas.width = rect.width;
        canvas.height = rect.width * 0.625;
        width = canvas.width;
        height = canvas.height;
        render();
    }

    function toggleSnap() {
        isSnapEnabled = !isSnapEnabled;
        if (btnSnap) btnSnap.classList.toggle('active', isSnapEnabled);
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function snap(val) {
        if (!isSnapEnabled) return val;
        return Math.round(val * 10) / 10;
    }

    function getElasticValue(t, hx, hy) {
        if (t <= 0) return 0;
        if (t >= 1) return 1.0;

        var targetTrough = Math.max(0.02, hx);
        var dampingRatio = 0.04 + hy * 0.32;
        var omega = (2.0 * Math.PI) / targetTrough;
        var decay = dampingRatio * omega;
        var fade = Math.pow(1 - t * t, 2);
        var env = Math.exp(-decay * t) * fade;
        var wave = Math.cos(omega * t);

        return 1 - (env * wave);
    }

    function findExtremaPoints(hx, hy) {
        var points = [{ t: 0, val: 0 }];
        var steps = 500;
        var prevVal = getElasticValue(0, hx, hy);
        var prevSlope = 0;

        for (var i = 1; i <= steps; i++) {
            var t = i / steps;
            var val = getElasticValue(t, hx, hy);
            var currentSlope = val - prevVal;

            if (i > 1 && Math.sign(currentSlope) !== Math.sign(prevSlope) && prevSlope !== 0) {
                var peakT = ((i - 0.5) / steps);
                var peakVal = getElasticValue(peakT, hx, hy);
                points.push({ t: peakT, val: peakVal });
            }

            prevSlope = currentSlope;
            prevVal = val;
        }

        points.push({ t: 1, val: 1.0 });
        return points;
    }

    function render() {
        if (!ctx || !width || !height) return;
        drawGraphOnCanvas(ctx, width, height, handle, true);
    }

    function drawGraphOnCanvas(context, w, h, hndl, isMain) {
        var clrCurve   = getCSSVar('--graph-curve')   || '#ffb400';
        var clrHandle  = getCSSVar('--graph-handle')  || '#ffffff';
        var clrGrid    = getCSSVar('--graph-grid')     || 'rgba(255,180,0,0.08)';
        var clrGridMid = getCSSVar('--graph-grid-mid')|| 'rgba(255,180,0,0.2)';
        var clrDash    = getCSSVar('--graph-dash')    || 'rgba(255,180,0,0.2)';
        var clrBox     = getCSSVar('--graph-box')     || 'rgba(255,180,0,0.4)';
        var clrBorder  = getCSSVar('--graph-border')  || '#333';

        var pad = { top: 20, right: 25, bottom: 25, left: 25 };
        if (!isMain) { pad = { top: 4, right: 4, bottom: 4, left: 4 }; }

        var plotW = w - pad.left - pad.right;
        var plotH = h - pad.top - pad.bottom;

        var y0 = pad.top + plotH * 0.88;
        var y1 = pad.top + plotH * 0.38;

        context.fillStyle = getCSSVar('--graph-bg') || '#0a0a0a';
        context.fillRect(0, 0, w, h);

        context.lineWidth = 1;
        context.strokeStyle = clrGrid;

        if (isMain) {
            var cols = 8;
            for (var i = 0; i <= cols; i++) {
                var x = pad.left + (i / cols) * plotW;
                context.strokeStyle = (i === 4) ? clrGridMid : clrGrid;
                context.beginPath();
                context.moveTo(x, pad.top);
                context.lineTo(x, h - pad.bottom);
                context.stroke();
            }
            var rows = 5;
            for (var j = 0; j <= rows; j++) {
                var y = pad.top + (j / rows) * plotH;
                context.strokeStyle = (j === 2 || j === 3) ? clrGridMid : clrGrid;
                context.beginPath();
                context.moveTo(pad.left, y);
                context.lineTo(w - pad.right, y);
                context.stroke();
            }

            context.strokeStyle = clrBox;
            context.strokeRect(pad.left, pad.top, plotW, plotH);
        } else {
            context.strokeStyle = clrBorder;
            context.strokeRect(pad.left, pad.top, plotW, plotH);
        }

        context.strokeStyle = clrDash;
        context.lineWidth = 1;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(pad.left, y1);
        context.lineTo(w - pad.right, y1);
        context.stroke();
        context.beginPath();
        context.moveTo(pad.left, y0);
        context.lineTo(w - pad.right, y0);
        context.stroke();
        context.setLineDash([]);

        context.lineWidth = isMain ? 3 : 2;
        context.strokeStyle = clrCurve;
        context.beginPath();
        var steps = 300;
        for (var k = 0; k <= steps; k++) {
            var t = k / steps;
            var val = getElasticValue(t, hndl.x, hndl.y);
            var px = pad.left + t * plotW;
            var py = y0 - val * (y0 - y1);
            if (k === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }
        context.stroke();

        if (isMain) {
            var allExtrema = findExtremaPoints(hndl.x, hndl.y);
            var targetKfIdx = 2;
            var targetKf = allExtrema[targetKfIdx];
            if (!targetKf) targetKf = allExtrema[allExtrema.length - 1];

            var kfX = pad.left + targetKf.t * plotW;
            var kfY = y0 - targetKf.val * (y0 - y1);
            var handleCanvasX = kfX;
            var handleCanvasY = pad.top + hndl.y * plotH;

            context.strokeStyle = clrHandle;
            context.lineWidth = 4;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(kfX, kfY);
            context.lineTo(handleCanvasX, handleCanvasY);
            context.stroke();

            context.fillStyle = clrCurve;
            context.shadowBlur = 4;
            context.shadowColor = 'rgba(0,0,0,0.3)';
            context.beginPath();
            context.arc(handleCanvasX, handleCanvasY, 12, 0, Math.PI * 2);
            context.fill();
            context.shadowBlur = 0;

            context.strokeStyle = 'rgba(0,0,0,0.1)';
            context.lineWidth = 1;
            context.stroke();
        }
    }

    function getHandleScreenPos() {
        var pad = { top: 20, right: 25, bottom: 25, left: 25 };
        var plotW = width - pad.left - pad.right;
        var plotH = height - pad.top - pad.bottom;
        var y0 = pad.top + plotH * 0.88;

        var allExtrema = findExtremaPoints(handle.x, handle.y);
        var targetKfIdx = 2;
        var targetKf = allExtrema[targetKfIdx];
        if (!targetKf) targetKf = allExtrema[allExtrema.length - 1];

        var kfX = pad.left + targetKf.t * plotW;
        var handleCanvasX = kfX;
        var handleCanvasY = pad.top + handle.y * plotH;

        return { x: handleCanvasX, y: handleCanvasY };
    }

    function onMouseDown(e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        var hp = getHandleScreenPos();
        var dist = Math.hypot(mx - hp.x, my - hp.y);
        if (dist <= handle.radius + 25) {
            handle.isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
    }

    function onTouchStart(e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var touch = e.touches[0];
        var mx = (touch.clientX - rect.left) * scaleX;
        var my = (touch.clientY - rect.top) * scaleY;

        var hp = getHandleScreenPos();
        var dist = Math.hypot(mx - hp.x, my - hp.y);
        if (dist <= handle.radius + 25) {
            handle.isDragging = true;
        }
    }

    function onMouseMove(e) {
        if (!handle.isDragging && e.target !== canvas) return;

        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        if (!handle.isDragging) {
            var hp = getHandleScreenPos();
            var d = Math.hypot(mx - hp.x, my - hp.y);
            canvas.style.cursor = (d <= handle.radius + 25) ? 'grab' : 'default';
            return;
        }

        canvas.style.cursor = 'grabbing';
        handleInputMove(mx, my);
    }

    function onTouchMove(e) {
        if (!handle.isDragging) return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var touch = e.touches[0];
        var mx = (touch.clientX - rect.left) * scaleX;
        var my = (touch.clientY - rect.top) * scaleY;
        handleInputMove(mx, my);
    }

    function handleInputMove(mx, my) {
        var pad = { top: 20, right: 25, bottom: 25, left: 25 };
        var plotW = width - pad.left - pad.right;
        var plotH = height - pad.top - pad.bottom;

        var normX = (mx - pad.left) / plotW;
        var normY = (my - pad.top) / plotH;

        handle.x = clamp(snap(normX), 0.02, 0.98);
        handle.y = clamp(snap(normY), 0.05, 0.95);

        updateHiddenInputs();
        saveLastElasticValue();
        render();
    }

    function onMouseUp() {
        handle.isDragging = false;
        if (canvas) canvas.style.cursor = 'grab';
    }

    function updateHiddenInputs() {
        var elX = document.getElementById('input-elastic-x');
        var elY = document.getElementById('input-elastic-y');
        if (elX) elX.value = handle.x.toFixed(2);
        if (elY) elY.value = handle.y.toFixed(2);
    }

    function copyValue() {
        var value = handle.x.toFixed(2) + ',' + handle.y.toFixed(2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(function () {
                if (window.ModalModule) window.ModalModule.info('Elastic value copied!', 'Copied');
            }).catch(function () {
                fallbackCopy(value);
            });
        } else {
            fallbackCopy(value);
        }
    }

    function pasteValue() {
        if (window.ModalModule) {
            window.ModalModule.prompt('Paste elastic value (format: x,y):', '0.40,0.55', function (value) {
                if (!value) return;
                parseElasticValue(value);
            });
        }
    }

    function parseElasticValue(value) {
        try {
            var parts = value.split(',');
            if (parts.length !== 2) throw new Error('Invalid format');
            var x = clamp(parseFloat(parts[0]), 0.02, 0.98);
            var y = clamp(parseFloat(parts[1]), 0.05, 0.95);
            if (isNaN(x) || isNaN(y)) throw new Error('Invalid numbers');
            handle.x = x;
            handle.y = y;
            updateHiddenInputs();
            saveLastElasticValue();
            render();
            if (window.ModalModule) window.ModalModule.info('Elastic value applied!', 'Success');
        } catch (e) {
            if (window.ModalModule) window.ModalModule.error('Invalid format. Use: x,y', 'Parse Error');
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (window.ModalModule) window.ModalModule.info('Copied to clipboard!', 'Copied');
    }

    function applyExpression() {
        var data = { x: handle.x, y: handle.y };

        var cs = new CSInterface();
        cs.evalScript("FishTools.applyElastic(" + JSON.stringify(data) + ")", function (res) {
            if (res === "{ok:true}") return;
            if (window.ModalModule) window.ModalModule.error('No keyframes selected. Select 2 adjacent keyframes first.', 'Elastic Graph');
        });
    }

    function savePreset() {
        if (window.ModalModule) {
            window.ModalModule.prompt('Enter a name for your preset:', 'My Elastic', function (name) {
                if (!name) return;
                var data = { name: name, x: handle.x, y: handle.y };
                elasticPresets.push(data);
                if (window.FileStore) {
                    window.FileStore.set('elastic_presets', { presets: elasticPresets });
                }
                refreshPresets();
            });
        }
    }

    function loadPresets() {
        if (window.FileStore) {
            var data = window.FileStore.get('elastic_presets');
            if (data && data.presets) {
                elasticPresets = data.presets;
            }
        }
        refreshPresets();
    }

    function refreshPresets() {
        if (!presetList) return;
        presetList.innerHTML = '';
        elasticPresets.forEach(function (p, idx) {
            var btn = document.createElement('div');
            btn.className = 'preset-item';
            btn.title = p.name;
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.padding = '4px';
            btn.style.borderRadius = '6px';
            btn.style.transition = 'background 0.2s';
            btn.style.position = 'relative';

            var delBtn = document.createElement('div');
            delBtn.innerHTML = '&times;';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '-2px';
            delBtn.style.right = '-2px';
            delBtn.style.width = '18px';
            delBtn.style.height = '18px';
            delBtn.style.background = '#ff4444';
            delBtn.style.color = '#fff';
            delBtn.style.borderRadius = '50%';
            delBtn.style.fontSize = '12px';
            delBtn.style.lineHeight = '16px';
            delBtn.style.textAlign = 'center';
            delBtn.style.opacity = '0';
            delBtn.style.transition = 'opacity 0.2s';
            delBtn.style.zIndex = '10';

            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.ModalModule) {
                    window.ModalModule.confirm('Delete preset "' + p.name + '"?', 'Delete', function (confirmed) {
                        if (confirmed) {
                            elasticPresets.splice(idx, 1);
                            if (window.FileStore) window.FileStore.set('elastic_presets', { presets: elasticPresets });
                            refreshPresets();
                        }
                    });
                }
            });
            btn.appendChild(delBtn);

            btn.onmouseover = function () { delBtn.style.opacity = '1'; };
            btn.onmouseout = function () { delBtn.style.opacity = '0'; };

            var thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 65;
            thumbCanvas.height = 40;
            thumbCanvas.style.background = 'var(--graph-bg)';
            thumbCanvas.style.border = '1px solid var(--border)';
            thumbCanvas.style.borderRadius = '4px';
            thumbCanvas.style.marginBottom = '6px';
            btn.appendChild(thumbCanvas);

            var tCtx = thumbCanvas.getContext('2d');
            drawGraphOnCanvas(tCtx, 65, 40, { x: p.x, y: p.y, radius: 6, isDragging: false }, false);

            var lbl = document.createElement('span');
            lbl.innerText = p.name;
            lbl.style.fontSize = '0.6rem';
            lbl.style.color = '#888';
            lbl.style.whiteSpace = 'nowrap';
            lbl.style.overflow = 'hidden';
            lbl.style.textOverflow = 'ellipsis';
            lbl.style.maxWidth = '100%';
            btn.appendChild(lbl);

            btn.addEventListener('click', function () {
                handle.x = p.x;
                handle.y = p.y;
                updateHiddenInputs();
                saveLastElasticValue();
                render();
            });

            presetList.appendChild(btn);
        });
    }

    function refresh() {
        if (!canvas || !ctx) return;
        render();
        loadPresets();
    }

    function loadLastElasticValue() {
        if (!window.FileStore) return;
        var data = window.FileStore.get('last_elastic_value');
        if (data) {
            if (data.x !== undefined) handle.x = data.x;
            if (data.y !== undefined) handle.y = data.y;
            updateHiddenInputs();
        }
    }

    function saveLastElasticValue() {
        if (!window.FileStore) return;
        window.FileStore.set('last_elastic_value', { x: handle.x, y: handle.y });
    }

    return {
        init: init,
        resize: resize,
        refresh: refresh
    };

})();

window.ElasticGraphModule = ElasticGraphModule;
