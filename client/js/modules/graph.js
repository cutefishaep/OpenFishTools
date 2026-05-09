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

    var btnSnap, btnOvershoot, btnRead, btnApply, btnSavePreset, presetList, btnAuto;
    var speedCanvas, isDraggingSpeed = null;
    var velPresets = [];
    var isVelSnapEnabled = false, isVelAutoEnabled = false;
    var btnVelSnap, btnVelAuto;


    function init() {
        canvas = document.getElementById('ease-graph');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        btnSnap = document.getElementById('btn-graph-snap');
        btnOvershoot = document.getElementById('btn-graph-overshoot');
        btnRead = document.getElementById('btn-graph-read');
        btnApply = document.getElementById('btn-graph-apply');
        btnAuto = document.getElementById('btn-graph-auto');
        btnSavePreset = document.getElementById('btn-save-preset');
        presetList = document.getElementById('preset-list');

        // Velocity Controls
        var btnVelRead = document.getElementById('btn-vel-read');
        var btnVelApply = document.getElementById('btn-vel-apply');
        if (btnVelRead) btnVelRead.addEventListener('click', readVelocity);
        if (btnVelApply) btnVelApply.addEventListener('click', applyVelocity);

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onMouseUp);

        // Velocity Controls listeners
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

        window.addEventListener('keydown', function (e) {
            if (e.key === 'Shift') isSnapEnabled = true;
            render();
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === 'Shift') isSnapEnabled = btnSnap.classList.contains('active');
            render();
        });

        // Speed Graph Interactive Setup
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
        render();
    }

    function getCSSVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function resize() {
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
        btnSnap.classList.toggle('active', isSnapEnabled);
    }

    function toggleOvershoot() {
        isOvershootEnabled = !isOvershootEnabled;
        btnOvershoot.classList.toggle('active', isOvershootEnabled);
        resize();
    }

    function toggleAutoApply() {
        isAutoApplyEnabled = !isAutoApplyEnabled;
        btnAuto.classList.toggle('active', isAutoApplyEnabled);
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
        var threshold = 35; // Larger threshold for easier grabbing

        if (dist1 < threshold) {
            isDragging = 'cp1';
        } else if (dist2 < threshold) {
            isDragging = 'cp2';
        }
    }

    function onMouseMove(e) {
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
            context.strokeRect(start.x, end.y, size, size);

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
        // Draw glow/shadow for better visibility
        context.shadowBlur = 4;
        context.shadowColor = 'rgba(0,0,0,0.3)';
        context.beginPath();
        context.arc(x, y, 12, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        
        // Add a stroke for visibility on light themes
        context.strokeStyle = 'rgba(0,0,0,0.1)';
        context.lineWidth = 1;
        context.stroke();
    }

    function readEase() {
        var cs = new CSInterface();
        cs.evalScript('FishTools.readEase()', function (res) {
            try {
                if (!res || res === 'false') return;
                var data = JSON.parse(res);
                if (data.error) {
                    console.warn("Read Ease:", data.error);
                    return;
                }
                cp1 = { x: data.x1, y: data.y1 };
                cp2 = { x: data.x2, y: data.y2 };
                render();
            } catch (e) {
                console.error("FishTools: Parse Ease Error", e);
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
        cs.evalScript("FishTools.applyEase(" + JSON.stringify(args) + ")");
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
                { name: "Ease In", x1: 0.75, y1: 0, x2: 1, y2: 1 },
                { name: "Ease Out", x1: 0, y1: 0, x2: 0.25, y2: 1 }
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
        thumbCanvas.width = 65;
        thumbCanvas.height = 65;
        thumbCanvas.style.background = 'var(--graph-thumb-bg)';
        thumbCanvas.style.border = '1px solid var(--border)';
        thumbCanvas.style.borderRadius = '4px';
        thumbCanvas.style.marginBottom = '6px';

        var tCtx = thumbCanvas.getContext('2d');
        drawGraphOnCanvas(tCtx, 65, 65, { x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, null);

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
        if (!window.csInterface) return;
        window.csInterface.evalScript('_readVelocity()', function (res) {
            try {
                var data = JSON.parse(res);
                if (data.error) return;
                document.getElementById('input-vel-in-speed').value = Math.round(data.inSpeed);
                document.getElementById('input-vel-in-infl').value = Math.round(data.inInflu);
                document.getElementById('input-vel-out-speed').value = Math.round(data.outSpeed);
                document.getElementById('input-vel-out-infl').value = Math.round(data.outInflu);
                renderSpeedPreview();
            } catch (e) { }
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
                cx.strokeStyle = (i === 2 || i === 4) ? clrGridMid : clrGrid;
                var y = padY + (i / 4) * pos.graphH;
                cx.beginPath(); cx.moveTo(padX, y); cx.lineTo(w - padX, y); cx.stroke();
            }
            for (var j = 0; j <= 4; j++) {
                cx.strokeStyle = (j === 0 || j === 4) ? clrGridMid : clrGrid;
                var x = padX + (j / 4) * pos.graphW;
                cx.beginPath(); cx.moveTo(x, padY); cx.lineTo(x, h - padY); cx.stroke();
            }
        }

        // AE Speed Graph Calculation (Exact dy/dx sampling)
        var accent = getCSSVar('--accent') || '#ffb400';
        var points = [];
        var steps = 100; // Increased resolution for "sharpness"
        
        // Influence constraints like AE
        var totalInf = outInf + inInf;
        var i1 = outInf / 100, i2 = inInf / 100;
        if (totalInf > 100) {
            i1 *= (100 / totalInf);
            i2 *= (100 / totalInf);
        }
        var s1 = outSpd, s2 = inSpd;
        var dv = 100;
        
        // AE uses a specific internal factor for handle lengths
        var p1x = i1, p1y = (s1 * i1) / dv;
        var p2x = 1 - i2, p2y = 1 - (s2 * i2) / dv;

        for (var s = 0; s <= steps; s++) {
            var t = s / steps;
            var dxdt = 3 * Math.pow(1-t, 2) * (p1x) + 6 * (1-t) * t * (p2x - p1x) + 3 * Math.pow(t, 2) * (1 - p2x);
            var dydt = 3 * Math.pow(1-t, 2) * (p1y) + 6 * (1-t) * t * (p2y - p1y) + 3 * Math.pow(t, 2) * (1 - p2y);
            
            var vel = (dxdt < 0.001) ? (t < 0.5 ? s1 : s2) : (dydt / dxdt) * dv;
            var xPos = (3 * Math.pow(1-t, 2) * t * p1x + 3 * (1-t) * Math.pow(t, 2) * p2x + Math.pow(t, 3));
            
            var y = (h - padY) - (Math.abs(vel) / pos.maxSpeed) * graphH;
            points.push({ x: padX + (xPos * graphW), y: y });
        }

        // Sort points by X just in case
        points.sort(function(a, b) { return a.x - b.x; });

        // Gradient fill removed as per 'no glow' request
        /*
        if (isFull && points.length > 0) {
            var minY = Math.min.apply(Math, points.map(function(p){ return p.y; }));
            var gradient = cx.createLinearGradient(0, minY, 0, h - padY);
            gradient.addColorStop(0, accent + '33'); 
            gradient.addColorStop(1, 'transparent');
            cx.fillStyle = gradient;
            cx.beginPath();
            cx.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < points.length; i++) cx.lineTo(points[i].x, points[i].y);
            cx.lineTo(points[points.length-1].x, h - padY);
            cx.lineTo(points[0].x, h - padY);
            cx.closePath();
            cx.fill();
        }
        */

        // Draw the curve
        cx.beginPath();
        cx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++) {
            cx.lineTo(points[i].x, points[i].y);
        }
        cx.strokeStyle = accent;
        cx.lineWidth = isFull ? 4 : 2; 
        cx.lineCap = 'round';
        cx.lineJoin = 'round';
        cx.stroke();
        
        if (isFull) {
            cx.beginPath();
            cx.moveTo(padX, startY); cx.lineTo(cp1X, cp1Y);
            cx.moveTo(w - padX, endY); cx.lineTo(cp2X, cp2Y);
            var clrDim = getCSSVar('--text-mut') || 'rgba(255,255,255,0.2)';
            cx.strokeStyle = clrDim;
            cx.lineWidth = 1.5;
            cx.setLineDash([2, 2]); // Dotted handle lines like AE
            cx.stroke();
            cx.setLineDash([]);

            cx.fillStyle = accent;
            // Keyframes are smaller squares (AE style)
            cx.fillRect(padX - 4, startY - 4, 8, 8);
            cx.fillRect(w - padX - 4, endY - 4, 8, 8);
            
            var clrHandle = getCSSVar('--graph-handle') || '#ffffff';
            cx.fillStyle = clrHandle;
            
            // Interaction Handles (Dots)
            cx.beginPath(); cx.arc(cp1X, cp1Y, 11, 0, Math.PI*2); cx.fill();
            cx.beginPath(); cx.arc(cp2X, cp2Y, 11, 0, Math.PI*2); cx.fill();

            cx.strokeStyle = 'rgba(0,0,0,0.2)';
            cx.lineWidth = 1;
            cx.stroke();
        }
    }

    // Interactive Speed Graph Dragging
    function getSpeedPos(inInf, inSpd, outInf, outSpd, w, h) {
        var padX = 15;
        var padY = 15;
        var graphW = w - padX * 2;
        var graphH = h - padY * 2;
        // Support higher speeds for dragging (up to 500)
        var maxSpeed = Math.max(Math.abs(inSpd), Math.abs(outSpd), 500);
        function getY(speed) { return (h - padY) - (Math.abs(speed) / maxSpeed) * graphH; }
        
        // VISUAL MAPPING FIX:
        // Left handle = Keyframe 1 Outgoing (outInf, outSpd)
        // Right handle = Keyframe 2 Incoming (inInf, inSpd)
        return {
            cp1X: padX + graphW * (outInf / 100), cp1Y: getY(outSpd),
            cp2X: (w - padX) - graphW * (inInf / 100), cp2Y: getY(inSpd),
            maxSpeed: maxSpeed, padX: padX, padY: padY, graphW: graphW, graphH: graphH
        };
    }

    function onSpeedMouseDown(e) {
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

        // Pick the closest handle (Simulated Z-axis/Priority logic)
        if (dist1 < 35 || dist2 < 35) {
            if (dist1 <= dist2) isDraggingSpeed = 'cp1';
            else isDraggingSpeed = 'cp2';
        }
    }

    function onSpeedMouseMove(e) {
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
            // Dragging left handle (X-axis ONLY: outInf)
            var newOutInf = ((mx - pos.padX) / pos.graphW) * 100;
            if (isVelSnapEnabled) newOutInf = Math.round(newOutInf / 5) * 5;
            newOutInf = Math.max(0.1, Math.min(100 - inInf, newOutInf));
            document.getElementById('input-vel-out-infl').value = Math.round(newOutInf);
        } else {
            // Dragging right handle (X-axis ONLY: inInf)
            var newInInf = ((speedCanvas.width - pos.padX - mx) / pos.graphW) * 100;
            if (isVelSnapEnabled) newInInf = Math.round(newInInf / 5) * 5;
            newInInf = Math.max(0.1, Math.min(100 - outInf, newInInf));
            document.getElementById('input-vel-in-infl').value = Math.round(newInInf);
        }

        if (isVelAutoEnabled) {
            clearTimeout(autoApplyTimer);
            autoApplyTimer = setTimeout(applyVelocity, 50);
        }

        renderSpeedPreview();
    }

    function onSpeedMouseUp() {
        isDraggingSpeed = null;
    }

    // Velocity Presets Logic
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
            
            if (velPresets.length >= 10) velPresets.shift(); // Max 10
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
            
            // Delete Button (x)
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
        if (!window.csInterface) return;
        var data = {
            inSpeed: document.getElementById('input-vel-in-speed').value,
            inInflu: document.getElementById('input-vel-in-infl').value,
            outSpeed: document.getElementById('input-vel-out-speed').value,
            outInflu: document.getElementById('input-vel-out-infl').value
        };
        // MUST wrap JSON in single quotes for ExtendScript to receive it as a string
        window.csInterface.evalScript('_applyVelocity(\'' + JSON.stringify(data) + '\')', function (res) {
            if (res !== "true" && window.ModalModule) {
                window.ModalModule.error("Failed to apply velocity.", "Speed Graph");
            }
        });
    }

    return {
        init: init,
        resize: resize,
        refresh: refresh
    };

})();

window.GraphModule = GraphModule;
