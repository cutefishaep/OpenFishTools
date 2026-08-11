'use strict';

(function () {
    var ControllerModule = {};
    var C = {
        cs: null, data: null, card: null, timer: null, action: null, writeQueue: {}, writeTimer: null, refreshTimer: null, readToken: 0,
        linked: true, rotationAxis: 'Z', offsetZ: 0, offsetW: 0, offsetH: 0,
        hovered: { move: false, rotate: false, scale: false, opacity: false }
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
        var scale = data.scale || [100, 100];
        C.offsetZ = finite(position[2], 0) / 1.5;
        C.offsetW = -(finite(scale[0], 100) - 100) / 0.4;
        C.offsetH = -(finite(scale[1], 100) - 100) / 0.4;
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
        return k === 'position' ? 'Move Layer' : k === 'anchor' ? 'Move Anchor'
             : k === 'z' ? 'Move Z' : k === 'rotate' ? 'Rotate' : 'Scale';
    }
    function queueWrite(key, script) {
        C.writeQueue[key] = script;
        if (C.writeTimer) return;
        C.writeTimer = setTimeout(function () {
            var queue = C.writeQueue; C.writeQueue = {}; C.writeTimer = null;
            var keys = Object.keys(queue); if (!keys.length) return;
            var body = keys.map(function (k) { return queue[k]; }).join('; ');
            evalScript('app.beginUndoGroup("' + undoLabel() + '"); (function(){ ' + body + '; })(); app.endUndoGroup();');
        }, 30);
    }
    function flushWrites(done) {
        if (C.writeTimer) { clearTimeout(C.writeTimer); C.writeTimer = null; }
        var queue = C.writeQueue; C.writeQueue = {};
        var keys = Object.keys(queue);
        if (!keys.length) { if (done) done(); return; }
        var body = keys.map(function (k) { return queue[k]; }).join('; ');
        evalScript('app.beginUndoGroup("' + undoLabel() + '"); (function(){ ' + body + '; })(); app.endUndoGroup();', function () { if (done) done(); });
    }
    function axis(prop, index, value) { var safe = finite(value, 0); var call = prop === 'ADBE Position' ? 'FishTools.controllerSetPositionAxis(' + index + ',' + safe + ')' : 'FishTools.controllerSetAxis("' + prop + '",' + index + ',' + safe + ')'; queueWrite(prop + ':' + index, call); }
    function positionXY(x, y) { var sx = finite(x, 0), sy = finite(y, 0); queueWrite('ADBE Position:XY', 'FishTools.controllerSetPositionXY(' + sx + ',' + sy + ')'); }
    function positionZ(z) { var sz = finite(z, 0); queueWrite('ADBE Position:2', 'FishTools.controllerSetPositionZ(' + sz + ')'); }
    function scalar(prop, value) { var safe = finite(value, 0); queueWrite(prop, 'FishTools.controllerSetValue("' + prop + '",' + safe + ')'); }
    function rotationProperty() { return C.rotationAxis === 'X' ? 'ADBE Rotate X' : C.rotationAxis === 'Y' ? 'ADBE Rotate Y' : 'ADBE Rotate Z'; }
    function rotationValue(data) { return C.rotationAxis === 'X' ? data.rotationX : C.rotationAxis === 'Y' ? data.rotationY : data.rotationZ; }
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

    function resetDisplays() {
        put('val-pos-x', '0.00'); put('val-pos-y', '0.00'); put('val-pos-z', '0.00'); put('val-rot', '0°');
        put('rot-multiplier', ''); put('val-scale-w', '100.0'); put('val-scale-h', '100.0'); put('val-opacity', '100%');
        setBlend('NORMAL');
        if (el('opacity-slider')) {
            el('opacity-slider').value = 100;
            el('opacity-slider').style.background = 'linear-gradient(to right,var(--accent) 100%,var(--surface2) 100%)';
        }
        if (el('dial-knob')) { el('dial-knob').style.left = '171px'; el('dial-knob').style.top = '86px'; }
        if (el('dial-trail-path')) el('dial-trail-path').setAttribute('d', '');
        if (el('dial-trail-overlay-path')) el('dial-trail-overlay-path').setAttribute('d', '');
        if (el('z-wheel')) { el('z-wheel').style.display = 'none'; el('z-wheel').style.visibility = 'hidden'; }
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
        var angle = Number(value || 0), abs = Math.abs(Math.round(angle)), multi = Math.floor(abs / 360), rem = abs % 360;
        if (C.hovered.rotate || C.action && C.action.kind === 'rotate') {
            put('rot-multiplier', multi ? (angle >= 0 ? multi : '-' + multi) + 'x' : '');
            put('val-rot', (angle < 0 ? '-' : '') + rem + '°');
        } else put('val-rot', '0°');
        var knob = el('dial-knob'), radians = angle * Math.PI / 180;
        if (knob) { knob.style.left = (100 + 85 * Math.cos(radians) - 14) + 'px'; knob.style.top = (100 + 85 * Math.sin(radians) - 14) + 'px'; }
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
        if (el('dial-trail-path')) el('dial-trail-path').setAttribute('d', baseTrail);
        if (el('dial-trail-overlay-path')) el('dial-trail-overlay-path').setAttribute('d', overlayTrail);
    }

    function readLayer() {
        var token = C.readToken;
        C.cs.evalScript('FishTools.controllerRead()', function (result) {
            try {
                if (token !== C.readToken) return;
                if (!result || result === 'undefined' || result === 'EvalScript error.') {
                    if (C.card) put('controller-layer-name', result === 'EvalScript error.' ? 'AE host script failed to load' : 'Waiting for AE host...');
                    return;
                }
                var d = JSON.parse(result || '{}');
                if (d.error) {
                    if (C.card) put('controller-layer-name', d.message || 'No Layer');
                    return;
                }
                if (!C.card) return;
                C.data = d;
                if (!C.action) {
                    syncRulerValues(d);
                    var p = d.position || [0, 0], s = d.scale || [100, 100];
                    put('controller-layer-name', d.layerName || 'Selected layer');
                    if (C.hovered.move) { put('val-pos-x', num(p[0])); put('val-pos-y', num(-p[1])); put('val-pos-z', num(p[2] || 0)); }
                    if (C.hovered.rotate) renderRotation(rotationValue(d) || 0);
                    if (C.hovered.scale) { put('val-scale-w', num(s[0], 1)); put('val-scale-h', num(s[1], 1)); }
                    if (C.hovered.opacity) {
                        put('val-opacity', Math.round(d.opacity) + '%');
                        var opacitySlider = el('opacity-slider');
                        if (opacitySlider) { opacitySlider.value = finite(d.opacity, 100); opacitySlider.style.background = 'linear-gradient(to right,var(--accent) ' + opacitySlider.value + '%,var(--surface2) ' + opacitySlider.value + '%)'; }
                        setBlend(d.blendMode || 'NORMAL');
                    }
                } else {
                    put('controller-layer-name', d.layerName || 'Selected layer');
                }
                if (el('z-wheel')) {
                    var is3D = !!d.is3D;
                    el('z-wheel').style.display = is3D ? 'flex' : 'none';
                    el('z-wheel').style.visibility = is3D ? 'visible' : 'hidden';
                }
                document.querySelectorAll('[data-rotation-axis="X"],[data-rotation-axis="Y"]').forEach(function (b) { b.style.display = d.is3D ? '' : 'none'; });
                if (!d.is3D && C.rotationAxis !== 'Z') {
                    C.rotationAxis = 'Z';
                    document.querySelectorAll('[data-rotation-axis]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-rotation-axis') === 'Z'); });
                    if (C.card === 'rotate') readLayer();
                }
            } catch (e) {
                if (C.card) put('controller-layer-name', 'Host response invalid: ' + String(result || 'empty'));
                console.error('Controller read error:', e, result);
            }
        });
    }

    function enter(name, card) {
        if (document.documentElement.getAttribute('data-snap') === 'on') return;
        C.readToken++;
        C.card = name; C.hovered[name] = true; card.classList.add('is-active');
        put('controller-layer-name', 'Reading selected layer...');
        if (C.timer) clearInterval(C.timer); C.timer = null;
        if (C.refreshTimer) clearTimeout(C.refreshTimer);
        readLayer();
        C.refreshTimer = setTimeout(function () {
            if (C.card === name) readLayer();
            C.refreshTimer = null;
        }, 220);
    }
    function leave(name, card) {
        if (document.documentElement.getAttribute('data-snap') === 'on') return;
        C.readToken++;
        C.hovered[name] = false; card.classList.remove('is-active'); C.action = null;
        var leftData = C.data; C.data = null;
        if (C.refreshTimer) clearTimeout(C.refreshTimer);
        if (C.timer) clearInterval(C.timer); C.timer = null; C.card = null;
        resetDisplays();
        if (leftData) {
            syncRulerValues(leftData);
        } else {
            C.offsetZ = 0; C.offsetW = 0; C.offsetH = 0;
            updateInfiniteRuler('z-ruler', 0); updateInfiniteRuler('ruler-w', 0); updateInfiniteRuler('ruler-h', 0);
        }
    }

    function startMove(kind, e) {
        if (!C.data || (!C.hovered.move && kind !== 'anchor')) return;
        var p = point(e), value = kind === 'position' ? C.data.position : C.data.anchor;
        if (!isFinite(p.x) || !isFinite(p.y)) return;
        C.action = { kind: kind, x: p.x, y: p.y, value: value || [0, 0], offset: 0 }; if (e.preventDefault) e.preventDefault();
    }
    function startZ(e) {
        if (!C.data || !C.hovered.move) return;
        var p = point(e); if (!isFinite(p.x) || !isFinite(p.y)) return;
        var curZ = finite(el('val-pos-z') ? Number(el('val-pos-z').textContent) : (C.data.position || [0, 0, 0])[2], 0);
        C.action = { kind: 'z', x: p.x, y: p.y, value: curZ, offset: C.offsetZ };
        if (e.preventDefault) e.preventDefault();
    }
    function startScale(axisName, e) {
        if (!C.data || !C.hovered.scale) return;
        var p = point(e), index = axisName === 'w' ? 0 : 1;
        if (!isFinite(p.x) || !isFinite(p.y)) return;
        var dispId = axisName === 'w' ? 'val-scale-w' : 'val-scale-h';
        var curVal = finite(el(dispId) ? Number(el(dispId).textContent) : (C.data.scale || [100, 100])[index], 100);
        var initOffset = axisName === 'w' ? C.offsetW : C.offsetH;
        C.action = { kind: axisName, x: p.x, y: p.y, value: curVal, offset: initOffset };
        if (e.preventDefault) e.preventDefault();
    }
    function startRotate(e) {
        if (!C.data || !C.hovered.rotate) return;
        var p = point(e), rect = el('dial-area').getBoundingClientRect();
        if (!isFinite(p.x) || !isFinite(p.y)) return;
        C.action = { kind: 'rotate', cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, angle: Math.atan2(p.y - (rect.top + rect.height / 2), p.x - (rect.left + rect.width / 2)) * 180 / Math.PI, value: finite(rotationValue(C.data), 0) }; if (e.preventDefault) e.preventDefault();
    }

    function drag(e) {
        var a = C.action; if (!a) return; var p = point(e); if (!isFinite(p.x) || !isFinite(p.y)) return; var dx = p.x - a.x, dy = p.y - a.y;
        if (a.kind === 'position' || a.kind === 'anchor') {
            var x = Number(a.value[0]) + dx, y = Number(a.value[1]) + dy, prop = a.kind === 'position' ? 'ADBE Position' : 'ADBE Anchor Point';
            put('val-pos-x', num(x)); put('val-pos-y', num(-y));
            if (a.kind === 'position') {
                positionXY(x, y);
            } else {
                axis(prop, 0, x); axis(prop, 1, y);
            }
            a.x = p.x; a.y = p.y; a.value = [x, y];
        } else if (a.kind === 'z') {
            var z = a.value + dy * 1.5; put('val-pos-z', num(z)); positionZ(z);
            a.y = p.y; a.value = z; a.offset += dy;
            C.offsetZ = a.offset;
            updateInfiniteRuler('z-ruler', C.offsetZ);
        } else if (a.kind === 'w' || a.kind === 'h') {
            var value = Math.max(0, a.value - dx * .4), index = a.kind === 'w' ? 0 : 1;
            put(a.kind === 'w' ? 'val-scale-w' : 'val-scale-h', num(value, 1)); axis('ADBE Scale', index, value);
            if (C.linked) { put(a.kind === 'w' ? 'val-scale-h' : 'val-scale-w', num(value, 1)); axis('ADBE Scale', index ? 0 : 1, value); }
            a.x = p.x; a.value = value; a.offset += dx;
            if (a.kind === 'w') C.offsetW = a.offset; else C.offsetH = a.offset;
            updateInfiniteRuler(a.kind === 'w' ? 'ruler-w' : 'ruler-h', a.offset);
        } else if (a.kind === 'rotate') {
            var angle = Math.atan2(p.y - a.cy, p.x - a.cx) * 180 / Math.PI, delta = angle - a.angle;
            if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
            a.value += delta; a.angle = angle; renderRotation(a.value); scalar(rotationProperty(), a.value);
        }
        if (e.preventDefault) e.preventDefault();
    }

    ControllerModule.init = function () {
        if (C.cs) return;
        C.cs = window.csInterface || new CSInterface();
        initBlendModes();
        initInfiniteRuler('z-ruler', true); initInfiniteRuler('ruler-w', false); initInfiniteRuler('ruler-h', false);
        document.querySelectorAll('[data-rotation-axis]').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.stopPropagation();
                C.rotationAxis = button.getAttribute('data-rotation-axis');
                document.querySelectorAll('[data-rotation-axis]').forEach(function (item) { item.classList.toggle('active', item === button); });
                if (C.card === 'rotate') readLayer();
            });
        });
        [['move', 'card-move'], ['rotate', 'card-rotate'], ['scale', 'card-scale'], ['opacity', 'card-opacity']].forEach(function (item) {
            var card = el(item[1]); if (!card) return;
            card.addEventListener('mouseenter', function () { enter(item[0], card); });
            card.addEventListener('mouseleave', function () { leave(item[0], card); });
            card.addEventListener('touchstart', function () { enter(item[0], card); }, false);
        });
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
        if (el('opacity-slider')) el('opacity-slider').addEventListener('input', function (e) { put('val-opacity', Math.round(e.target.value) + '%'); e.target.style.background = 'linear-gradient(to right,var(--accent) ' + e.target.value + '%,var(--surface2) ' + e.target.value + '%)'; scalar('ADBE Opacity', e.target.value); });
        window.addEventListener('mousemove', drag);
        window.addEventListener('touchmove', drag, { passive: false });
        var endDrag = function () {
            if (!C.action) return;
            C.action = null;
            flushWrites();
        };
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
    };
    ControllerModule.refresh = function () {
        if (!C.cs) return;
        readLayer();
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
        C.readToken++;
        C.timer = null; C.card = null; C.data = null;
        document.querySelectorAll('.controller-am-card').forEach(function (card) { card.classList.remove('is-active'); });
        resetDisplays();
    };
    window.ControllerModule = ControllerModule;
})();
