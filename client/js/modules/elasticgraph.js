'use strict';

var ElasticGraphModule = (function () {
    var canvas, ctx;
    var width, height;

    // Active Graph Type: 'elastic' | 'bounce' | 'cyclic'
    var currentType = 'elastic';
    // Mode: 'in' (Arrival) | 'out' (Departure / Anticipation)
    var currentMode = 'in';

    // State parameters matching Alight Motion Easing Models exactly
    var state = {
        elastic: { stepLength: 0.35, attack: 1.0, decay: 0.45, magnitude: 0.5 },
        bounce:  { firstStepLength: 0.45, bounciness: 0.65 },
        cyclic:  { stepLength: 0.35, sharpness: 0.0, skew: 0.5, decay: 0.0 }
    };

    // Active dragging state
    var activeHandleId = null;
    var isSnapEnabled = false;
    var currentPresetFilter = 'all';

    // DOM Elements
    var btnTypeElastic, btnTypeBounce, btnTypeCyclic;
    var btnSnap, btnReverse, btnIn, btnOut, btnCopy, btnPaste, btnApply, btnSavePreset, presetList, presetFilterGroup;
    var elasticPresets = [];

    // ─── Init ────────────────────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('elastic-graph-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        btnTypeElastic = document.getElementById('btn-type-elastic');
        btnTypeBounce  = document.getElementById('btn-type-bounce');
        btnTypeCyclic  = document.getElementById('btn-type-cyclic');

        btnSnap       = document.getElementById('btn-elastic-snap');
        btnReverse    = document.getElementById('btn-elastic-reverse');
        btnIn         = document.getElementById('btn-elastic-in');
        btnOut        = document.getElementById('btn-elastic-out');
        btnCopy       = document.getElementById('btn-elastic-copy');
        btnPaste      = document.getElementById('btn-elastic-paste');
        btnApply      = document.getElementById('btn-elastic-apply');
        btnSavePreset = document.getElementById('btn-save-elastic-preset');
        presetList    = document.getElementById('elastic-preset-list');
        presetFilterGroup = document.getElementById('elastic-preset-filter');

        if (btnTypeElastic) btnTypeElastic.addEventListener('click', function () { setType('elastic'); });
        if (btnTypeBounce)  btnTypeBounce.addEventListener('click',  function () { setType('bounce'); });
        if (btnTypeCyclic)  btnTypeCyclic.addEventListener('click',  function () { setType('cyclic'); });

        if (btnSnap)    btnSnap.addEventListener('click', toggleSnap);
        if (btnReverse) btnReverse.addEventListener('click', toggleReverse);
        if (btnIn)      btnIn.addEventListener('click',  function () { setMode('in'); });
        if (btnOut)     btnOut.addEventListener('click', function () { setMode('out'); });
        if (btnCopy)    btnCopy.addEventListener('click', copyValue);
        if (btnPaste)   btnPaste.addEventListener('click', pasteValue);
        if (btnApply)   btnApply.addEventListener('click', applyExpression);
        if (btnSavePreset) btnSavePreset.addEventListener('click', savePreset);

        if (presetFilterGroup) {
            presetFilterGroup.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-filter]');
                if (!btn) return;
                currentPresetFilter = btn.getAttribute('data-filter') || 'all';
                presetFilterGroup.querySelectorAll('button').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                refreshPresets();
            });
        }

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup',   onMouseUp);

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove',  onTouchMove,  { passive: false });
        window.addEventListener('touchend',   onMouseUp);

        loadPresets();
        loadLastValue();
        updateUIButtons();
        render();
    }

    // ─── Setters ─────────────────────────────────────────────────────────────
    function setType(type) {
        if (type !== 'elastic' && type !== 'bounce' && type !== 'cyclic') return;
        currentType = type;
        updateUIButtons();
        saveLastValue();
        render();
    }

    function toggleReverse() {
        setMode(currentMode === 'in' ? 'out' : 'in');
    }

    function setMode(mode) {
        currentMode = (mode === 'out') ? 'out' : 'in';
        updateUIButtons();
        saveLastValue();
        render();
    }

    function updateUIButtons() {
        if (btnTypeElastic) btnTypeElastic.classList.toggle('active', currentType === 'elastic');
        if (btnTypeBounce)  btnTypeBounce.classList.toggle('active',  currentType === 'bounce');
        if (btnTypeCyclic)  btnTypeCyclic.classList.toggle('active',  currentType === 'cyclic');

        if (btnReverse) btnReverse.classList.toggle('active', currentMode === 'out');
        if (btnIn)  btnIn.classList.toggle('active',  currentMode === 'in');
        if (btnOut) btnOut.classList.toggle('active', currentMode === 'out');
        updateHiddenInputs();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function getCSSVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function snapVal(v) {
        if (!isSnapEnabled) return v;
        return Math.round(v * 10) / 10;
    }

    function toggleSnap() {
        isSnapEnabled = !isSnapEnabled;
        if (btnSnap) btnSnap.classList.toggle('active', isSnapEnabled);
    }

    // ─── Alight Motion Easing Formulas (Exact Bytecode Reproduction) ─────────

    // 1. Elastic Easing (com.alightcreative.app.motion.easing.ElasticEasing)
    function evalElastic(t, stepLength, decay, magnitude) {
        if (t <= 0) return 0.0;
        if (t >= 1) return 1.0;
        var sL = (typeof stepLength === 'number' && !isNaN(stepLength)) ? clamp(stepLength, 0.05, 0.95) : 0.35;
        var d  = (typeof decay === 'number' && !isNaN(decay)) ? clamp(decay, 0.0, 0.95) : 0.45;
        var mag = (typeof magnitude === 'number' && !isNaN(magnitude)) ? clamp(magnitude, 0.0, 1.0) : 0.5;
        var exp = 1.0 + 15.0 * (d * d);

        function basic(time) {
            var omega = (Math.PI * time) / sL;
            var tC = Math.max(0.005, Math.min(1.0, time));
            var env = Math.abs(Math.pow(1.0 - tC, exp));
            return Math.cos(omega) * env;
        }

        if (t < sL) {
            var v0 = 1.0 - (basic(sL) * mag);
            var v1 = (1.0 - Math.cos((Math.PI * t) / sL)) / 2.0;
            var normT = t / sL;
            var powVal = 1.0 - Math.pow(normT, 3.0);
            var baseVal = 1.0 - (basic(t) * mag);
            return (v1 * v0 * powVal) + (baseVal * (1.0 - powVal));
        } else {
            return 1.0 - (basic(t) * mag);
        }
    }

    // 2. Bounce Easing (com.alightcreative.app.motion.easing.BounceEasing)
    function evalBounce(t, firstStepLength, bounciness) {
        var fStep = (typeof firstStepLength === 'number' && !isNaN(firstStepLength)) ? clamp(firstStepLength, 0.05, 0.95) : 0.45;
        var bnc = (typeof bounciness === 'number' && !isNaN(bounciness)) ? clamp(bounciness, 0.05, 0.95) : 0.65;

        if (fStep <= 0) return 1.0;
        if (t <= 0) return 0.0;
        if (t >= 1) return 1.0;

        var tShifted = t + (fStep / 2.0);
        var step = fStep;
        var height = 1.0;
        var start = 0.0;

        while (tShifted > start + step) {
            start += step;
            step *= bnc;
            height *= bnc;
            if (height < 0.005) return 1.0;
        }

        var norm = (tShifted - start) / step;
        var x = Math.abs((norm - 0.5) * 2.0);
        return (1.0 - height) + (x * x) * height;
    }

    // 3. Cyclic Easing (com.alightcreative.app.motion.easing.CyclicEasing)
    function evalCyclic(t, stepLength, sharpness, skew, decay) {
        if (t <= 0) return 0.0;
        if (t >= 1) return 1.0;
        var sL = (typeof stepLength === 'number' && !isNaN(stepLength)) ? clamp(stepLength, 0.005, 0.95) : 0.35;
        var shp = (typeof sharpness === 'number' && !isNaN(sharpness)) ? clamp(sharpness, 0.0, 1.0) : 0.0;
        var skw = (typeof skew === 'number' && !isNaN(skew)) ? clamp(skew, 0.001, 0.999) : 0.5;
        var dcy = (typeof decay === 'number' && !isNaN(decay)) ? clamp(decay, 0.0, 0.9) : 0.0;

        function pctInStep(time) {
            var rem = ((time % sL) + sL) % sL;
            return rem / sL;
        }

        function skewInterp(time) {
            var pct = pctInStep(time);
            var factor;
            if (pct < skw) {
                factor = 0.5 * (pct / skw);
            } else if (pct > skw) {
                factor = 0.5 + 0.5 * ((pct - skw) / (1.0 - skw));
            } else {
                factor = 0.5;
            }
            var stepBase = time - (pct * sL);
            return stepBase + (factor * sL);
        }

        function cosInterp(time) {
            var phase = (time / sL) * (Math.PI * 2.0);
            return 1.0 - (Math.cos(phase) + 1.0) / 2.0;
        }

        function sawInterp(time) {
            return 1.0 - (Math.abs(pctInStep(time) - 0.5) * 2.0);
        }

        var skewedT = skewInterp(t);
        var cosV = cosInterp(skewedT);
        var sawV = sawInterp(skewedT);
        var v = cosV * (1.0 - shp) + sawV * shp;

        var base = t - (t % sL);
        if (base + sL / 4.0 > 1.0) {
            v = 0.0;
        } else if (base + sL / 2.0 < 1.0) {
            if (base + sL * 3.0 / 4.0 > 1.0 && pctInStep(t) > skw) {
                v = 1.0;
            }
        }

        return v * (1.0 - t * dcy) + (t * dcy);
    }

    // Unified value evaluator with mode transformation
    function getCurveValue(t, type, params, mode) {
        var m = mode || currentMode;
        var typ = type || currentType;
        var p = params || state[typ];

        var rawVal;
        if (typ === 'bounce') {
            rawVal = evalBounce(m === 'out' ? 1.0 - t : t, p.firstStepLength, p.bounciness);
        } else if (typ === 'cyclic') {
            rawVal = evalCyclic(m === 'out' ? 1.0 - t : t, p.stepLength, p.sharpness, p.skew, p.decay);
        } else {
            rawVal = evalElastic(m === 'out' ? 1.0 - t : t, p.stepLength, p.decay, p.magnitude);
        }

        return (m === 'out') ? 1.0 - rawVal : rawVal;
    }

    // ─── Coordinate System (Zoomed-In, Ample Overshoot Headroom) ──────────────
    function getViewMetrics(w, h, isMain, type, mode) {
        var pad = isMain
            ? { top: 16, right: 14, bottom: 16, left: 14 }
            : { top: 6,  right: 6,  bottom: 6,  left: 6  };

        var plotW = w - pad.left - pad.right;
        var plotH = h - pad.top  - pad.bottom;

        var typ = type || currentType;
        var m   = mode || currentMode;

        var y0, y1;
        if (typ === 'elastic') {
            if (m === 'in') {
                // In IN mode: Shift grid downwards so top half has plenty of room for overshoot
                y0 = pad.top + plotH * 0.90;
                y1 = pad.top + plotH * 0.46;
            } else {
                // In OUT mode: Shift grid upwards so bottom half has plenty of room for anticipation
                y0 = pad.top + plotH * 0.54;
                y1 = pad.top + plotH * 0.10;
            }
        } else {
            // Symmetrical rectangular layout for Bounce and Cyclic
            y0 = pad.top + plotH * 0.88;
            y1 = pad.top + plotH * 0.28;
        }

        var rangeHeight = y0 - y1;

        return {
            pad: pad,
            plotW: plotW,
            plotH: plotH,
            y0: y0,
            y1: y1,
            rangeHeight: rangeHeight
        };
    }

    function normToCanvas(nx, ny, metrics) {
        return {
            x: metrics.pad.left + nx * metrics.plotW,
            y: metrics.y0 - ny * metrics.rangeHeight
        };
    }

    function canvasToNorm(cx, cy, metrics) {
        return {
            nx: (cx - metrics.pad.left) / metrics.plotW,
            ny: (metrics.y0 - cy) / metrics.rangeHeight
        };
    }

    // ─── Multi-Handle System ──────────────────────────────────────────────────
    function getHandlesList(type, params, mode) {
        var typ = type || currentType;
        var p = params || state[typ];
        var m = mode || currentMode;
        var list = [];

        if (typ === 'elastic') {
            var sL  = p.stepLength || 0.35;
            var att = (p.attack !== undefined) ? p.attack : 1.0;
            var dcy = (p.decay !== undefined) ? p.decay : 0.45;
            var mag = (p.magnitude !== undefined) ? p.magnitude : 0.5;

            // Handle 1: Main peak controller (frequency & damping) with clean stem
            var inHX1 = sL * (att + 1.0);
            var inHY1 = dcy;
            var inAX1 = inHX1;
            var inAY1 = evalElastic(inHX1, sL, dcy, mag);

            var hX1 = (m === 'out') ? 1.0 - inHX1 : inHX1;
            var hY1 = (m === 'out') ? 1.0 - inHY1 : inHY1;
            var aX1 = (m === 'out') ? 1.0 - inAX1 : inAX1;
            var aY1 = (m === 'out') ? 1.0 - inAY1 : inAY1;

            list.push({
                id: 'main',
                pos: { x: hX1, y: hY1 },
                anchor: { x: aX1, y: aY1 }
            });

            // Handle 2: Magnitude guideline (single ceiling knob on border + horizontal dashed guide)
            var inHY2 = 1.0 + mag;
            var hX2 = (m === 'out') ? 1.0 : 0.0;
            var hY2 = (m === 'out') ? 1.0 - inHY2 : inHY2;

            list.push({
                id: 'magnitude',
                pos: { x: hX2, y: hY2 },
                anchor: null,
                isGuideline: true
            });

        } else if (typ === 'bounce') {
            var bnc = p.bounciness !== undefined ? p.bounciness : 0.65;
            var fStep = p.firstStepLength !== undefined ? p.firstStepLength : 0.45;

            // Handle 1: Main bounce apex with stem to baseline
            var inHX = (fStep + fStep * bnc) / 2.0;
            var inHY = 1.0 - bnc;
            var inAX = fStep / 2.0;
            var inAY = 0.0;

            var hX = (m === 'out') ? 1.0 - inHX : inHX;
            var hY = (m === 'out') ? 1.0 - inHY : inHY;
            var aX = (m === 'out') ? 1.0 - inAX : inAX;
            var aY = (m === 'out') ? 1.0 - inAY : inAY;

            list.push({
                id: 'main',
                pos: { x: hX, y: hY },
                anchor: { x: aX, y: aY }
            });

        } else if (typ === 'cyclic') {
            var sL  = p.stepLength !== undefined ? p.stepLength : 0.35;
            var shp = p.sharpness !== undefined ? p.sharpness : 0.0;
            var skw = p.skew !== undefined ? p.skew : 0.5;
            var dcy = p.decay !== undefined ? p.decay : 0.0;

            // 1. Skew: Knob right at the first peak of the wave
            var inHX_skew = skw * sL;
            var inHY_skew = 1.0;
            var hX_skew = m === 'out' ? 1.0 - inHX_skew : inHX_skew;
            var hY_skew = m === 'out' ? 0.0 : 1.0;
            list.push({
                id: 'skew',
                pos: { x: hX_skew, y: hY_skew },
                anchor: null
            });

            // 2. Sharpness: Stem extending from the peak to the sharpness knob
            var inHX_shp = shp * sL;
            var inHY_shp = 1.25;
            var hX_shp = m === 'out' ? 1.0 - inHX_shp : inHX_shp;
            var hY_shp = m === 'out' ? 1.0 - inHY_shp : inHY_shp;
            list.push({
                id: 'sharpness',
                pos: { x: hX_shp, y: hY_shp },
                anchor: { x: hX_skew, y: hY_skew }
            });

            // 3. Step: Knob on baseline to set cycle period
            var hX_step = m === 'out' ? 1.0 - sL : sL;
            var hY_step = m === 'out' ? 1.0 : 0.0;
            list.push({
                id: 'step',
                pos: { x: hX_step, y: hY_step },
                anchor: null
            });

            // 4. Decay: Knob on the right border
            var hX_dcy = m === 'out' ? 0.0 : 1.0;
            var hY_dcy = m === 'out' ? 1.0 - dcy : dcy;
            list.push({
                id: 'decay',
                pos: { x: hX_dcy, y: hY_dcy },
                anchor: null
            });
        }

        return list;
    }

    // ─── Render Canvas ───────────────────────────────────────────────────────
    function resize() {
        if (!canvas) return;
        var parent = canvas.parentElement;
        var rect   = parent.getBoundingClientRect();
        parent.style.height = (rect.width * 0.68) + 'px';
        canvas.width  = rect.width;
        canvas.height = rect.width * 0.68;
        width  = canvas.width;
        height = canvas.height;
        render();
    }

    function render() {
        if (!ctx || !width || !height) return;
        drawGraph(ctx, width, height, currentType, state[currentType], currentMode, true);
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

    function drawGraph(context, w, h, type, params, mode, isMain) {
        var clrCurve   = getCSSVar('--graph-curve')   || '#ffb400';
        var clrHandle  = getCSSVar('--graph-handle')  || '#ffffff';
        var clrGrid    = getCSSVar('--graph-grid')     || 'rgba(255,180,0,0.08)';
        var clrGridMid = getCSSVar('--graph-grid-mid')|| 'rgba(255,180,0,0.2)';
        var clrBox     = getCSSVar('--graph-box')     || 'rgba(255,180,0,0.4)';
        var clrDash    = getCSSVar('--graph-dash')    || 'rgba(255,180,0,0.2)';
        var clrBorder  = getCSSVar('--graph-border')  || '#333';

        var metrics = getViewMetrics(w, h, isMain, type, mode);
        var pad = metrics.pad;
        var plotW = metrics.plotW;

        context.clearRect(0, 0, w, h);

        if (isMain) {
            // Clean 10x10 Unit Grid (strictly inside unit box [0, 1] x [0, 1])
            var cols = 10;
            for (var i = 1; i < cols; i++) {
                var gx = Math.round(pad.left + (i / cols) * plotW) + 0.5;
                context.strokeStyle = (i === 5) ? clrGridMid : clrGrid;
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(gx, metrics.y1);
                context.lineTo(gx, metrics.y0);
                context.stroke();
            }

            var rows = 10;
            for (var j = 1; j < rows; j++) {
                var gy = Math.round(metrics.y1 + (j / rows) * metrics.rangeHeight) + 0.5;
                context.strokeStyle = (j === 5) ? clrGridMid : clrGrid;
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(pad.left, gy);
                context.lineTo(pad.left + plotW, gy);
                context.stroke();
            }

            // Grid Unit Box [0, 1] x [0, 1]
            context.strokeStyle = clrBox;
            context.lineWidth = 1;
            context.strokeRect(pad.left, metrics.y1, plotW, metrics.rangeHeight);
        } else {
            context.strokeStyle = clrBorder;
            context.lineWidth = 1;
            context.strokeRect(pad.left, metrics.y1, plotW, metrics.rangeHeight);
        }

        // Horizontal baseline (y=0) and target (y=1) dashed lines
        context.strokeStyle = clrDash;
        context.lineWidth = 2;
        context.setLineDash([5, 5]);

        context.beginPath();
        context.moveTo(pad.left, metrics.y0);
        context.lineTo(pad.left + plotW, metrics.y0);
        context.stroke();

        context.beginPath();
        context.moveTo(pad.left, metrics.y1);
        context.lineTo(pad.left + plotW, metrics.y1);
        context.stroke();

        context.setLineDash([]);
        context.lineWidth = 1;

        // Draw Smooth Easing Curve
        context.lineWidth = isMain ? 6 : 3;
        context.strokeStyle = clrCurve;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.beginPath();
        var STEPS = 300;
        for (var k = 0; k <= STEPS; k++) {
            var t  = k / STEPS;
            var v  = getCurveValue(t, type, params, mode);
            var cp = normToCanvas(t, v, metrics);
            if (k === 0) context.moveTo(cp.x, cp.y);
            else         context.lineTo(cp.x, cp.y);
        }
        context.stroke();

        // Draw Interactive Handles (2-Pass: Stems in Background, Knobs in Foreground)
        if (isMain) {
            var handles = getHandlesList(type, params, mode);

            // Pass 1: Stems and Guidelines (Drawn behind all knobs)
            handles.forEach(function (handle) {
                var hp = normToCanvas(handle.pos.x, handle.pos.y, metrics);

                if (handle.isGuideline) {
                    // Solid horizontal guide line from the edge across to the knob
                    context.strokeStyle = clrHandle;
                    context.lineWidth = 2;
                    context.beginPath();
                    var xStart = (mode === 'out') ? pad.left : pad.left + plotW;
                    context.moveTo(xStart, hp.y);
                    context.lineTo(hp.x, hp.y);
                    context.stroke();
                }

                if (handle.anchor) {
                    var ap = normToCanvas(handle.anchor.x, handle.anchor.y, metrics);

                    // Stem line
                    context.strokeStyle = clrHandle;
                    context.lineWidth = 4;
                    context.beginPath();
                    context.moveTo(ap.x, ap.y);
                    context.lineTo(hp.x, hp.y);
                    context.stroke();

                    // Anchor Dot on Curve/Base
                    context.fillStyle = clrHandle;
                    context.beginPath();
                    context.arc(ap.x, ap.y, 4, 0, Math.PI * 2);
                    context.fill();
                }
            });

            // Pass 2: Handle Knobs (Drawn cleanly on top of all stems and anchors)
            handles.forEach(function (handle) {
                var hp = normToCanvas(handle.pos.x, handle.pos.y, metrics);
                var isHot = (activeHandleId === handle.id);
                var knobColor = isHot ? clrHandle : clrCurve;

                drawPoint(context, hp.x, hp.y, knobColor);
            });
        }
    }

    // ─── Interaction & Drag Handlers ─────────────────────────────────────────
    function getCanvasPoint(clientX, clientY) {
        var rect   = canvas.getBoundingClientRect();
        var scaleX = canvas.width  / rect.width;
        var scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top)  * scaleY
        };
    }

    function onMouseDown(e) {
        var pt = getCanvasPoint(e.clientX, e.clientY);
        var metrics = getViewMetrics(width, height, true, currentType, currentMode);
        var handles = getHandlesList(currentType, state[currentType], currentMode);

        var closest = null;
        var minDist = 28;

        handles.forEach(function (h) {
            var hp = normToCanvas(h.pos.x, h.pos.y, metrics);
            var d = Math.hypot(pt.x - hp.x, pt.y - hp.y);
            if (d < minDist) {
                minDist = d;
                closest = h.id;
            }
        });

        if (closest) {
            activeHandleId = closest;
            canvas.style.cursor = 'grabbing';
            render();
        }
    }

    function onTouchStart(e) {
        e.preventDefault();
        var touch = e.touches[0];
        var pt    = getCanvasPoint(touch.clientX, touch.clientY);
        var metrics = getViewMetrics(width, height, true, currentType, currentMode);
        var handles = getHandlesList(currentType, state[currentType], currentMode);

        var closest = null;
        var minDist = 36;

        handles.forEach(function (h) {
            var hp = normToCanvas(h.pos.x, h.pos.y, metrics);
            var d = Math.hypot(pt.x - hp.x, pt.y - hp.y);
            if (d < minDist) {
                minDist = d;
                closest = h.id;
            }
        });

        if (closest) {
            activeHandleId = closest;
            render();
        }
    }

    function onMouseMove(e) {
        if (!activeHandleId && e.target !== canvas) return;
        var pt = getCanvasPoint(e.clientX, e.clientY);
        var metrics = getViewMetrics(width, height, true, currentType, currentMode);

        if (!activeHandleId) {
            var handles = getHandlesList(currentType, state[currentType], currentMode);
            var isHover = handles.some(function (h) {
                var hp = normToCanvas(h.pos.x, h.pos.y, metrics);
                return Math.hypot(pt.x - hp.x, pt.y - hp.y) <= 26;
            });
            canvas.style.cursor = isHover ? 'grab' : 'default';
            return;
        }

        canvas.style.cursor = 'grabbing';
        handleDragMove(pt.x, pt.y, metrics);
    }

    function onTouchMove(e) {
        if (!activeHandleId) return;
        e.preventDefault();
        var touch = e.touches[0];
        var pt    = getCanvasPoint(touch.clientX, touch.clientY);
        var metrics = getViewMetrics(width, height, true, currentType, currentMode);
        handleDragMove(pt.x, pt.y, metrics);
    }

    function onMouseUp() {
        if (activeHandleId) {
            activeHandleId = null;
            if (canvas) canvas.style.cursor = 'grab';
            render();
        }
    }

    function handleDragMove(canvasX, canvasY, metrics) {
        var norm = canvasToNorm(canvasX, canvasY, metrics);
        var nx = norm.nx;
        var ny = norm.ny;

        if (currentMode === 'out') {
            nx = 1.0 - nx;
            ny = 1.0 - ny;
        }

        nx = snapVal(nx);
        ny = snapVal(ny);

        if (currentType === 'elastic') {
            if (activeHandleId === 'magnitude') {
                var mag = ny - 1.0;
                state.elastic.magnitude = clamp(mag, 0.0, 0.95);
            } else {
                var att = state.elastic.attack !== undefined ? state.elastic.attack : 1.0;
                var sL = nx / (att + 1.0);
                state.elastic.stepLength = clamp(sL, 0.08, 0.95);
                state.elastic.decay      = clamp(ny, 0.0, 0.95);
            }
        } else if (currentType === 'bounce') {
            var bnc = clamp(1.0 - ny, 0.1, 0.92);
            var fStep = clamp((nx * 2.0) / (1.0 + bnc), 0.1, 0.9);
            state.bounce.bounciness = bnc;
            state.bounce.firstStepLength = fStep;
        } else if (currentType === 'cyclic') {
            var sL = state.cyclic.stepLength || 0.35;
            if (activeHandleId === 'step') {
                state.cyclic.stepLength = clamp(nx, 0.05, 0.95);
            } else if (activeHandleId === 'sharpness') {
                state.cyclic.sharpness = clamp(nx / sL, 0.0, 1.0);
            } else if (activeHandleId === 'skew') {
                state.cyclic.skew = clamp(nx / sL, 0.05, 0.95);
            } else if (activeHandleId === 'decay') {
                state.cyclic.decay = clamp(ny, 0.0, 0.9);
            }
        }

        updateHiddenInputs();
        saveLastValue();
        render();
    }

    // ─── Hidden Inputs ───────────────────────────────────────────────────────
    function updateHiddenInputs() {
        var elX = document.getElementById('input-elastic-x');
        var elY = document.getElementById('input-elastic-y');
        var p = state[currentType];
        if (elX) elX.value = (p.stepLength || p.firstStepLength || 0.35).toFixed(3);
        if (elY) elY.value = (p.decay || p.bounciness || 0.5).toFixed(3);
    }

    // ─── Alight Motion Easing String Serializer & Parser ───────────────────────
    function serializeToString(type, mode, params) {
        var typ = type || currentType;
        var m   = mode || currentMode;
        var p   = params || state[typ];
        var prefix = (m === 'out') ? 'reverse ' : '';

        if (typ === 'elastic') {
            var sL = (p.stepLength !== undefined) ? p.stepLength : 0.35;
            var att = (p.attack !== undefined) ? p.attack : 1.0;
            var dcy = (p.decay !== undefined) ? p.decay : 0.45;
            var mag = (p.magnitude !== undefined) ? p.magnitude : 0.5;
            return prefix + 'elastic ' + sL.toFixed(7) + ' ' + att.toFixed(1) + ' ' + dcy.toFixed(7) + ' ' + mag.toFixed(1);
        } else if (typ === 'bounce') {
            var fStep = (p.firstStepLength !== undefined) ? p.firstStepLength : 0.45;
            var bnc = (p.bounciness !== undefined) ? p.bounciness : 0.65;
            return prefix + 'bounce ' + fStep.toFixed(7) + ' ' + bnc.toFixed(7);
        } else if (typ === 'cyclic') {
            var sL = (p.stepLength !== undefined) ? p.stepLength : 0.35;
            var shp = (p.sharpness !== undefined) ? p.sharpness : 0.0;
            var skw = (p.skew !== undefined) ? p.skew : 0.5;
            var dcy = (p.decay !== undefined) ? p.decay : 0.0;
            return prefix + 'cyclic ' + sL.toFixed(7) + ' ' + shp.toFixed(7) + ' ' + skw.toFixed(7) + ' ' + dcy.toFixed(7);
        }
        return JSON.stringify({ type: typ, mode: m, params: p });
    }

    function parseFromString(str) {
        if (!str || typeof str !== 'string') return null;
        var trimmed = str.trim();
        var isReverse = false;

        if (trimmed.toLowerCase().indexOf('reverse ') === 0) {
            isReverse = true;
            trimmed = trimmed.substring(8).trim();
        }

        // 1. Alight Motion Space-separated format
        var parts = trimmed.split(/\s+/);
        var head = parts[0].toLowerCase();
        var modeToSet = isReverse ? 'out' : 'in';

        if (head === 'elastic' && parts.length >= 3) {
            return {
                type: 'elastic',
                mode: modeToSet,
                params: {
                    stepLength: parseFloat(parts[1]) || 0.35,
                    attack: (parts.length >= 5) ? (parseFloat(parts[2]) || 1.0) : 1.0,
                    decay: (parts.length >= 5) ? (parseFloat(parts[3]) || 0.45) : (parseFloat(parts[2]) || 0.45),
                    magnitude: (parts.length >= 5) ? (parseFloat(parts[4]) || 0.5) : 0.5
                }
            };
        } else if (head === 'bounce' && parts.length >= 3) {
            return {
                type: 'bounce',
                mode: modeToSet,
                params: {
                    firstStepLength: parseFloat(parts[1]) || 0.45,
                    bounciness: parseFloat(parts[2]) || 0.65
                }
            };
        } else if (head === 'cyclic' && parts.length >= 3) {
            return {
                type: 'cyclic',
                mode: modeToSet,
                params: {
                    stepLength: parseFloat(parts[1]) || 0.35,
                    sharpness: (parts.length >= 5) ? (parseFloat(parts[2]) || 0.0) : 0.0,
                    skew: (parts.length >= 5) ? (parseFloat(parts[3]) || 0.5) : 0.5,
                    decay: (parts.length >= 5) ? (parseFloat(parts[4]) || 0.0) : (parseFloat(parts[2]) || 0.0)
                }
            };
        }

        // 2. Fallback JSON format
        try {
            var obj = JSON.parse(trimmed);
            if (obj && (obj.type || obj.params)) {
                return {
                    type: obj.type || 'elastic',
                    mode: obj.mode || modeToSet,
                    params: obj.params || {}
                };
            }
        } catch (e) {}

        return null;
    }

    // ─── Instant 1-Click Clipboard Paste & Copy ──────────────────────────────
    function copyValue() {
        var text = serializeToString(currentType, currentMode, state[currentType]);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                notify('Graph copied');
            }).catch(function () { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    }

    function applyPastedString(val) {
        var parsed = parseFromString(val);
        if (parsed) {
            currentType = parsed.type;
            if (parsed.mode) currentMode = parsed.mode;
            if (parsed.params) state[currentType] = parsed.params;
            updateUIButtons();
            saveLastValue();
            render();
            notify('Graph pasted');
            return true;
        }
        return false;
    }

    function openPastePrompt() {
        if (window.ModalModule) {
            var currentStr = serializeToString(currentType, currentMode, state[currentType]);
            window.ModalModule.prompt('Paste graph curve:', currentStr, function (val) {
                if (!val) return;
                if (!applyPastedString(val)) {
                    window.ModalModule.error('Invalid graph format.', 'Error');
                }
            });
        }
    }

    function pasteValue() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function (clipText) {
                if (clipText && applyPastedString(clipText)) {
                    return;
                }
                openPastePrompt();
            }).catch(function () {
                openPastePrompt();
            });
        } else {
            openPastePrompt();
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        notify('Graph copied');
    }

    function notify(msg) {
        if (window.ModalModule) window.ModalModule.info(msg, 'Graph');
    }

    // ─── Apply to After Effects ───────────────────────────────────────────────
    function applyExpression() {
        var data = {
            type: currentType,
            mode: currentMode,
            params: state[currentType]
        };

        var cs = new CSInterface();
        cs.evalScript('FishTools.applyElastic(' + JSON.stringify(data) + ')', function (res) {
            if (res === '{ok:true}') return;
            if (window.ModalModule) {
                window.ModalModule.error('Select at least 2 keyframes first.', 'Graph');
            }
        });
    }

    // ─── Presets ──────────────────────────────────────────────────────────────
    function savePreset() {
        if (!window.ModalModule) return;
        window.ModalModule.prompt('Preset name:', 'Preset ' + (elasticPresets.length + 1), function (name) {
            if (!name) return;
            elasticPresets.push({
                name: name,
                type: currentType,
                mode: currentMode,
                rawString: serializeToString(currentType, currentMode, state[currentType]),
                params: JSON.parse(JSON.stringify(state[currentType]))
            });
            if (window.FileStore) {
                window.FileStore.set('oscillation_presets', { presets: elasticPresets });
            }
            refreshPresets();
        });
    }

    function loadPresets() {
        if (window.FileStore) {
            var data = window.FileStore.get('oscillation_presets');
            if (data && Array.isArray(data.presets)) {
                elasticPresets = data.presets;
            }
        }
        refreshPresets();
    }

    function refreshPresets() {
        if (!presetList) return;
        presetList.innerHTML = '';

        var filtered = elasticPresets.filter(function (p) {
            if (currentPresetFilter === 'all') return true;
            return (p.type || 'elastic') === currentPresetFilter;
        });

        if (filtered.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--text-dim); font-size: 10px; padding: 14px 0;';
            emptyEl.textContent = 'No ' + (currentPresetFilter === 'all' ? '' : currentPresetFilter) + ' presets saved yet';
            presetList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(function (p) {
            var originalIndex = elasticPresets.indexOf(p);
            var btn = document.createElement('div');
            btn.className = 'preset-item';
            btn.title     = p.name;
            btn.style.cssText =
                'cursor:pointer;display:flex;flex-direction:column;align-items:center;' +
                'padding:4px;border-radius:6px;transition:background 0.2s;position:relative;';

            // Delete button
            var del = document.createElement('div');
            del.innerHTML = '&times;';
            del.style.cssText =
                'position:absolute;top:-2px;right:-2px;width:16px;height:16px;' +
                'background:#ff4444;color:#fff;border-radius:50%;font-size:11px;' +
                'line-height:16px;text-align:center;opacity:0;transition:opacity 0.2s;z-index:10;';
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!window.ModalModule) return;
                window.ModalModule.confirm('Delete "' + p.name + '"?', 'Delete', function (ok) {
                    if (!ok) return;
                    if (originalIndex !== -1) {
                        elasticPresets.splice(originalIndex, 1);
                        if (window.FileStore) window.FileStore.set('oscillation_presets', { presets: elasticPresets });
                        refreshPresets();
                    }
                });
            });
            btn.appendChild(del);
            btn.onmouseover = function () { del.style.opacity = '1'; };
            btn.onmouseout  = function () { del.style.opacity = '0'; };

            // Thumbnail canvas
            var tc   = document.createElement('canvas');
            tc.width  = 64;
            tc.height = 40;
            tc.style.cssText =
                'border:1px solid var(--border);border-radius:4px;margin-bottom:4px;' +
                'background:var(--graph-bg, #0a0a0a);';
            btn.appendChild(tc);
            drawGraph(tc.getContext('2d'), 64, 40, p.type || 'elastic', p.params, p.mode || 'in', false);

            // Label
            var lbl = document.createElement('span');
            lbl.innerText   = p.name;
            lbl.style.cssText =
                'font-size:0.58rem;color:#888;white-space:nowrap;overflow:hidden;' +
                'text-overflow:ellipsis;max-width:100%;';
            btn.appendChild(lbl);

            btn.addEventListener('click', function () {
                currentType = p.type || 'elastic';
                currentMode = p.mode || 'in';
                if (p.params) state[currentType] = JSON.parse(JSON.stringify(p.params));
                updateUIButtons();
                saveLastValue();
                render();
            });

            presetList.appendChild(btn);
        });
    }

    // ─── Persistence ──────────────────────────────────────────────────────────
    function loadLastValue() {
        if (!window.FileStore) return;
        var data = window.FileStore.get('last_oscillation_value');
        if (data) {
            if (data.type) currentType = data.type;
            if (data.mode) currentMode = data.mode;
            if (data.state) {
                if (data.state.elastic && typeof data.state.elastic.stepLength === 'number') {
                    state.elastic.stepLength = clamp(data.state.elastic.stepLength, 0.08, 0.95);
                    state.elastic.attack     = data.state.elastic.attack || 1.0;
                    state.elastic.decay      = clamp(data.state.elastic.decay !== undefined ? data.state.elastic.decay : 0.45, 0.0, 0.95);
                    state.elastic.magnitude  = clamp(data.state.elastic.magnitude !== undefined ? data.state.elastic.magnitude : 0.5, 0.0, 0.95);
                }
                if (data.state.bounce && typeof data.state.bounce.firstStepLength === 'number') {
                    state.bounce.firstStepLength = clamp(data.state.bounce.firstStepLength, 0.1, 0.9);
                    state.bounce.bounciness      = clamp(data.state.bounce.bounciness !== undefined ? data.state.bounce.bounciness : 0.65, 0.1, 0.92);
                }
                if (data.state.cyclic && typeof data.state.cyclic.stepLength === 'number') {
                    state.cyclic.stepLength = clamp(data.state.cyclic.stepLength, 0.08, 0.95);
                    state.cyclic.sharpness  = data.state.cyclic.sharpness || 0.0;
                    state.cyclic.skew       = data.state.cyclic.skew !== undefined ? data.state.cyclic.skew : 0.5;
                    state.cyclic.decay      = clamp(data.state.cyclic.decay || 0.0, 0.0, 0.9);
                }
            }
            updateUIButtons();
        }
    }

    function saveLastValue() {
        if (!window.FileStore) return;
        window.FileStore.set('last_oscillation_value', {
            type: currentType,
            mode: currentMode,
            state: state
        });
    }

    function refresh() {
        if (!canvas || !ctx) return;
        render();
        loadPresets();
    }

    return {
        init: init,
        resize: resize,
        refresh: refresh
    };

})();

window.ElasticGraphModule = ElasticGraphModule;
