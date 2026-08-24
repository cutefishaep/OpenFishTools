'use strict';

(function () {
    var ControllerModule = {};
    var C = {
        cs: null, data: null, card: null, timer: null, action: null, writeQueue: {}, writeTimer: null, refreshTimer: null, readToken: 0,
        linked: true, rotationAxis: 'Z', offsetZ: 0, offsetW: 0, offsetH: 0,
        rotValue: null,
        hovered: { move: false, rotate: false, scale: false, opacity: false },
        pendingLeave: null
    };

    function point(e) {
        var touch = e.touches && e.touches.length ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null);
        return { x: Number(touch ? touch.clientX : e.clientX), y: Number(touch ? touch.clientY : e.clientY) };
    }
    function finite(value, fallback) { return isFinite(Number(value)) ? Number(value) : Number(fallback || 0); }
    function el(id) { return document.getElementById(id); }
    function put(id, value) { var node = el(id); if (node) node.textContent = value; }
    function num(value, digits) { return Number(value || 0).toFixed(digits || 2); }
    var _rulerState = {};
    var RULER_SPACING = 10;

    function initInfiniteRuler(id, vertical) {
        var ruler = el(id); if (!ruler) return;
        ruler.innerHTML = '';
        _rulerState[id] = { ticks: {}, vertical: vertical };
        updateInfiniteRuler(id, 0);
    }

    function updateInfiniteRuler(id, offset) {
        var ruler = el(id); if (!ruler) return;
        var state = _rulerState[id]; if (!state) return;
        var vertical = state.vertical;
        var size = vertical ? (ruler.clientHeight || 210) : (ruler.clientWidth || 300);
        var half = size / 2;
        var buffer = RULER_SPACING * 6;
        var minI = Math.floor((-half - buffer - offset) / RULER_SPACING);
        var maxI = Math.ceil((half + buffer - offset) / RULER_SPACING);

        var toRemove = [];
        var keys = Object.keys(state.ticks);
        for (var k = 0; k < keys.length; k++) {
            var ki = Number(keys[k]);
            if (ki < minI || ki > maxI) toRemove.push(keys[k]);
        }
        for (var r = 0; r < toRemove.length; r++) {
            var t = state.ticks[toRemove[r]];
            if (t && t.parentNode) t.parentNode.removeChild(t);
            delete state.ticks[toRemove[r]];
        }

        for (var i = minI; i <= maxI; i++) {
            var pos = half + i * RULER_SPACING + offset;
            var tick = state.ticks[i];
            if (!tick) {
                tick = document.createElement('i');
                var mod = ((i % 10) + 10) % 10;
                tick.className = 'controller-ruler-tick ' + (mod === 0 ? 'major' : (mod === 5 ? 'medium' : 'minor'));
                ruler.appendChild(tick);
                state.ticks[i] = tick;
            }
            if (vertical) tick.style.top = pos + 'px';
            else tick.style.left = pos + 'px';
        }
    }

    function syncRulerValues(data) {
        var position = data.position || [0, 0, 0];
        C.offsetZ = finite(position[2], 0) / 1.5;
        if (data.isShape && data.shapeSize) {
            C.offsetW = -(finite(data.shapeSize[0], 100) - 100) / 1.0;
            C.offsetH = -(finite(data.shapeSize[1], 100) - 100) / 1.0;
        } else {
            var scale = data.scale || [100, 100];
            C.offsetW = -(finite(scale[0], 100) - 100) / 0.4;
            C.offsetH = -(finite(scale[1], 100) - 100) / 0.4;
        }
        updateInfiniteRuler('z-ruler', C.offsetZ);
        updateInfiniteRuler('ruler-w', C.offsetW);
        updateInfiniteRuler('ruler-h', C.offsetH);
    }
    function evalScript(script, callback) {
        if (!C.cs) return;
        C.cs.evalScript(script, function (result) {
            if (result && result.indexOf && result.indexOf('"error":true') !== -1) console.warn('Controller:', result);
            if (callback) callback(result);
        });
    }
    function undoLabel() {
        if (!C.action) return 'Controller';
        var k = C.action.kind;
        if (k === 'position') return 'Move Layer';
        if (k === 'anchor') return 'Move Anchor';
        if (k === 'z') return 'Move Z';
        if (k === 'rotate') return 'Rotate';
        if (k === 'w' || k === 'h') return (C.action && C.action.isShape) ? 'Resize Shape' : 'Scale';
        return 'Controller';
    }
    function queueWrite(key, script) {
        C.writeQueue[key] = script;
        if (C.writeFrame) return;
        C.writeFrame = requestAnimationFrame(function () {
            C.writeFrame = null;
            var queue = C.writeQueue; C.writeQueue = {};
            var keys = Object.keys(queue); if (!keys.length) return;
            var body = keys.map(function (k) { return queue[k]; }).join('; ');
            evalScript('(function(){ ' + body + '; })()');
        });
    }
    function flushWrites(done) {
        if (C.writeFrame) { cancelAnimationFrame(C.writeFrame); C.writeFrame = null; }
        var queue = C.writeQueue; C.writeQueue = {};
        var keys = Object.keys(queue);
        if (!keys.length) { if (done) done(); return; }
        var body = keys.map(function (k) { return queue[k]; }).join('; ');
        evalScript('(function(){ ' + body + '; })()', function () { if (done) done(); });
    }
    function beginDragUndo(label) {
        evalScript('FishTools.controllerBeginUndo("' + (label || undoLabel()) + '")');
    }
    function endDragUndo() {
        evalScript('FishTools.controllerEndUndo()');
    }
    function axis(prop, index, value) { var safe = finite(value, 0); var call = prop === 'ADBE Position' ? 'FishTools.controllerSetPositionAxis(' + index + ',' + safe + ')' : 'FishTools.controllerSetAxis("' + prop + '",' + index + ',' + safe + ')'; queueWrite(prop + ':' + index, call); }
    function positionXY(x, y) { var sx = finite(x, 0), sy = finite(y, 0); queueWrite('ADBE Position:XY', 'FishTools.controllerSetPositionXY(' + sx + ',' + sy + ')'); }
    function positionZ(z) { var sz = finite(z, 0); queueWrite('ADBE Position:2', 'FishTools.controllerSetPositionZ(' + sz + ')'); }
    function scalar(prop, value) { var safe = finite(value, 0); queueWrite(prop, 'FishTools.controllerSetValue("' + prop + '",' + safe + ')'); }
    function rotationProperty() { return C.rotationAxis === 'X' ? 'ADBE Rotate X' : C.rotationAxis === 'Y' ? 'ADBE Rotate Y' : 'ADBE Rotate Z'; }
    function rotationValue(data) { return data ? (C.rotationAxis === 'X' ? data.rotationX : C.rotationAxis === 'Y' ? data.rotationY : data.rotationZ) : 0; }
    var blendModes = ['NORMAL', 'DISSOLVE', 'DARKEN', 'MULTIPLY', 'COLOR_BURN', 'LINEAR_BURN', 'DARKER_COLOR', 'LIGHTEN', 'SCREEN', 'COLOR_DODGE', 'LINEAR_DODGE', 'LIGHTER_COLOR', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'VIVID_LIGHT', 'LINEAR_LIGHT', 'PIN_LIGHT', 'HARD_MIX', 'DIFFERENCE', 'EXCLUSION', 'SUBTRACT', 'DIVIDE', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'];
    function blendLabel(name) { return name.replace(/_/g, ' ').toLowerCase().replace(/(^| )\w/g, function (c) { return c.toUpperCase(); }); }
    function setBlend(mode) {
        var list = el('blend-list'); if (!list) return;
        var items = list.querySelectorAll('.controller-blend-item');
        for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-selected', items[i].getAttribute('data-mode') === mode);
    }
    function initBlendModes() {
        var list = el('blend-list'); if (!list) return;
        list.innerHTML = '';
        blendModes.forEach(function (mode) {
            var item = document.createElement('div'); item.className = 'controller-blend-item'; item.setAttribute('data-mode', mode);
            item.innerHTML = '<span>' + blendLabel(mode) + '</span><span class="material-icons">check</span>';
            item.addEventListener('click', function () {
                evalScript('FishTools.controllerSetBlendMode("' + mode + '")', function (result) {
                    if (result === 'true') setBlend(mode);
                    else if (result) put('controller-layer-name', 'Blend mode error: ' + result);
                });
            });
            list.appendChild(item);
        });
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
        if (w <= 0 || h <= 0) return;
        var maxR = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
        var radius = Math.min(maxR, Math.max(0, r || 0));
        ctx.beginPath();
        if (radius <= 0.5) {
            ctx.rect(x, y, w, h);
            return;
        }
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    function renderPreview(override) {
        var canvas = el('controller-preview-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var d = override || C.data;
        if (!d || d.error) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        var compW = d.compWidth || 1920;
        var compH = d.compHeight || 1080;
        var compAR = compW / compH;

        var p = d.position || [compW / 2, compH / 2];
        var s = (d.isShape && d.shapeSize) ? d.shapeSize : (d.scale || [100, 100]);
        var r = (d.rotationAxis === 'Z' || !d.rotationAxis) ? (d.rotationZ || 0) : (d.rotationAxis === 'X' ? d.rotationX : d.rotationY) || 0;
        var op = finite(d.opacity, 100);
        var rd = finite(d.shapeRoundness, 0);

        var container = canvas.parentElement;
        var contW = (container ? container.clientWidth : 340) || 340;
        var contH = (container ? container.clientHeight : 165) || 165;
        var pad = 6;
        var maxW = contW - pad * 2;
        var maxH = contH - pad * 2;

        var drawW = maxW;
        var drawH = maxH;
        if (localStorage.getItem('ft_controller_preview_enabled') === 'false') return;

        var dpr = window.devicePixelRatio || 1;
        var targetCanvasW = Math.round(drawW * dpr);
        var targetCanvasH = Math.round(drawH * dpr);
        if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
            canvas.width = targetCanvasW;
            canvas.height = targetCanvasH;
            canvas.style.width = Math.round(drawW) + 'px';
            canvas.style.height = Math.round(drawH) + 'px';
        }

        // Theme colors
        var style = getComputedStyle(document.documentElement);
        var colorBg = style.getPropertyValue('--surface2').trim() || '#121217';
        var colorBorder = style.getPropertyValue('--border2').trim() || 'rgba(255, 255, 255, 0.15)';
        var colorAccent = style.getPropertyValue('--accent').trim() || '#ffb400';

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, drawW, drawH);

        // 1. Outer Pasteboard Background (Full Canvas Stage)
        ctx.fillStyle = '#0a0a0e';
        ctx.fillRect(0, 0, drawW, drawH);

        // 2. Composition Aspect Ratio Frame (Centered with margins to see out-of-bounds layers)
        var compMargin = 0.74;
        var availW = drawW * compMargin;
        var availH = drawH * compMargin;
        var compFrameW, compFrameH;
        if (availW / availH > compAR) {
            compFrameH = availH;
            compFrameW = compFrameH * compAR;
        } else {
            compFrameW = availW;
            compFrameH = compFrameW / compAR;
        }

        var compFrameX = (drawW - compFrameW) / 2;
        var compFrameY = (drawH - compFrameH) / 2;
        var scaleFactor = compFrameW / compW;

        // Comp Background & Boundary Box
        ctx.fillStyle = colorBg;
        ctx.fillRect(compFrameX, compFrameY, compFrameW, compFrameH);

        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(compFrameX) + 0.5, Math.round(compFrameY) + 0.5, Math.round(compFrameW) - 1, Math.round(compFrameH) - 1);

        // 3. Grid matrix matching Value Graph style (if grid is enabled)
        var isGridEnabled = localStorage.getItem('ft_controller_grid_enabled') !== 'false';
        if (isGridEnabled) {
            var steps = 10;
            var clrGrid = 'rgba(255, 255, 255, 0.08)';
            var clrGridMid = 'rgba(255, 255, 255, 0.3)';

            ctx.save();
            for (var i = 1; i < steps; i++) {
                var isCenter = (i === 5);
                ctx.strokeStyle = isCenter ? clrGridMid : clrGrid;
                ctx.lineWidth = isCenter ? 1.2 : 1;
                ctx.setLineDash(isCenter ? [4, 4] : []);

                var gx = Math.round(compFrameX + compFrameW * (i / steps)) + 0.5;
                var gy = Math.round(compFrameY + compFrameH * (i / steps)) + 0.5;

                ctx.beginPath();
                ctx.moveTo(gx, compFrameY); ctx.lineTo(gx, compFrameY + compFrameH);
                ctx.moveTo(compFrameX, gy); ctx.lineTo(compFrameX + compFrameW, gy);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (!d || !d.layerName || d.error || (!C.isHovered && !C.action)) {
            ctx.restore();
            return;
        }

        var layersToDraw = (d.layers && d.layers.length > 0) ? d.layers : [d];

        // Draw each layer (multi-layer support with 3D projection)
        layersToDraw.forEach(function (ld, lIndex) {
            var isPrimary = (lIndex === 0);
            var is3D = !!ld.is3D;
            var p = ld.position || [compW / 2, compH / 2, 0];
            var posX = isFinite(p[0]) ? p[0] : compW / 2;
            var posY = isFinite(p[1]) ? p[1] : compH / 2;
            var posZ = (is3D && isFinite(p[2])) ? p[2] : 0;

            var orient = (is3D && ld.orientation && Array.isArray(ld.orientation)) ? ld.orientation : [0, 0, 0];
            var rotX = is3D ? (finite(ld.rotationX, 0) + finite(orient[0], 0)) : 0;
            var rotY = is3D ? (finite(ld.rotationY, 0) + finite(orient[1], 0)) : 0;
            var rotZ = finite(ld.rotationZ, 0) + (is3D ? finite(orient[2], 0) : 0);
            if (!is3D) {
                rotZ = (ld.rotationAxis === 'Z' || !ld.rotationAxis) ? (ld.rotationZ || 0) : (ld.rotationAxis === 'X' ? ld.rotationX : ld.rotationY) || 0;
            }

            var radX = -rotX * Math.PI / 180;
            var radY = -rotY * Math.PI / 180;
            var radZ = rotZ * Math.PI / 180;

            var scaleX = (ld.scale && isFinite(ld.scale[0]) ? ld.scale[0] : 100) / 100;
            var scaleY = (ld.scale && isFinite(ld.scale[1]) ? ld.scale[1] : 100) / 100;

            var compCenterX = compW / 2;
            var compCenterY = compH / 2;
            var cameraDist = compW * 1.3888;

            function project3D(lx, ly) {
                var x0 = lx * scaleX;
                var y0 = ly * scaleY;
                var z0 = 0;

                var cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);
                var x1 = x0 * cosZ - y0 * sinZ;
                var y1 = x0 * sinZ + y0 * cosZ;
                var z1 = z0;

                var cosY = Math.cos(radY), sinY = Math.sin(radY);
                var x2 = x1 * cosY - z1 * sinY;
                var y2 = y1;
                var z2 = x1 * sinY + z1 * cosY;

                var cosX = Math.cos(radX), sinX = Math.sin(radX);
                var x3 = x2;
                var y3 = y2 * cosX + z2 * sinX;
                var z3 = -y2 * sinX + z2 * cosX;

                var worldX = posX + x3;
                var worldY = posY + y3;
                var worldZ = posZ + z3;

                var pers = is3D ? (cameraDist / Math.max(10, cameraDist + worldZ)) : 1;
                var compPx = compCenterX + (worldX - compCenterX) * pers;
                var compPy = compCenterY + (worldY - compCenterY) * pers;

                return {
                    x: compFrameX + compPx * scaleFactor,
                    y: compFrameY + compPy * scaleFactor,
                    z: worldZ
                };
            }

            var sRect = ld.sourceRect;
            if (!sRect || !isFinite(sRect.width) || sRect.width <= 0) {
                var defW = (ld.isShape && ld.shapeSize) ? ld.shapeSize[0] : (ld.layerWidth || 100);
                var defH = (ld.isShape && ld.shapeSize) ? ld.shapeSize[1] : (ld.layerHeight || 100);
                sRect = {
                    left: ld.isShape ? -defW / 2 : 0,
                    top: ld.isShape ? -defH / 2 : 0,
                    width: defW,
                    height: defH
                };
            }

            var anc = (ld.anchor && isFinite(ld.anchor[0])) ? ld.anchor : [sRect.left + sRect.width / 2, sRect.top + sRect.height / 2];

            var boxLeft = sRect.left;
            var boxTop = sRect.top;
            var boxWidth = sRect.width;
            var boxHeight = sRect.height;

            if (ld.isShape && ld.shapeSize && isFinite(ld.shapeSize[0]) && isFinite(ld.shapeSize[1])) {
                var newW = ld.shapeSize[0];
                var newH = ld.shapeSize[1];
                var cX = sRect.left + sRect.width / 2;
                var cY = sRect.top + sRect.height / 2;
                boxLeft = cX - newW / 2;
                boxTop = cY - newH / 2;
                boxWidth = newW;
                boxHeight = newH;
            }

            var lx1 = boxLeft - anc[0];
            var ly1 = boxTop - anc[1];
            var lx2 = boxLeft + boxWidth - anc[0];
            var ly2 = boxTop + boxHeight - anc[1];

            var pTL = project3D(lx1, ly1);
            var pTR = project3D(lx2, ly1);
            var pBR = project3D(lx2, ly2);
            var pBL = project3D(lx1, ly2);
            var pAnc = project3D(0, 0);

            var rd = finite(ld.shapeRoundness, 0);
            var rRad = (ld.isShape && rd > 0) ? Math.min((lx2 - lx1) / 2, (ly2 - ly1) / 2, rd) : 0;
            var op = finite(ld.opacity, 100);

            ctx.beginPath();
            if (rRad <= 0.5) {
                ctx.moveTo(pTL.x, pTL.y);
                ctx.lineTo(pTR.x, pTR.y);
                ctx.lineTo(pBR.x, pBR.y);
                ctx.lineTo(pBL.x, pBL.y);
                ctx.closePath();
            } else {
                var arcSteps = 6;
                var first = true;
                function addArc(acx, acy, startAngle, endAngle) {
                    for (var s = 0; s <= arcSteps; s++) {
                        var a = startAngle + (endAngle - startAngle) * (s / arcSteps);
                        var px = acx + rRad * Math.cos(a);
                        var py = acy + rRad * Math.sin(a);
                        var proj = project3D(px, py);
                        if (first) { ctx.moveTo(proj.x, proj.y); first = false; }
                        else { ctx.lineTo(proj.x, proj.y); }
                    }
                }
                addArc(lx2 - rRad, ly1 + rRad, -Math.PI / 2, 0);
                addArc(lx2 - rRad, ly2 - rRad, 0, Math.PI / 2);
                addArc(lx1 + rRad, ly2 - rRad, Math.PI / 2, Math.PI);
                addArc(lx1 + rRad, ly1 + rRad, Math.PI, Math.PI * 1.5);
                ctx.closePath();
            }

            var strokeColor = ld.isShape ? colorAccent : (isPrimary ? '#00b4ff' : '#00d4aa');
            ctx.fillStyle = strokeColor;
            ctx.globalAlpha = Math.max(0.12, (op / 100) * (isPrimary ? 0.28 : 0.18));
            ctx.fill();

            ctx.globalAlpha = Math.max(0.3, op / 100);
            ctx.lineWidth = isPrimary ? 1.6 : 1.2;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();

            // Anchor point (+)
            ctx.save();
            ctx.translate(pAnc.x, pAnc.y);
            ctx.rotate(radZ);
            ctx.strokeStyle = '#ff3344';
            ctx.fillStyle = '#ff3344';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
            ctx.moveTo(0, -5); ctx.lineTo(0, 5);
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore();
    }

    function resetDisplays() {
        put('val-pos-x', '0.00'); put('val-pos-y', '0.00'); put('val-pos-z', '0.00'); put('val-rot', '0°');
        put('rot-multiplier', ''); put('val-scale-w', '100.0'); put('val-scale-h', '100.0'); put('val-opacity', '100%');
        setBlend('NORMAL');
        renderPreview(null);
        if (el('opacity-slider')) {
            el('opacity-slider').value = 100;
            el('opacity-slider').style.background = 'linear-gradient(to right,var(--accent) 100%,var(--surface2) 100%)';
        }
        if (el('shape-roundness-bar')) el('shape-roundness-bar').style.display = 'none';
        put('val-shape-roundness', '0 px');
        if (el('shape-roundness-slider')) {
            el('shape-roundness-slider').value = 0;
            el('shape-roundness-slider').style.background = 'linear-gradient(to right,var(--accent) 0%,var(--surface2) 0%)';
        }
        if (el('dial-knob')) { el('dial-knob').style.left = '173px'; el('dial-knob').style.top = '88px'; }
        if (el('dial-trail-path')) el('dial-trail-path').setAttribute('d', '');
        if (el('dial-trail-overlay-path')) el('dial-trail-overlay-path').setAttribute('d', '');
        if (el('z-wheel')) { el('z-wheel').style.display = 'none'; }
        document.querySelectorAll('[data-rotation-axis="X"],[data-rotation-axis="Y"]').forEach(function (b) { b.style.display = 'none'; });
    }

    function arc(cx, cy, radius, start, end) {
        if (Math.abs(end - start) < .1) return '';
        var startRad = start * Math.PI / 180;
        var endRad = end * Math.PI / 180;
        var startX = cx + radius * Math.cos(startRad);
        var startY = cy + radius * Math.sin(startRad);
        var endX = cx + radius * Math.cos(endRad);
        var endY = cy + radius * Math.sin(endRad);
        var diff = Math.abs(end - start);
        return 'M ' + startX + ' ' + startY + ' A ' + radius + ' ' + radius + ' 0 ' + (diff > 180 ? 1 : 0) + ' ' + (end >= start ? 1 : 0) + ' ' + endX + ' ' + endY;
    }

    function renderRotation(value) {
        var angle = Number(value || 0); C.rotValue = angle;
        var abs = Math.abs(Math.round(angle)), multi = Math.floor(abs / 360), rem = abs % 360;
        put('rot-multiplier', multi ? (angle >= 0 ? multi : '-' + multi) + 'x' : '');
        put('val-rot', (angle < 0 ? '-' : '') + rem + '°');
        var knob = el('dial-knob'), radians = angle * Math.PI / 180;
        if (knob) { knob.style.left = (100 + 85 * Math.cos(radians) - 12) + 'px'; knob.style.top = (100 + 85 * Math.sin(radians) - 12) + 'px'; }
        var absAngle = Math.abs(angle);
        var direction = angle >= 0 ? 1 : -1;
        var fullCircle = direction * 359.99;
        var baseTrail = '';
        var overlayTrail = '';
        if (absAngle < 360) {
            var firstAngle = absAngle >= 359.9 ? direction * 359.99 : angle;
            baseTrail = arc(100, 100, 85, 0, firstAngle);
        } else if (absAngle < 720) {
            baseTrail = arc(100, 100, 85, 0, fullCircle);
            var remainder = angle % 360;
            if (Math.abs(remainder) >= 359.9) remainder = direction * 359.99;
            if (Math.abs(remainder) >= .5) overlayTrail = arc(100, 100, 85, 0, remainder);
        } else {
            baseTrail = arc(100, 100, 85, 0, fullCircle);
            overlayTrail = arc(100, 100, 85, 0, fullCircle);
        }
        var trailPath = el('dial-trail-path');
        if (trailPath) trailPath.setAttribute('d', baseTrail);
        var overlayPath = el('dial-trail-overlay-path');
        if (overlayPath) overlayPath.setAttribute('d', overlayTrail);
    }

    function readLayer() {
        var token = C.readToken;
        C.cs.evalScript('FishTools.controllerRead()', function (result) {
            try {
                if (token !== C.readToken) return;
                if (!result || result === 'undefined' || result === 'EvalScript error.') {
                    put('controller-layer-name', result === 'EvalScript error.' ? 'AE host script failed to load' : 'Waiting for AE host...');
                    return;
                }
                var d = JSON.parse(result || '{}');
                if (d.error || !d.layerName || d.layerName === 'No Layer') {
                    C.data = null;
                    put('controller-layer-name', d.message || 'No Layer');
                    if (!C.action) {
                        resetDisplays();
                    }
                    return;
                }
                C.data = d;
                if (!C.action) {
                    syncRulerValues(d);
                    put('controller-layer-name', d.layerName || 'Selected layer');

                    if (d.multiSelected) {
                        put('val-pos-x', 'Mixed');
                        put('val-pos-y', 'Mixed');
                        put('val-pos-z', 'Mixed');
                        put('val-rot', 'Mixed');
                        put('rot-multiplier', '');
                        put('val-scale-w', 'Mixed');
                        put('val-scale-h', 'Mixed');
                        put('val-opacity', 'Mixed');
                        renderRotation(0);
                    } else {
                        var p = d.position || [0, 0], s = d.scale || [100, 100];
                        put('val-pos-x', num(p[0]));
                        put('val-pos-y', num(-p[1]));
                        put('val-pos-z', num(p[2] || 0));
                        renderRotation(rotationValue(d) || 0);

                        if (d.isShape && d.shapeSize) {
                            put('val-scale-w', num(d.shapeSize[0], 1));
                            put('val-scale-h', num(d.shapeSize[1], 1));
                            put('label-scale-w', 'Width (px)');
                            put('label-scale-h', 'Height (px)');
                        } else {
                            put('val-scale-w', num(s[0], 1));
                            put('val-scale-h', num(s[1], 1));
                            put('label-scale-w', 'Width');
                            put('label-scale-h', 'Height');
                        }

                        put('val-opacity', Math.round(d.opacity) + '%');
                        var opacitySlider = el('opacity-slider');
                        if (opacitySlider) {
                            opacitySlider.value = finite(d.opacity, 100);
                            opacitySlider.style.background = 'linear-gradient(to right,var(--accent) ' + opacitySlider.value + '%,var(--surface2) ' + opacitySlider.value + '%)';
                        }
                    }
                    setBlend(d.blendMode || 'NORMAL');
                } else {
                    put('controller-layer-name', d.layerName || 'Selected layer');
                }

                if (el('z-wheel')) {
                    var is3D = !!d.is3D;
                    el('z-wheel').style.display = is3D ? 'flex' : 'none';
                }

                var shapeBar = el('shape-roundness-bar');
                if (shapeBar) {
                    var isShape = !!d.isShape;
                    shapeBar.style.display = isShape ? 'flex' : 'none';
                    if (isShape) {
                        var rVal = finite(d.shapeRoundness, 0);
                        var maxR = 250;
                        if (d.shapeSize && d.shapeSize.length >= 2) {
                            maxR = Math.max(50, Math.round(Math.min(d.shapeSize[0], d.shapeSize[1]) / 2));
                        }
                        var rSlider = el('shape-roundness-slider');
                        if (rSlider) {
                            rSlider.max = maxR;
                            rSlider.value = rVal;
                            var pct = Math.min(100, Math.max(0, (rVal / maxR) * 100));
                            rSlider.style.background = 'linear-gradient(to right,var(--accent) ' + pct + '%,var(--surface2) ' + pct + '%)';
                        }
                        put('val-shape-roundness', Math.round(rVal) + ' px');
                    }
                }

                document.querySelectorAll('[data-rotation-axis="X"],[data-rotation-axis="Y"]').forEach(function (b) { b.style.display = d.is3D ? '' : 'none'; });
                if (!d.is3D && C.rotationAxis !== 'Z') {
                    C.rotationAxis = 'Z';
                    document.querySelectorAll('[data-rotation-axis]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-rotation-axis') === 'Z'); });
                }
                renderPreview();
            } catch (e) {
                put('controller-layer-name', 'Host response invalid: ' + String(result || 'empty'));
                console.error('Controller read error:', e, result);
            }
        });
    }

    function deactivateController() {
        var mainCard = el('controller-main-card');
        if (mainCard) mainCard.classList.remove('is-active');
        var placeholder = el('controller-preview-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        var canvas = el('controller-preview-canvas');
        if (canvas) canvas.style.display = 'none';
        if (C.pollInterval) { clearInterval(C.pollInterval); C.pollInterval = null; }
        if (C.refreshTimer) { clearTimeout(C.refreshTimer); C.refreshTimer = null; }
        C.rotValue = null;
        resetDisplays();
    }

    function activateController() {
        C.isHovered = true;
        var mainCard = el('controller-main-card');
        if (mainCard) mainCard.classList.add('is-active');
        var placeholder = el('controller-preview-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        var canvas = el('controller-preview-canvas');
        if (canvas) canvas.style.display = 'block';
        if (C.refreshTimer) clearTimeout(C.refreshTimer);
        readLayer();
        if (!C.pollInterval) {
            C.pollInterval = setInterval(function () {
                if (C.isHovered && !C.action) {
                    readLayer();
                }
            }, 500);
        }
    }

    function onCardEnter() {
        activateController();
    }

    function onCardLeave() {
        C.isHovered = false;
        // Drag Guard: if user is currently controlling a property, DO NOT deactivate until released!
        if (C.action) return;
        deactivateController();
    }

    function startMove(kind, e) {
        if (C.refreshTimer) { clearTimeout(C.refreshTimer); C.refreshTimer = null; }
        if (!C.data || C.data.error || !C.data.layerName || C.data.layerName === 'No Layer') return;
        var p = point(e);
        if (!isFinite(p.x) || !isFinite(p.y)) return;

        var d = C.data;
        var p0 = (d && d.position) ? d.position : [0, 0, 0];
        var dispX = p0[0] || 0;
        var dispY = p0[1] || 0;
        var dispZ = p0[2] || 0;
        var startLayers = (d && d.layers) ? JSON.parse(JSON.stringify(d.layers)) : [];

        C.action = {
            kind: kind,
            startX: p.x,
            startY: p.y,
            startPos: [dispX, dispY, dispZ],
            startLayers: startLayers,
            x: p.x,
            y: p.y,
            value: [dispX, dispY, dispZ],
            offset: 0,
            dirty: false,
            final: [dispX, dispY, dispZ, 0, 0, 0]
        };
        if (e.preventDefault) e.preventDefault();
    }
    function startZ(e) {
        if (C.refreshTimer) { clearTimeout(C.refreshTimer); C.refreshTimer = null; }
        if (!C.data || C.data.error || !C.data.layerName || C.data.layerName === 'No Layer') return;
        C.readToken++;
        readLayer();
        var p = point(e); if (!isFinite(p.x) || !isFinite(p.y)) return;
        var curZ = (C.data && C.data.position) ? finite(C.data.position[2], 0) : 0;
        var startLayers = (C.data && C.data.layers) ? JSON.parse(JSON.stringify(C.data.layers)) : [];
        C.action = { kind: 'z', x: p.x, y: p.y, startY: p.y, value: curZ, startLayers: startLayers, offset: C.offsetZ, dirty: false, final: [curZ, curZ, curZ, 0, 0, 0] };
        if (e.preventDefault) e.preventDefault();
    }
    function startScale(axisName, e) {
        if (C.refreshTimer) { clearTimeout(C.refreshTimer); C.refreshTimer = null; }
        if (!C.data || C.data.error || !C.data.layerName || C.data.layerName === 'No Layer') return;
        C.readToken++;
        readLayer();
        var p = point(e);
        if (!isFinite(p.x) || !isFinite(p.y)) return;

        var d = C.data;
        var isShape = !!(d && d.isShape);
        var curW = (isShape && d.shapeSize) ? d.shapeSize[0] : (d && d.scale ? d.scale[0] : 100);
        var curH = (isShape && d.shapeSize) ? d.shapeSize[1] : (d && d.scale ? d.scale[1] : 100);
        var startLayers = (d && d.layers) ? JSON.parse(JSON.stringify(d.layers)) : [];

        C.action = {
            kind: axisName,
            axis: axisName,
            startX: p.x,
            startY: p.y,
            startW: curW,
            startH: curH,
            startLayers: startLayers,
            isShape: isShape,
            dirty: false,
            final: [curW, curH, 0, 0]
        };
        if (e.preventDefault) e.preventDefault();
    }
    function startRotate(e) {
        if (C.refreshTimer) { clearTimeout(C.refreshTimer); C.refreshTimer = null; }
        if (!C.data || C.data.error || !C.data.layerName || C.data.layerName === 'No Layer') return;
        var p = point(e), rect = el('dial-area').getBoundingClientRect();
        if (!isFinite(p.x) || !isFinite(p.y)) return;

        var d = C.data;
        var curRot = C.rotValue !== null ? C.rotValue : (d ? finite(rotationValue(d), 0) : 0);
        var startLayers = (d && d.layers) ? JSON.parse(JSON.stringify(d.layers)) : [];
        var startAngle = Math.atan2(p.y - (rect.top + rect.height / 2), p.x - (rect.left + rect.width / 2)) * 180 / Math.PI;

        C.action = {
            kind: 'rotate',
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            initialPointerAngle: startAngle,
            angle: startAngle,
            startRot: curRot,
            value: curRot,
            totalDeltaRot: 0,
            startLayers: startLayers,
            dirty: false,
            final: [C.rotationAxis, curRot, 0]
        };
        if (e.preventDefault) e.preventDefault();
    }

    function drag(e) {
        var a = C.action; if (!a) return;
        if (!C.data || C.data.error || !C.data.layerName || C.data.layerName === 'No Layer') return;
        var p = point(e); if (!isFinite(p.x) || !isFinite(p.y)) return; var dx = p.x - a.x, dy = p.y - a.y;
        a.dirty = true;
        if (a.kind === 'position' || a.kind === 'anchor') {
            var speed = 2.0;
            var totalDx = (p.x - a.startX) * speed;
            var totalDy = (p.y - a.startY) * speed;

            var rawX = a.startPos[0] + totalDx;
            var rawY = a.startPos[1] + totalDy;
            var z = a.startPos[2] !== undefined ? Number(a.startPos[2]) : 0;

            var isGridEnabled = localStorage.getItem('ft_controller_grid_enabled') !== 'false';
            var finalX = Math.round(rawX);
            var finalY = Math.round(rawY);

            if (isGridEnabled && a.kind === 'position') {
                var compW = (C.data && C.data.compWidth) ? C.data.compWidth : 1920;
                var compH = (C.data && C.data.compHeight) ? C.data.compHeight : 1080;
                var steps = 10;
                var stepX = compW / steps;
                var stepY = compH / steps;

                var nearestX = Math.round(rawX / stepX) * stepX;
                var nearestY = Math.round(rawY / stepY) * stepY;
                var snapThreshold = 35; // magnetic snap threshold in comp space

                if (Math.abs(rawX - nearestX) < snapThreshold) {
                    finalX = nearestX;
                    totalDx = finalX - a.startPos[0];
                }
                if (Math.abs(rawY - nearestY) < snapThreshold) {
                    finalY = nearestY;
                    totalDy = finalY - a.startPos[1];
                }
            }

            if (C.data && C.data.multiSelected) {
                put('val-pos-x', 'Mixed');
                put('val-pos-y', 'Mixed');
            } else {
                put('val-pos-x', num(finalX));
                put('val-pos-y', num(-finalY));
            }
            a.x = p.x; a.y = p.y;
            a.final = [finalX, finalY, z, totalDx, totalDy, 0];
        } else if (a.kind === 'z') {
            var totalDz = (p.y - a.startY) * 1.5;
            var z = a.value + dy * 1.5;
            if (C.data && C.data.multiSelected) put('val-pos-z', 'Mixed');
            else put('val-pos-z', num(z));
            a.y = p.y; a.value = z; a.offset += dy;
            C.offsetZ = a.offset;
            updateInfiniteRuler('z-ruler', C.offsetZ);
            a.final = [z, z, z, 0, 0, totalDz];
        } else if (a.kind === 'w' || a.kind === 'h') {
            var stepMult = a.isShape ? 1.0 : 0.4;
            var delta = (p.x - a.startX) * stepMult;
            var dW = (a.kind === 'w' || C.linked) ? -delta : 0;
            var dH = (a.kind === 'h' || C.linked) ? -delta : 0;

            var newW = Math.max(1, a.startW + dW);
            var newH = Math.max(1, a.startH + dH);

            if (C.data && C.data.multiSelected) {
                put('val-scale-w', 'Mixed');
                put('val-scale-h', 'Mixed');
            } else {
                put('val-scale-w', num(newW, 1));
                put('val-scale-h', num(newH, 1));
            }

            if (a.kind === 'w') {
                C.offsetW = -delta;
                updateInfiniteRuler('ruler-w', C.offsetW);
            } else {
                C.offsetH = -delta;
                updateInfiniteRuler('ruler-h', C.offsetH);
            }
            a.final = [newW, newH, dW, dH];
        } else if (a.kind === 'rotate') {
            var angle = Math.atan2(p.y - a.cy, p.x - a.cx) * 180 / Math.PI;
            var delta = angle - a.angle;
            if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
            a.value += delta;
            a.totalDeltaRot = (a.totalDeltaRot || 0) + delta;
            a.angle = angle;

            if (C.data && C.data.multiSelected) {
                put('val-rot', 'Mixed');
                put('rot-multiplier', '');
            } else {
                renderRotation(a.value);
            }
            a.final = [C.rotationAxis, a.value, a.totalDeltaRot];
        }

        // Live preview sync for single or multiple layers
        if (C.data) {
            var live = JSON.parse(JSON.stringify(C.data));
            if (live.layers && live.layers.length > 0 && a.startLayers && a.startLayers.length > 0) {
                live.layers = a.startLayers.map(function(sl) {
                    var lc = Object.assign({}, sl);
                    if (a.kind === 'position') {
                        var totalDx = a.final[3] || 0;
                        var totalDy = a.final[4] || 0;
                        lc.position = [(sl.position ? sl.position[0] : 0) + totalDx, (sl.position ? sl.position[1] : 0) + totalDy, sl.position ? sl.position[2] : 0];
                    } else if (a.kind === 'w' || a.kind === 'h') {
                        var dW = a.final[2] || 0;
                        var dH = a.final[3] || 0;
                        if (lc.isShape && lc.shapeSize) {
                            lc.shapeSize = [Math.max(1, lc.shapeSize[0] + dW), Math.max(1, lc.shapeSize[1] + dH)];
                        } else if (lc.scale) {
                            lc.scale = [Math.max(1, lc.scale[0] + dW), Math.max(1, lc.scale[1] + dH)];
                        }
                    } else if (a.kind === 'rotate') {
                        var dRot = a.final[2] || 0;
                        if (C.rotationAxis === 'X') lc.rotationX = (sl.rotationX || 0) + dRot;
                        else if (C.rotationAxis === 'Y') lc.rotationY = (sl.rotationY || 0) + dRot;
                        else lc.rotationZ = (sl.rotationZ || 0) + dRot;
                    }
                    return lc;
                });
            }

            if (a.kind === 'position') {
                live.position = [a.final[0], a.final[1], a.final[2]];
            } else if (a.kind === 'z') {
                var curP = live.position || [0, 0, 0];
                live.position = [curP[0], curP[1], a.final[0]];
            } else if (a.kind === 'w' || a.kind === 'h') {
                if (a.isShape) live.shapeSize = [a.final[0], a.final[1]];
                else live.scale = [a.final[0], a.final[1]];
            } else if (a.kind === 'rotate') {
                live.rotationAxis = a.final[0];
                if (a.final[0] === 'X') live.rotationX = a.final[1];
                else if (a.final[0] === 'Y') live.rotationY = a.final[1];
                else live.rotationZ = a.final[1];
            }
            renderPreview(live);
        }
        if (e.preventDefault) e.preventDefault();
    }

    ControllerModule.init = function () {
        if (C.cs) return;
        C.cs = window.csInterface || new CSInterface();
        initBlendModes();
        initInfiniteRuler('z-ruler', true); initInfiniteRuler('ruler-w', false); initInfiniteRuler('ruler-h', false);
        window.addEventListener('resize', function () { renderPreview(); });
        document.querySelectorAll('[data-rotation-axis]').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.stopPropagation();
                C.rotationAxis = button.getAttribute('data-rotation-axis');
                document.querySelectorAll('[data-rotation-axis]').forEach(function (item) { item.classList.toggle('active', item === button); });
                C.rotValue = null;
                if (C.data) {
                    var val = finite(rotationValue(C.data), 0);
                    renderRotation(val);
                } else {
                    readLayer();
                }
            });
        });
        function switchPanel(name) {
            var panels = ['move', 'rotate', 'scale', 'opacity'];
            if (panels.indexOf(name) === -1) name = 'move';

            document.querySelectorAll('.controller-switch-btn').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-target-panel') === name);
            });

            panels.forEach(function (p) {
                var panelEl = el('card-' + p);
                if (panelEl) {
                    panelEl.style.display = (p === name) ? 'flex' : 'none';
                }
            });

            C.card = name;
            C.hovered.move = C.hovered.rotate = C.hovered.scale = C.hovered.opacity = false;
            C.hovered[name] = true;
            readLayer();
        }

        document.querySelectorAll('.controller-switch-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target = this.getAttribute('data-target-panel');
                switchPanel(target);
            });
        });

        switchPanel('move');
        var bindPointer = function (node, handler) {
            if (!node) return;
            node.addEventListener('mousedown', handler);
            node.addEventListener('touchstart', handler, { passive: false });
        };
        bindPointer(el('move-pad'), function (e) { startMove('position', e); });
        bindPointer(el('z-wheel'), startZ);
        bindPointer(el('dial-area'), startRotate);
        bindPointer(el('wheel-w'), function (e) { startScale('w', e); });
        bindPointer(el('wheel-h'), function (e) { startScale('h', e); });
        if (el('btn-link')) el('btn-link').addEventListener('click', function () { C.linked = !C.linked; el('btn-link').classList.toggle('linked', C.linked); el('btn-link').innerHTML = '<span class="material-icons">' + (C.linked ? 'link' : 'link_off') + '</span>'; el('wheel-h').style.display = C.linked ? 'none' : 'flex'; });
        
        var opSlider = el('opacity-slider');
        if (opSlider) {
            opSlider.addEventListener('input', function (e) {
                var val = Number(e.target.value);
                put('val-opacity', Math.round(val) + '%');
                e.target.style.background = 'linear-gradient(to right,var(--accent) ' + val + '%,var(--surface2) ' + val + '%)';
                if (C.data) {
                    var live = Object.assign({}, C.data);
                    live.opacity = val;
                    renderPreview(live);
                }
            });
            opSlider.addEventListener('change', function (e) {
                evalScript('FishTools.controllerCommit("opacity", [' + Number(e.target.value) + '])', function () {
                    readLayer();
                });
            });
        }
        
        var rSlider = el('shape-roundness-slider');
        if (rSlider) {
            rSlider.addEventListener('input', function (e) {
                var val = Number(e.target.value);
                put('val-shape-roundness', Math.round(val) + ' px');
                var max = Number(e.target.max) || 250;
                var pct = Math.min(100, Math.max(0, (val / max) * 100));
                e.target.style.background = 'linear-gradient(to right,var(--accent) ' + pct + '%,var(--surface2) ' + pct + '%)';
                if (C.data) {
                    var live = Object.assign({}, C.data);
                    live.shapeRoundness = val;
                    renderPreview(live);
                }
            });
            rSlider.addEventListener('change', function (e) {
                evalScript('FishTools.controllerCommit("shaperoundness", [' + Number(e.target.value) + '])', function () {
                    readLayer();
                });
            });
        }
        window.addEventListener('mousemove', drag);
        window.addEventListener('touchmove', drag, { passive: false });
        var endDrag = function () {
            if (!C.action) {
                if (!C.isHovered) deactivateController();
                return;
            }
            var a = C.action;
            C.action = null;
            if (a.dirty && a.final) {
                var actType = a.kind;
                if (actType === 'w' || actType === 'h') actType = a.isShape ? 'shapesize' : 'scale';
                evalScript('FishTools.controllerCommit("' + actType + '", ' + JSON.stringify(a.final) + ')', function () {
                    if (C.isHovered) {
                        readLayer();
                    } else {
                        deactivateController();
                    }
                });
            } else {
                if (!C.isHovered) {
                    deactivateController();
                } else {
                    readLayer();
                }
            }
        };
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
        window.addEventListener('blur', endDrag);

        var mainCard = el('controller-main-card');
        if (mainCard) {
            mainCard.addEventListener('mouseenter', onCardEnter);
            mainCard.addEventListener('mouseleave', onCardLeave);
        }
        initTransportControls();
        deactivateController();
    };
    function initTransportControls() {
        var cs = C.cs;
        if (!cs) return;

        var btnPrev = el('btn-prev-marker');
        var btnPlay = el('btn-play-pause');
        var btnNext = el('btn-next-marker');
        var iconPlay = el('play-pause-icon');
        var isPlaying = false;

        if (btnPrev) {
            btnPrev.addEventListener('click', function () {
                cs.evalScript('FishTools.transportPrevMarker()', function (res) {
                    console.log('[Transport] prev marker result:', res);
                    if (res && res.indexOf && res.indexOf('err') === 0) {
                        put('controller-layer-name', 'Prev marker: ' + res);
                    } else if (!res || res === 'undefined' || (res + '').indexOf('EvalScript error') !== -1) {
                        put('controller-layer-name', 'Prev marker: host not deployed');
                    }
                });
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', function () {
                cs.evalScript('FishTools.transportNextMarker()', function (res) {
                    console.log('[Transport] next marker result:', res);
                    if (res && res.indexOf && res.indexOf('err') === 0) {
                        put('controller-layer-name', 'Next marker: ' + res);
                    } else if (!res || res === 'undefined' || (res + '').indexOf('EvalScript error') !== -1) {
                        put('controller-layer-name', 'Next marker: host not deployed');
                    }
                });
            });
        }

        var togglePlay = function () {
            isPlaying = !isPlaying;
            if (iconPlay) iconPlay.textContent = isPlaying ? 'pause' : 'play_arrow';
            if (btnPlay) btnPlay.classList.toggle('is-playing', isPlaying);
            cs.evalScript('FishTools.transportPlayPause()', function (res) {
                if (res && res.indexOf('err') === 0) {
                    console.warn('[Transport] play error:', res);
                } else if (!res || res === 'undefined') {
                    console.warn('[Transport] FishTools.transportPlayPause not found — redeploy host');
                } else {
                    var playing = res === 'true' || res === true;
                    if (iconPlay) iconPlay.textContent = playing ? 'pause' : 'play_arrow';
                    if (btnPlay) btnPlay.classList.toggle('is-playing', playing);
                }
            });
        };

        if (btnPlay) {
            btnPlay.addEventListener('click', togglePlay);
            btnPlay.addEventListener('touchend', function (e) {
                e.preventDefault();
                togglePlay();
            }, { passive: false });
        }

        var btnToggleGrid = el('btn-toggle-grid');
        var isGridEnabled = localStorage.getItem('ft_controller_grid_enabled') !== 'false';

        function updateGridVisibility() {
            if (btnToggleGrid) btnToggleGrid.classList.toggle('active', isGridEnabled);
        }
        updateGridVisibility();

        if (btnToggleGrid) {
            btnToggleGrid.addEventListener('click', function () {
                isGridEnabled = !isGridEnabled;
                localStorage.setItem('ft_controller_grid_enabled', isGridEnabled ? 'true' : 'false');
                updateGridVisibility();
                if (C.isHovered || C.action) {
                    renderPreview();
                }
            });
        }

        var btnTogglePreview = el('btn-toggle-preview');
        var iconTogglePreview = el('toggle-preview-icon');
        var previewCard = el('controller-preview-card');
        var isPreviewEnabled = localStorage.getItem('ft_controller_preview_enabled') !== 'false';

        function updatePreviewVisibility() {
            if (btnTogglePreview) btnTogglePreview.classList.toggle('active', isPreviewEnabled);
            if (iconTogglePreview) iconTogglePreview.textContent = 'visibility';
            if (previewCard) previewCard.style.display = isPreviewEnabled ? 'flex' : 'none';
        }
        updatePreviewVisibility();

        if (btnTogglePreview) {
            btnTogglePreview.addEventListener('click', function () {
                isPreviewEnabled = !isPreviewEnabled;
                localStorage.setItem('ft_controller_preview_enabled', isPreviewEnabled ? 'true' : 'false');
                updatePreviewVisibility();
                if (isPreviewEnabled && C.isHovered) {
                    readLayer();
                }
            });
        }
    }

    function syncTransportState() {
        if (!C.cs) return;
        C.cs.evalScript('FishTools.transportGetPlayState()', function (result) {
            var btnPlay = el('btn-play-pause');
            var iconPlay = el('play-pause-icon');
            if (!btnPlay || !iconPlay) return;
            var playing = result === 'true' || result === true;
            btnPlay.classList.toggle('is-playing', playing);
            iconPlay.textContent = playing ? 'pause' : 'play_arrow';
        });
    }
    ControllerModule.refresh = function () {
        if (!C.cs) return;
        if (C.isHovered) {
            readLayer();
        } else {
            deactivateController();
        }
        syncTransportState();
    };
    ControllerModule.setSnapCard = function (id) {
        var map = { 'card-move': 'move', 'card-rotate': 'rotate', 'card-scale': 'scale', 'card-opacity': 'opacity' };
        var name = map[id];
        if (!name) return;
        if (C.timer) clearInterval(C.timer);
        document.querySelectorAll('.controller-am-card').forEach(function (card) { card.classList.remove('is-active'); });
        var focusedCard = el(id);
        if (focusedCard) focusedCard.classList.add('is-active');
        C.readToken++;
        C.card = name;
        C.hovered.move = C.hovered.rotate = C.hovered.scale = C.hovered.opacity = false;
        C.hovered[name] = true;
        readLayer();
        if (C.refreshTimer) clearTimeout(C.refreshTimer);
        C.refreshTimer = setTimeout(function () { if (C.card === name) readLayer(); C.refreshTimer = null; }, 220);
    };
    ControllerModule.clearSnapCard = function () {
        if (C.timer) clearInterval(C.timer);
        if (C.refreshTimer) clearTimeout(C.refreshTimer);
        if (C.pendingLeave) { clearTimeout(C.pendingLeave); C.pendingLeave = null; }
        C.readToken++;
        C.timer = null; C.card = null; C.data = null; C.rotValue = null;
        C.hovered.move = C.hovered.rotate = C.hovered.scale = C.hovered.opacity = false;
        document.querySelectorAll('.controller-am-card').forEach(function (card) { card.classList.remove('is-active'); });
        resetDisplays();
    };
    window.ControllerModule = ControllerModule;
})();
