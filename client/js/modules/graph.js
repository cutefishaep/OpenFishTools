'use strict';

var GraphModule = (function () {
    var canvas, ctx;
    var width, height;
    var padding = 12;
    var paddingOvershoot = 45;
    var graphSize = 200;

    var cp1 = { x: 0.33, y: 0 };
    var cp2 = { x: 0.67, y: 1 };
    var isDragging = null;
    var isSnapEnabled = false;
    var isOvershootEnabled = false;
    var isAutoApplyEnabled = false;
    var autoApplyTimer = null;

    var btnSnap, btnOvershoot, btnRead, btnApply, btnSavePreset, presetList, btnAuto, btnCopy, btnPaste;
    var speedCanvas, isDraggingSpeed = null, speedPointerId = null;
    var velPresets = [];
    var isVelSnapEnabled = false, isVelAutoEnabled = false;
    var btnVelSnap, btnVelAuto, btnVelCopy, btnVelPaste;

    function init() {
        canvas = document.getElementById('ease-graph');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        btnSnap = document.getElementById('btn-graph-snap');
        btnOvershoot = document.getElementById('btn-graph-overshoot');
        btnRead = document.getElementById('btn-graph-read');
        btnApply = document.getElementById('btn-graph-apply');
        btnAuto = document.getElementById('btn-graph-auto');
        btnCopy = document.getElementById('btn-graph-copy');
        btnPaste = document.getElementById('btn-graph-paste');
        btnSavePreset = document.getElementById('btn-save-preset');
        presetList = document.getElementById('preset-list');

        var btnVelRead = document.getElementById('btn-vel-read');
        var btnVelApply = document.getElementById('btn-vel-apply');
        var btnVelCopy = document.getElementById('btn-vel-copy');
        var btnVelPaste = document.getElementById('btn-vel-paste');
        if (btnVelRead) btnVelRead.addEventListener('click', readVelocity);
        if (btnVelApply) btnVelApply.addEventListener('click', applyVelocity);
        if (btnVelCopy) btnVelCopy.addEventListener('click', copyVelocityValue);
        if (btnVelPaste) btnVelPaste.addEventListener('click', pasteVelocityValue);

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onMouseUp);

        var velInputs = ['input-vel-in-speed', 'input-vel-in-infl', 'input-vel-out-speed', 'input-vel-out-infl'];
        velInputs.forEach(function(id) {
            var el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', renderSpeedPreview);
                el.addEventListener('change', renderSpeedPreview);
            }
        });

        if (btnSnap) btnSnap.addEventListener('click', toggleSnap);
        if (btnOvershoot) btnOvershoot.addEventListener('click', toggleOvershoot);
        if (btnRead) btnRead.addEventListener('click', readEase);
        if (btnApply) btnApply.addEventListener('click', applyEase);
        if (btnAuto) btnAuto.addEventListener('click', toggleAutoApply);
        if (btnSavePreset) btnSavePreset.addEventListener('click', savePreset);
        if (btnCopy) btnCopy.addEventListener('click', copyEaseValue);
        if (btnPaste) btnPaste.addEventListener('click', pasteEaseValue);

        window.addEventListener('keydown', function (e) {
            if (e.key === 'Shift') isSnapEnabled = true;
            render();
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === 'Shift') isSnapEnabled = btnSnap ? btnSnap.classList.contains('active') : false;
            render();
        });

        speedCanvas = document.getElementById('speed-preview-canvas');
        btnVelSnap = document.getElementById('btn-vel-snap');
        btnVelAuto = document.getElementById('btn-vel-auto');
        if (btnVelSnap) btnVelSnap.addEventListener('click', function() {
            isVelSnapEnabled = !isVelSnapEnabled;
            btnVelSnap.classList.toggle('active', isVelSnapEnabled);
        });
        if (btnVelAuto) btnVelAuto.addEventListener('click', function() {
            isVelAutoEnabled = !isVelAutoEnabled;
            btnVelAuto.classList.toggle('active', isVelAutoEnabled);
        });

        if (speedCanvas) {
            speedCanvas.addEventListener('mousedown', onSpeedMouseDown);
        }
        window.addEventListener('mousemove', onSpeedMouseMove);
        window.addEventListener('mouseup', onSpeedMouseUp);

        var btnVelSavePreset = document.getElementById('btn-save-vel-preset');
        if (btnVelSavePreset) btnVelSavePreset.addEventListener('click', saveVelPreset);

        loadPresets();
        loadVelPresets();
        loadLastGraphValues();
        render();
    }

    function getCSSVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function hexToRgba(colorStr, alpha) {
        if (!colorStr) return 'rgba(255, 180, 0, ' + alpha + ')';
        var hex = colorStr.trim();
        if (hex.indexOf('rgba') === 0 || hex.indexOf('rgb') === 0) {
            return hex;
        }
        if (hex.charAt(0) === '#') {
            hex = hex.substring(1);
        }
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
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
        parent.style.height = rect.width + 'px';
        canvas.width = rect.width;
        canvas.height = rect.width;
        width = canvas.width;
        height = canvas.height;
        render();
        renderSpeedPreview();
    }

    function toggleSnap() {
        isSnapEnabled = !isSnapEnabled;
        if (btnSnap) btnSnap.classList.toggle('active', isSnapEnabled);
    }

    function toggleOvershoot() {
        isOvershootEnabled = !isOvershootEnabled;
        if (btnOvershoot) btnOvershoot.classList.toggle('active', isOvershootEnabled);
        resize();
    }

    function toggleAutoApply() {
        isAutoApplyEnabled = !isAutoApplyEnabled;
        if (btnAuto) btnAuto.classList.toggle('active', isAutoApplyEnabled);
    }

    function getLayout() {
        var currentPad = isOvershootEnabled ? paddingOvershoot : padding;
        var availSize = Math.min(width, height) - (currentPad * 2);
        var size = availSize;
        var offsetX = (width - size) / 2;
        var offsetY = (height - size) / 2;
        return { size: size, offsetX: offsetX, offsetY: offsetY };
    }

    function getScreenPos(nx, ny) {
        var layout = getLayout();
        var sx = layout.offsetX + (nx * layout.size);
        var sy = (height - layout.offsetY) - (ny * layout.size);
        return { x: sx, y: sy };
    }

    function getNormPos(sx, sy) {
        var layout = getLayout();
        var nx = (sx - layout.offsetX) / layout.size;
        var ny = ((height - layout.offsetY) - sy) / layout.size;
        return { x: nx, y: ny };
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function snap(val) {
        if (!isSnapEnabled) return val;
        return Math.round(val * 10) / 10;
    }

    function onMouseDown(e) {
        var rect = canvas.getBoundingClientRect();
        handleInputStart(e.clientX - rect.left, e.clientY - rect.top);
    }

    function onTouchStart(e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var touch = e.touches[0];
        handleInputStart(touch.clientX - rect.left, touch.clientY - rect.top);
    }

    function handleInputStart(x, y) {
        var s1 = getScreenPos(cp1.x, cp1.y);
        var s2 = getScreenPos(cp2.x, cp2.y);
        var dist1 = Math.hypot(x - s1.x, y - s1.y);
        var dist2 = Math.hypot(x - s2.x, y - s2.y);
        var threshold = 35;

        if (dist1 < threshold) {
            isDragging = 'cp1';
        } else if (dist2 < threshold) {
            isDragging = 'cp2';
        }
    }

    function onMouseMove(e) {
        if (!isDragging && e.target !== canvas) return;

        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        if (!isDragging) {
            var s1 = getScreenPos(cp1.x, cp1.y);
            var s2 = getScreenPos(cp2.x, cp2.y);
            var d1 = Math.hypot(mx - s1.x, my - s1.y);
            var d2 = Math.hypot(mx - s2.x, my - s2.y);
            canvas.style.cursor = (d1 < 20 || d2 < 20) ? 'pointer' : 'crosshair';
            return;
        }

        canvas.style.cursor = 'grabbing';
        handleInputMove(mx, my);
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var touch = e.touches[0];
        handleInputMove(touch.clientX - rect.left, touch.clientY - rect.top);
    }

    function handleInputMove(x, y) {
        var nPos = getNormPos(x, y);

        nPos.x = clamp(snap(nPos.x), 0, 1);
        nPos.y = snap(nPos.y);

        if (!isOvershootEnabled) {
            nPos.y = clamp(nPos.y, 0, 1);
        }

        var selfScreen = getScreenPos(nPos.x, nPos.y);
        var otherPos = (isDragging === 'cp1') ? cp2 : cp1;
        var otherScreen = getScreenPos(otherPos.x, otherPos.y);
        if (Math.hypot(selfScreen.x - otherScreen.x, selfScreen.y - otherScreen.y) < 20) {
            nPos.x = otherPos.x;
            nPos.y = otherPos.y;
        }

        if (isDragging === 'cp1') {
            cp1 = nPos;
        } else {
            cp2 = nPos;
        }

        if (isAutoApplyEnabled) {
            clearTimeout(autoApplyTimer);
            autoApplyTimer = setTimeout(function () {
                applyEase();
            }, 50);
        }

        saveLastGraphValues();
        render();
    }

    function onMouseUp() {
        isDragging = null;
    }

    function render() {
        if (!ctx) return;
        drawGraphOnCanvas(ctx, width, height, cp1, cp2, isDragging);
    }

    function drawGraphOnCanvas(context, w, h, p1, p2, draggingState) {
        var isMain = (w === width);
        var clrCurve   = getCSSVar('--graph-curve')   || '#ffb400';
        var clrHandle  = getCSSVar('--graph-handle')  || '#ffffff';
        var clrGrid    = getCSSVar('--graph-grid')     || 'rgba(255,180,0,0.08)';
        var clrGridMid = getCSSVar('--graph-grid-mid')|| 'rgba(255,180,0,0.2)';
        var clrBox     = getCSSVar('--graph-box')     || 'rgba(255,180,0,0.4)';
        var clrDash    = getCSSVar('--graph-dash')    || 'rgba(255,180,0,0.2)';
        var clrBorder  = getCSSVar('--graph-border')  || '#333';

        context.clearRect(0, 0, w, h);

        var layout = getLayout();
        if (!isMain) {
            var thumbPad = w * 0.2;
            var thumbSize = w - (thumbPad * 2);
            layout = {
                size: thumbSize,
                offsetX: (w - thumbSize) / 2,
                offsetY: (h - thumbSize) / 2
            };
        }

        var size = Math.floor(layout.size);
        var offsetX = Math.floor(layout.offsetX);
        var offsetY = Math.floor(layout.offsetY);

        function toScreen(nx, ny) {
            return {
                x: offsetX + (nx * size),
                y: (h - offsetY) - (ny * size)
            };
        }

        var start = toScreen(0, 0);
        var end = toScreen(1, 1);

        context.lineWidth = 1;
        if (isMain) {
            var steps = 10;
            for (var i = 1; i < steps; i++) {
                var pos = i / steps;
                var cx = Math.round(offsetX + pos * size) + 0.5;
                var cy = Math.round(offsetY + (1 - pos) * size) + 0.5;

                context.strokeStyle = (i === 5) ? clrGridMid : clrGrid;
                context.beginPath();
                context.moveTo(cx, offsetY);
                context.lineTo(cx, offsetY + size);
                context.moveTo(offsetX, cy);
                context.lineTo(offsetX + size, cy);
                context.stroke();
            }

            context.strokeStyle = clrBox;
            context.strokeRect(offsetX, offsetY, size, size);

            context.strokeStyle = clrDash;
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            context.beginPath();
            context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
            context.stroke();
            context.setLineDash([]);
            context.lineWidth = 1;
        } else {
            context.strokeStyle = clrBorder;
            context.strokeRect(offsetX, offsetY, size, size);
        }

        context.strokeStyle = clrCurve;
        context.lineWidth = isMain ? 6 : 3;
        context.beginPath();
        context.moveTo(start.x, start.y);

        var s1 = toScreen(p1.x, p1.y);
        var s2 = toScreen(p2.x, p2.y);

        context.bezierCurveTo(s1.x, s1.y, s2.x, s2.y, end.x, end.y);
        context.stroke();

        if (isMain) {
            context.strokeStyle = clrHandle;
            context.lineWidth = 4;

            context.beginPath();
            context.moveTo(start.x, start.y); context.lineTo(s1.x, s1.y);
            context.stroke();

            context.beginPath();
            context.moveTo(end.x, end.y); context.lineTo(s2.x, s2.y);
            context.stroke();

            drawPoint(context, s1.x, s1.y, draggingState === 'cp1' ? clrHandle : clrCurve);
            drawPoint(context, s2.x, s2.y, draggingState === 'cp2' ? clrHandle : clrCurve);
        }
    }

    function drawPoint(context, x, y, color) {
        context.fillStyle = color;
        context.shadowBlur = 4;
        context.shadowColor = 'rgba(0,0,0,0.3)';
        context.beginPath();
        context.arc(x, y, 12, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        
        context.strokeStyle = 'rgba(0,0,0,0.1)';
        context.lineWidth = 1;
        context.stroke();
    }

    function readEase() {
        var cs = new CSInterface();
        cs.evalScript('FishTools.readEase()', function (res) {
            try {
                if (!res || res === 'false') {
                    if (window.ModalModule) window.ModalModule.error('No keyframes selected. Select 2 adjacent keyframes first.', 'Graph Editor');
                    return;
                }
                var data = JSON.parse(res);
                if (data.error) {
                    if (window.ModalModule) window.ModalModule.error('No keyframes selected. Select 2 adjacent keyframes first.', 'Graph Editor');
                    return;
                }
                cp1 = { x: data.x1, y: data.y1 };
                cp2 = { x: data.x2, y: data.y2 };
                render();
            } catch (e) {
                if (window.ModalModule) window.ModalModule.error('No keyframes selected. Select 2 adjacent keyframes first.', 'Graph Editor');
            }
        });
    }

    function applyEase() {
        var args = {
            x1: cp1.x, y1: cp1.y,
            x2: cp2.x, y2: cp2.y,
            overshoot: isOvershootEnabled
        };

        var cs = new CSInterface();
        cs.evalScript("FishTools.applyEase(" + JSON.stringify(args) + ")", function (res) {
            if (!res) return;
            try {
                var data = JSON.parse(res);
                if (data.ok) return;
            } catch (e) {}
            if (window.ModalModule) window.ModalModule.error('No keyframes selected. Select 2 adjacent keyframes first.', 'Graph Editor');
        });
    }

    function copyEaseValue() {
        var value = cp1.x + "," + cp1.y + ";" + cp2.x + "," + cp2.y;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(function() {
                if (window.ModalModule) window.ModalModule.info("Ease value copied to clipboard!", "Copied");
            }).catch(function() {
                fallbackCopy(value);
            });
        } else {
            fallbackCopy(value);
        }
    }

    function pasteEaseValue() {
        if (window.ModalModule) {
            window.ModalModule.prompt("Paste graph value (format: x1,y1;x2,y2):", "0.33,0;0.67,1", function(value) {
                if (!value) return;
                parseEaseValue(value);
            });
        }
    }

    function parseEaseValue(value) {
        try {
            var parts = value.split(";");
            if (parts.length !== 2) throw new Error("Invalid format");
            var p1 = parts[0].split(",");
            var p2 = parts[1].split(",");
            if (p1.length !== 2 || p2.length !== 2) throw new Error("Invalid format");
            cp1.x = clamp(parseFloat(p1[0]), 0, 1);
            cp1.y = parseFloat(p1[1]);
            cp2.x = clamp(parseFloat(p2[0]), 0, 1);
            cp2.y = parseFloat(p2[1]);
            if (isNaN(cp1.x) || isNaN(cp1.y) || isNaN(cp2.x) || isNaN(cp2.y)) throw new Error("Invalid numbers");
            render();
            if (window.ModalModule) window.ModalModule.info("Ease value applied!", "Success");
        } catch (e) {
            if (window.ModalModule) window.ModalModule.error("Invalid format. Use: x1,y1;x2,y2", "Parse Error");
        }
    }

    function copyVelocityValue() {
        var inSpeed = document.getElementById('input-vel-in-speed');
        var inInfl = document.getElementById('input-vel-in-infl');
        var outSpeed = document.getElementById('input-vel-out-speed');
        var outInfl = document.getElementById('input-vel-out-infl');
        var value = (inSpeed ? inSpeed.value : 0) + "," + (inInfl ? inInfl.value : 33) + ";" +
                    (outSpeed ? outSpeed.value : 0) + "," + (outInfl ? outInfl.value : 33);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(function() {
                if (window.ModalModule) window.ModalModule.info("Velocity value copied to clipboard!", "Copied");
            }).catch(function() {
                fallbackCopy(value);
            });
        } else {
            fallbackCopy(value);
        }
    }

    function pasteVelocityValue() {
        if (window.ModalModule) {
            window.ModalModule.prompt("Paste velocity value (format: inSpeed,inInfl;outSpeed,outInfl):", "0,33;0,33", function(value) {
                if (!value) return;
                parseVelocityValue(value);
            });
        }
    }

    function parseVelocityValue(value) {
        try {
            var parts = value.split(";");
            if (parts.length !== 2) throw new Error("Invalid format");
            var inVal = parts[0].split(",");
            var outVal = parts[1].split(",");
            if (inVal.length !== 2 || outVal.length !== 2) throw new Error("Invalid format");

            var inSpeed = parseFloat(inVal[0]);
            var inInfl = parseFloat(inVal[1]);
            var outSpeed = parseFloat(outVal[0]);
            var outInfl = parseFloat(outVal[1]);

            if (isNaN(inSpeed) || isNaN(inInfl) || isNaN(outSpeed) || isNaN(outInfl)) throw new Error("Invalid numbers");

            var elInSpeed = document.getElementById('input-vel-in-speed');
            var elInInfl = document.getElementById('input-vel-in-infl');
            var elOutSpeed = document.getElementById('input-vel-out-speed');
            var elOutInfl = document.getElementById('input-vel-out-infl');

            if (elInSpeed) elInSpeed.value = inSpeed;
            if (elInInfl) elInInfl.value = inInfl;
            if (elOutSpeed) elOutSpeed.value = outSpeed;
            if (elOutInfl) elOutInfl.value = outInfl;

            renderSpeedPreview();
            if (window.ModalModule) window.ModalModule.info("Velocity value applied!", "Success");
        } catch (e) {
            if (window.ModalModule) window.ModalModule.error("Invalid format. Use: inSpeed,inInfl;outSpeed,outInfl", "Parse Error");
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
        if (window.ModalModule) window.ModalModule.info("Copied to clipboard!", "Copied");
    }

    function savePreset() {
        if (window.ModalModule) {
            window.ModalModule.prompt("Enter a name for your new preset:", "My Awesome Ease", function (name) {
                if (!name) return;
                performSave(name);
            });
        }
    }

    function performSave(name) {
        var data = {
            name: name,
            x1: cp1.x, y1: cp1.y,
            x2: cp2.x, y2: cp2.y
        };

        if (window.settings) {
            var existing = window.settings.get('presets') || [];
            existing.push(data);
            window.settings.set('presets', existing);
        }

        addPresetBtn(data, true);
    }

    function loadPresets() {
        if (!window.settings || !presetList) return;
        presetList.innerHTML = '';

        var allPresets = window.settings.get('presets');

        if (allPresets === undefined) {
            allPresets = [
                { name: "Linear", x1: 0, y1: 0, x2: 1, y2: 1 },
                { name: "Ease", x1: 0.8, y1: 0, x2: 0.2, y2: 1 },
                { name: "Ease In", x1: 0.33, y1: 0, x2: 0.15, y2: 1 },
                { name: "Ease Out", x1: 0.85, y1: 0, x2: 0.67, y2: 1 }
            ];
            window.settings.set('presets', allPresets);
        }

        allPresets.forEach(function (p) { addPresetBtn(p, true); });
    }

    function addPresetBtn(p, isUser) {
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

        var delBtn;
        if (isUser) {
            delBtn = document.createElement('div');
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
                    window.ModalModule.confirm('Are you sure you want to delete preset "' + p.name + '"?', 'Delete Preset', function (confirmed) {
                        if (confirmed) {
                            deletePreset(p);
                            btn.remove();
                        }
                    });
                }
            });
            btn.appendChild(delBtn);
        }

        btn.onmouseover = function () {
            this.style.background = 'rgba(255,255,255,0.05)';
            if (isUser && delBtn) delBtn.style.opacity = '1';
        };
        btn.onmouseout = function () {
            this.style.background = 'transparent';
            if (isUser && delBtn) delBtn.style.opacity = '0';
        };

        var thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 52;
        thumbCanvas.height = 52;
        thumbCanvas.style.background = 'var(--graph-bg)';
        thumbCanvas.style.border = '1px solid var(--border)';
        thumbCanvas.style.borderRadius = '4px';
        thumbCanvas.style.marginBottom = '6px';
        btn.appendChild(thumbCanvas);

        var tCtx = thumbCanvas.getContext('2d');
        drawGraphOnCanvas(tCtx, 52, 52, { x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, null);

        var lbl = document.createElement('span');
        lbl.innerText = p.name;
        lbl.style.fontSize = '0.6rem';
        lbl.style.color = '#888';
        lbl.style.whiteSpace = 'nowrap';
        lbl.style.overflow = 'hidden';
        lbl.style.textOverflow = 'ellipsis';
        lbl.style.maxWidth = '100%';

        btn.appendChild(thumbCanvas);
        btn.appendChild(lbl);

        btn.addEventListener('click', function () {
            cp1 = { x: p.x1, y: p.y1 };
            cp2 = { x: p.x2, y: p.y2 };
            render();
        });

        presetList.appendChild(btn);

        if (typeof setupTooltips === 'function') {
            setupTooltips();
        }
    }

    function deletePreset(p) {
        if (!window.settings) return;
        var existing = window.settings.get('presets') || [];
        var filtered = existing.filter(function (item) {
            return !(item.name === p.name && item.x1 === p.x1 && item.y1 === p.y1);
        });
        window.settings.set('presets', filtered);
    }

    function refresh() {
        if (!canvas || !ctx) return;
        render();
        loadPresets();
        loadVelPresets();
        renderSpeedPreview();
    }

    function readVelocity() {
        var cs = new CSInterface();
        cs.evalScript('FishTools.readVelocity()', function (res) {
            try {
                if (!res || res === 'false' || res === 'null') {
                    if (window.ModalModule) window.ModalModule.error('Please select a keyframe to read the velocity from.', 'Velocity Editor');
                    return;
                }
                var data = JSON.parse(res);
                if (data.error) {
                    if (window.ModalModule) window.ModalModule.error(data.message || 'Please select a keyframe to read the velocity from.', 'Velocity Editor');
                    return;
                }
                document.getElementById('input-vel-in-speed').value = Math.round(data.inSpeed);
                document.getElementById('input-vel-in-infl').value = Math.round(data.inInflu);
                document.getElementById('input-vel-out-speed').value = Math.round(data.outSpeed);
                document.getElementById('input-vel-out-infl').value = Math.round(data.outInflu);
                renderSpeedPreview();
            } catch (e) {
                if (window.ModalModule) window.ModalModule.error('Failed to parse response: ' + res, 'Velocity Editor');
            }
        });
    }

    function renderSpeedPreview() {
        var cvs = document.getElementById('speed-preview-canvas');
        if (!cvs) return;
        var cx = cvs.getContext('2d');
        var inSpd = parseFloat(document.getElementById('input-vel-in-speed').value) || 0;
        var inInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-in-infl').value) || 33));
        var outSpd = parseFloat(document.getElementById('input-vel-out-speed').value) || 0;
        var outInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-out-infl').value) || 33));
        drawSpeedCurveOnCanvas(cx, cvs.width, cvs.height, inInf, inSpd, outInf, outSpd, true);
    }

    function drawSpeedCurveOnCanvas(cx, w, h, inInf, inSpd, outInf, outSpd, isFull) {
        cx.fillStyle = getCSSVar('--graph-bg') || '#0a0a0a';
        cx.fillRect(0, 0, w, h);
        
        var pos = getSpeedPos(inInf, inSpd, outInf, outSpd, w, h);
        var cp1X = pos.cp1X, cp1Y = pos.cp1Y;
        var cp2X = pos.cp2X, cp2Y = pos.cp2Y;
        var padX = pos.padX, padY = pos.padY;
        var graphW = pos.graphW, graphH = pos.graphH;
        var startY = pos.cp1Y;
        var endY = pos.cp2Y;

        if (isFull) {
            var clrGrid = getCSSVar('--graph-grid') || 'rgba(255,255,255,0.05)';
            var clrGridMid = getCSSVar('--graph-grid-mid') || 'rgba(255,255,255,0.1)';
            cx.lineWidth = 1;
            for (var i = 0; i <= 4; i++) {
                cx.strokeStyle = (i === 0 || i === 4) ? clrGridMid : clrGrid;
                var y = padY + (i / 4) * pos.graphH;
                cx.beginPath(); cx.moveTo(padX, y); cx.lineTo(w - padX, y); cx.stroke();
            }
            for (var j = 0; j <= 4; j++) {
                cx.strokeStyle = (j === 0 || j === 4) ? clrGridMid : clrGrid;
                var x = padX + (j / 4) * pos.graphW;
                cx.beginPath(); cx.moveTo(x, padY); cx.lineTo(x, h - padY); cx.stroke();
            }
        }

        var accent = getCSSVar('--accent') || '#ffb400';
        var steps = 150;
        
        var i1 = outInf / 100, i2 = inInf / 100;
        var s1 = outSpd, s2 = inSpd;
        var dv = 100;
        
        var p1x = i1, p1y = (s1 * i1) / dv;
        var p2x = 1 - i2, p2y = 1 - (s2 * i2) / dv;

        var rawPoints = [];
        var peakSpeed = 1;
        for (var s = 0; s <= steps; s++) {
            var t = s / steps;
            var dxdt = 3 * (1-t) * (1-t) * p1x + 6 * (1-t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
            var dydt = 3 * (1-t) * (1-t) * p1y + 6 * (1-t) * t * (p2y - p1y) + 3 * t * t * (1 - p2y);
            var vel = (dxdt < 0.001) ? (t < 0.5 ? s1 : s2) : (dydt / dxdt) * dv;
            var xPos = 3 * (1-t) * (1-t) * t * p1x + 3 * (1-t) * t * t * p2x + t * t * t;
            rawPoints.push({ t: t, vel: vel, x: xPos });
            if (Math.abs(vel) > peakSpeed) peakSpeed = Math.abs(vel);
        }

        var baseLine = h - padY;
        var maxSpeed = peakSpeed * 1.05;
        function getY(speed) { return baseLine - (Math.abs(speed) / maxSpeed) * graphH; }

        var points = [];
        for (var j = 0; j < rawPoints.length; j++) {
            var rp = rawPoints[j];
            points.push({ x: padX + rp.x * graphW, y: getY(rp.vel) });
        }

        points.sort(function(a, b) { return a.x - b.x; });

        cx.beginPath();
        cx.moveTo(points[0].x, baseLine);
        cx.lineTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length - 2; i++) {
            var xc = (points[i].x + points[i + 1].x) / 2;
            var yc = (points[i].y + points[i + 1].y) / 2;
            cx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        if (points.length > 2) {
            cx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
        }
        cx.lineTo(points[points.length - 1].x, baseLine);
        cx.closePath();
        cx.fillStyle = hexToRgba(accent, 0.1);
        cx.fill();

        cx.beginPath();
        cx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length - 2; i++) {
            var xc = (points[i].x + points[i + 1].x) / 2;
            var yc = (points[i].y + points[i + 1].y) / 2;
            cx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        if (points.length > 2) {
            cx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
        }
        cx.strokeStyle = accent;
        cx.lineWidth = isFull ? 3 : 2; 
        cx.lineCap = 'round';
        cx.lineJoin = 'round';
        cx.stroke();
        
        if (isFull) {
            var clrHandle = getCSSVar('--graph-handle') || '#ffffff';

            cx.strokeStyle = clrHandle;
            cx.lineWidth = 4;
            cx.lineCap = 'round';
            cx.beginPath();
            cx.moveTo(padX, startY); cx.lineTo(cp1X, cp1Y);
            cx.moveTo(w - padX, endY); cx.lineTo(cp2X, cp2Y);
            cx.stroke();

            cx.fillStyle = accent;
            cx.fillRect(padX - 4, startY - 4, 8, 8);
            cx.fillRect(w - padX - 4, endY - 4, 8, 8);

            cx.fillStyle = accent;
            cx.shadowBlur = 4;
            cx.shadowColor = 'rgba(0,0,0,0.3)';
            cx.beginPath(); cx.arc(cp1X, cp1Y, 12, 0, Math.PI * 2); cx.fill();
            cx.beginPath(); cx.arc(cp2X, cp2Y, 12, 0, Math.PI * 2); cx.fill();
            cx.shadowBlur = 0;

            cx.strokeStyle = 'rgba(0,0,0,0.1)';
            cx.lineWidth = 1;
            cx.beginPath(); cx.arc(cp1X, cp1Y, 12, 0, Math.PI * 2); cx.stroke();
            cx.beginPath(); cx.arc(cp2X, cp2Y, 12, 0, Math.PI * 2); cx.stroke();
        }
    }

    function getSpeedPos(inInf, inSpd, outInf, outSpd, w, h) {
        var padX = 15;
        var padY = 15;
        var graphW = w - padX * 2;
        var graphH = h - padY * 2;
        var maxSpeed = 1;
        var dv = 100;
        var i1 = outInf / 100, i2 = inInf / 100;
        var p1x = i1, p1y = (outSpd * i1) / dv;
        var p2x = 1 - i2, p2y = 1 - (inSpd * i2) / dv;
        for (var s = 0; s <= 50; s++) {
            var t = s / 50;
            var dxdt = 3*(1-t)*(1-t)*p1x + 6*(1-t)*t*(p2x-p1x) + 3*t*t*(1-p2x);
            var dydt = 3*(1-t)*(1-t)*p1y + 6*(1-t)*t*(p2y-p1y) + 3*t*t*(1-p2y);
            var vel = (dxdt < 0.001) ? (t < 0.5 ? outSpd : inSpd) : (dydt / dxdt) * dv;
            if (Math.abs(vel) > maxSpeed) maxSpeed = Math.abs(vel);
        }
        maxSpeed *= 1.15;
        function getY(speed) { return (h - padY) - (Math.abs(speed) / maxSpeed) * graphH; }
        
        return {
            cp1X: padX + graphW * (outInf / 100) * 0.5, cp1Y: getY(outSpd),
            cp2X: (w - padX) - graphW * (inInf / 100) * 0.5, cp2Y: getY(inSpd),
            maxSpeed: maxSpeed, padX: padX, padY: padY, graphW: graphW, graphH: graphH
        };
    }

    function onSpeedMouseDown(e) {
        if (!speedCanvas) return;
        e.preventDefault();
        if (typeof e.pointerId === 'number' && speedCanvas.setPointerCapture) {
            speedPointerId = e.pointerId;
            try { speedCanvas.setPointerCapture(e.pointerId); } catch (err) {}
        }
        var rect = speedCanvas.getBoundingClientRect();
        var scaleX = speedCanvas.width / rect.width;
        var scaleY = speedCanvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;
        
        var inSpd = parseFloat(document.getElementById('input-vel-in-speed').value) || 0;
        var inInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-in-infl').value) || 33));
        var outSpd = parseFloat(document.getElementById('input-vel-out-speed').value) || 0;
        var outInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-out-infl').value) || 33));
        
        var pos = getSpeedPos(inInf, inSpd, outInf, outSpd, speedCanvas.width, speedCanvas.height);
        var dist1 = Math.hypot(mx - pos.cp1X, my - pos.cp1Y);
        var dist2 = Math.hypot(mx - pos.cp2X, my - pos.cp2Y);

        if (dist1 < 35 || dist2 < 35) {
            if (dist1 <= dist2) isDraggingSpeed = 'cp1';
            else isDraggingSpeed = 'cp2';
        }
    }

    function onSpeedMouseMove(e) {
        if (!isDraggingSpeed && e.target !== speedCanvas) return;
        if (!speedCanvas) return;
        var rect = speedCanvas.getBoundingClientRect();
        var scaleX = speedCanvas.width / rect.width;
        var scaleY = speedCanvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;
        
        var inSpd = parseFloat(document.getElementById('input-vel-in-speed').value) || 0;
        var inInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-in-infl').value) || 33));
        var outSpd = parseFloat(document.getElementById('input-vel-out-speed').value) || 0;
        var outInf = Math.min(100, Math.max(0.1, parseFloat(document.getElementById('input-vel-out-infl').value) || 33));
        
        var pos = getSpeedPos(inInf, inSpd, outInf, outSpd, speedCanvas.width, speedCanvas.height);

        if (!isDraggingSpeed) {
            if (e.target !== speedCanvas) return;
            var d1 = Math.hypot(mx - pos.cp1X, my - pos.cp1Y);
            var d2 = Math.hypot(mx - pos.cp2X, my - pos.cp2Y);
            speedCanvas.style.cursor = (d1 < 35 || d2 < 35) ? 'pointer' : 'default';
            return;
        }

        speedCanvas.style.cursor = 'grabbing';
        
        if (isDraggingSpeed === 'cp1') {
            var newOutInf = ((mx - pos.padX) / pos.graphW) * 200;
            if (isVelSnapEnabled) newOutInf = Math.round(newOutInf / 5) * 5;
            newOutInf = Math.max(0.1, Math.min(100, newOutInf));
            document.getElementById('input-vel-out-infl').value = Math.round(newOutInf);
        } else {
            var newInInf = ((speedCanvas.width - pos.padX - mx) / pos.graphW) * 200;
            if (isVelSnapEnabled) newInInf = Math.round(newInInf / 5) * 5;
            newInInf = Math.max(0.1, Math.min(100, newInInf));
            document.getElementById('input-vel-in-infl').value = Math.round(newInInf);
        }

        if (isVelAutoEnabled) {
            clearTimeout(autoApplyTimer);
            autoApplyTimer = setTimeout(applyVelocity, 50);
        }

        saveLastGraphValues();
        renderSpeedPreview();
    }

    function onSpeedMouseUp() {
        isDraggingSpeed = null;
        if (speedCanvas && speedPointerId !== null && speedCanvas.hasPointerCapture) {
            try { speedCanvas.releasePointerCapture(speedPointerId); } catch (err) {}
        }
        speedPointerId = null;
    }

    function loadVelPresets() {
        if (!window.FileStore) return;
        var data = window.FileStore.get('vel_presets');
        if (data && data.presets) {
            velPresets = data.presets;
        } else {
            velPresets = [
                { name: 'Fast Peak', inSpd: 0, inInf: 80, outSpd: 0, outInf: 80 },
                { name: 'Ease In', inSpd: 0, inInf: 100, outSpd: 0, outInf: 33 },
                { name: 'Ease Out', inSpd: 0, inInf: 33, outSpd: 0, outInf: 100 }
            ];
        }
        refreshVelPresets();
    }

    function saveVelPreset() {
        if (!window.ModalModule) return;
        
        window.ModalModule.prompt('Enter a name for this speed preset:', 'P' + (velPresets.length + 1), function (name) {
            if (!name) return;
            
            if (velPresets.length >= 10) velPresets.shift();
            velPresets.push({
                name: name,
                inSpd: parseFloat(document.getElementById('input-vel-in-speed').value) || 0,
                inInf: parseFloat(document.getElementById('input-vel-in-infl').value) || 33,
                outSpd: parseFloat(document.getElementById('input-vel-out-speed').value) || 0,
                outInf: parseFloat(document.getElementById('input-vel-out-infl').value) || 33
            });
            
            if (window.FileStore) {
                window.FileStore.set('vel_presets', { presets: velPresets });
            }
            refreshVelPresets();
        });
    }

    function refreshVelPresets() {
        var list = document.getElementById('vel-preset-list');
        if (!list) return;
        list.innerHTML = '';
        velPresets.forEach(function (p, idx) {
            var btn = document.createElement('div');
            btn.className = 'preset-item';
            btn.title = p.name;
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.position = 'relative';
            btn.style.padding = '4px';
            
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

            delBtn.onclick = function (e) {
                e.stopPropagation();
                if (window.ModalModule) {
                    window.ModalModule.confirm('Delete preset "' + p.name + '"?', 'Delete', function (confirmed) {
                        if (confirmed) {
                            velPresets.splice(idx, 1);
                            if (window.FileStore) window.FileStore.set('vel_presets', { presets: velPresets });
                            refreshVelPresets();
                        }
                    });
                }
            };
            btn.appendChild(delBtn);

            btn.onmouseover = function () { delBtn.style.opacity = '1'; };
            btn.onmouseout = function () { delBtn.style.opacity = '0'; };
            
            var thumbCvs = document.createElement('canvas');
            thumbCvs.width = 65;
            thumbCvs.height = 40;
            thumbCvs.style.background = 'var(--graph-bg)';
            thumbCvs.style.border = '1px solid var(--border)';
            thumbCvs.style.borderRadius = '4px';
            btn.appendChild(thumbCvs);
            
            var tcx = thumbCvs.getContext('2d');
            drawSpeedCurveOnCanvas(tcx, thumbCvs.width, thumbCvs.height, p.inInf, p.inSpd, p.outInf, p.outSpd, false);

            var label = document.createElement('span');
            label.textContent = p.name;
            label.style.fontSize = '8px';
            label.style.marginTop = '4px';
            label.style.color = 'var(--text-mut)';
            label.style.fontWeight = 'bold';
            btn.appendChild(label);

            btn.onclick = function () { applyVelPreset(p); };
            
            list.appendChild(btn);
        });
    }

    function applyVelPreset(p) {
        document.getElementById('input-vel-in-speed').value = p.inSpd;
        document.getElementById('input-vel-in-infl').value = p.inInf;
        document.getElementById('input-vel-out-speed').value = p.outSpd;
        document.getElementById('input-vel-out-infl').value = p.outInf;
        renderSpeedPreview();
        applyVelocity();
    }

    function applyVelocity() {
        var cs = new CSInterface();
        var data = {
            inSpeed: document.getElementById('input-vel-in-speed').value,
            inInflu: document.getElementById('input-vel-in-infl').value,
            outSpeed: document.getElementById('input-vel-out-speed').value,
            outInflu: document.getElementById('input-vel-out-infl').value
        };
        cs.evalScript('FishTools.applyVelocity(\'' + JSON.stringify(data) + '\')', function (res) {
            if (res !== "true" && window.ModalModule) {
                var message = "Failed to apply velocity.";
                try {
                    var response = JSON.parse(res || '{}');
                    if (response.error) message = response.error;
                } catch (e) {}
                window.ModalModule.error(message, "Speed Graph");
            }
        });
    }

    function loadLastGraphValues() {
        if (!window.FileStore) return;
        var graphData = window.FileStore.get('last_graph_values');
        if (graphData) {
            if (graphData.cp1) cp1 = graphData.cp1;
            if (graphData.cp2) cp2 = graphData.cp2;
        }
        var velData = window.FileStore.get('last_vel_values');
        if (velData) {
            var elInSpeed = document.getElementById('input-vel-in-speed');
            var elInInfl = document.getElementById('input-vel-in-infl');
            var elOutSpeed = document.getElementById('input-vel-out-speed');
            var elOutInfl = document.getElementById('input-vel-out-infl');
            if (elInSpeed && velData.inSpeed !== undefined) elInSpeed.value = velData.inSpeed;
            if (elInInfl && velData.inInfl !== undefined) elInInfl.value = velData.inInfl;
            if (elOutSpeed && velData.outSpeed !== undefined) elOutSpeed.value = velData.outSpeed;
            if (elOutInfl && velData.outInfl !== undefined) elOutInfl.value = velData.outInfl;
        }
    }

    function saveLastGraphValues() {
        if (!window.FileStore) return;
        window.FileStore.set('last_graph_values', { cp1: cp1, cp2: cp2 });
        var elInSpeed = document.getElementById('input-vel-in-speed');
        var elInInfl = document.getElementById('input-vel-in-infl');
        var elOutSpeed = document.getElementById('input-vel-out-speed');
        var elOutInfl = document.getElementById('input-vel-out-infl');
        window.FileStore.set('last_vel_values', {
            inSpeed: elInSpeed ? elInSpeed.value : 0,
            inInfl: elInInfl ? elInInfl.value : 33,
            outSpeed: elOutSpeed ? elOutSpeed.value : 0,
            outInfl: elOutInfl ? elOutInfl.value : 33
        });
    }

    return {
        init: init,
        resize: resize,
        refresh: refresh
    };

})();

window.GraphModule = GraphModule;
