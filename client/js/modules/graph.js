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

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onMouseUp);

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

        loadPresets();
        render();
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
    }

    function toggleSnap() {
        isSnapEnabled = !isSnapEnabled;
        btnSnap.classList.toggle('active', isSnapEnabled);
        if (isSnapEnabled) {
            btnSnap.style.background = '#ffb400';
            btnSnap.style.color = '#000';
        } else {
            btnSnap.style.background = '';
            btnSnap.style.color = '';
        }
    }

    function toggleOvershoot() {
        isOvershootEnabled = !isOvershootEnabled;
        btnOvershoot.classList.toggle('active', isOvershootEnabled);
        if (isOvershootEnabled) {
            btnOvershoot.style.background = '#ffb400';
            btnOvershoot.style.color = '#000';
        } else {
            btnOvershoot.style.background = '';
            btnOvershoot.style.color = '';
        }
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
        var threshold = 20;

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
        context.clearRect(0, 0, w, h);

        var layout = getLayout();
        if (w !== width) {
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
        if (w === width) {
            var steps = 10;
            for (var i = 1; i < steps; i++) {
                var pos = i / steps;
                var cx = Math.round(offsetX + pos * size) + 0.5;
                var cy = Math.round(offsetY + (1 - pos) * size) + 0.5;

                context.strokeStyle = (i === 5) ? 'rgba(255, 180, 0, 0.15)' : 'rgba(255, 180, 0, 0.06)';
                context.beginPath();

                context.moveTo(cx, offsetY);
                context.lineTo(cx, offsetY + size);
                context.moveTo(offsetX, cy);
                context.lineTo(offsetX + size, cy);
                context.stroke();
            }

            context.strokeStyle = 'rgba(255, 180, 0, 0.4)';
            context.strokeRect(start.x, end.y, size, size);

            context.strokeStyle = 'rgba(255, 180, 0, 0.2)';
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            context.beginPath();
            context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
            context.stroke();
            context.setLineDash([]);
            context.lineWidth = 1;
        } else {
            context.strokeStyle = '#333';
            context.strokeRect(offsetX, offsetY, size, size);
        }

        context.strokeStyle = '#ffb400';
        context.lineWidth = (w === width) ? 6 : 3;
        context.beginPath();
        context.moveTo(start.x, start.y);

        var s1 = toScreen(p1.x, p1.y);
        var s2 = toScreen(p2.x, p2.y);

        context.bezierCurveTo(s1.x, s1.y, s2.x, s2.y, end.x, end.y);
        context.stroke();

        if (w === width) {
            context.strokeStyle = '#fff';
            context.lineWidth = 4;

            context.beginPath();
            context.moveTo(start.x, start.y); context.lineTo(s1.x, s1.y);
            context.stroke();

            context.beginPath();
            context.moveTo(end.x, end.y); context.lineTo(s2.x, s2.y);
            context.stroke();

            drawPoint(context, s1.x, s1.y, draggingState === 'cp1' ? '#fff' : '#ffb400');
            drawPoint(context, s2.x, s2.y, draggingState === 'cp2' ? '#fff' : '#ffb400');
        }
    }

    function drawPoint(context, x, y, color) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 9, 0, Math.PI * 2);
        context.fill();
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
        if (!window.settings) return;

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
        thumbCanvas.style.background = '#0e0e0e';
        thumbCanvas.style.border = '1px solid #333';
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

    return {
        init: init,
        resize: resize
    };

})();

window.GraphModule = GraphModule;
