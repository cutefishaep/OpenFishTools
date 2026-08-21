var _graphKeyHint = null;

function _findSelectedProps() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return [];
    var result = [];
    try {
        var props = comp.selectedProperties;
        if (props && props.length > 0) {
            for (var i = 0; i < props.length; i++) {
                result.push(props[i]);
            }
        }
    } catch (e) {}
    return result;
}

function _getAllKeyframeProps(comp) {
    var result = [];
    var selLayers = comp.selectedLayers;
    if (!selLayers || selLayers.length === 0) return result;
    for (var li = 0; li < selLayers.length; li++) {
        _walkProps(selLayers[li], result);
    }
    return result;
}

function _walkProps(prop, result) {
    var numKeys = 0;
    try { numKeys = prop.numKeys; } catch (e) { return; }
    if (numKeys > 0) {
        result.push(prop);
    }
    var numProps = 0;
    try { numProps = prop.numProperties; } catch (e) { return; }
    for (var i = 1; i <= numProps; i++) {
        try {
            var child = prop.property(i);
            if (child) _walkProps(child, result);
        } catch (e) {}
    }
}

function _getKeysForProp(prop, comp) {
    var sel = [];
    try {
        var sk = prop.selectedKeys;
        if (sk && sk.length > 0) sel = sk;
    } catch (e) {}

    if (sel.length === 1) {
        try {
            var selected = Number(sel[0]);
            var total = prop.numKeys;
            if (selected < total) sel.push(selected + 1);
            else if (selected > 1) sel.unshift(selected - 1);
        } catch (e) {}
    }

    if (sel.length === 0 && _graphKeyHint && _graphKeyHint.length >= 2) {
        try {
            var validHint = true;
            for (var h = 0; h < _graphKeyHint.length; h++) {
                if (_graphKeyHint[h] < 1 || _graphKeyHint[h] > prop.numKeys) {
                    validHint = false;
                    break;
                }
            }
            if (validHint) sel = _graphKeyHint.slice(0);
        } catch (hintError) {}
    }

    if (sel.length === 0) {
        var ct = comp.time;
        var nk = 0;
        try { nk = prop.numKeys; } catch (e) { return sel; }
        for (var k = 1; k < nk; k++) {
            try {
                var kt1 = prop.keyTime(k);
                var kt2 = prop.keyTime(k + 1);
                if (ct >= kt1 - 0.001 && ct <= kt2 + 0.001) {
                    sel.push(k);
                    sel.push(k + 1);
                    break;
                }
            } catch (e) {}
        }
        if (sel.length === 0) {
            try {
                var nk2 = prop.numKeys;
                if (nk2 >= 2) sel = [1, 2];
            } catch (e) {}
        }
    }

    sel.sort(function (a, b) { return a - b; });
    var uniqueSel = [];
    for (var u = 0; u < sel.length; u++) {
        var val = Number(sel[u]);
        if (u === 0 || val !== uniqueSel[uniqueSel.length - 1]) {
            uniqueSel.push(val);
        }
    }
    return uniqueSel;
}

function _graphPropsWithKeys(props, comp, minimumKeys) {
    var expanded = _expandGraphProps(props);
    var result = [];
    for (var i = 0; i < expanded.length; i++) {
        try {
            if (expanded[i] && expanded[i].numKeys >= minimumKeys) result.push(expanded[i]);
        } catch (e) {}
    }
    return result;
}

function _hasSelectedKeyframes(props) {
    for (var i = 0; i < props.length; i++) {
        try {
            if (props[i].selectedKeys && props[i].selectedKeys.length > 0) return true;
        } catch (e) {}
    }
    return false;
}

function _expandGraphProps(props) {
    var expanded = [];
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        var expandedPosition = false;
        try {
            if (prop.matchName === "ADBE Position") {
                var originalKeys = _getKeysForProp(prop, app.project.activeItem);
                if (originalKeys && originalKeys.length >= 2) _graphKeyHint = [originalKeys[0], originalKeys[1]];
                if (!prop.dimensionsSeparated && prop.numKeys > 0) prop.dimensionsSeparated = true;
                if (prop.dimensionsSeparated) {
                    var parent = prop.parentProperty;
                    var names = ["ADBE Position_0", "ADBE Position_1", "ADBE Position_2"];
                    for (var axis = 0; axis < names.length; axis++) {
                        try {
                            var separated = parent.property(names[axis]);
                            if (separated && separated.numKeys > 0) expanded.push(separated);
                        } catch (axisError) {}
                    }
                    expandedPosition = true;
                }
            }
        } catch (positionError) {}
        if (!expandedPosition) expanded.push(prop);
    }
    return expanded;
}

function _readEase() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ error: "No Comp" });
    var props = _findSelectedProps();
    if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
    var x1 = 0.33, y1 = 0, x2 = 0.67, y2 = 1;
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        try {
            var nk = 0;
            try { nk = prop.numKeys; } catch (e) { continue; }
            if (nk < 2) continue;
            var keys = _getKeysForProp(prop, comp);
            if (keys.length < 2) continue;
            var kIndex = keys[0];
            if (kIndex < 1 || kIndex >= nk) continue;
            var t1 = prop.keyTime(kIndex);
            var t2 = prop.keyTime(kIndex + 1);
            var dt = t2 - t1;
            if (dt <= 0) continue;
            var easeOut, easeIn;
            try {
                easeOut = prop.keyOutTemporalEase(kIndex);
                easeIn = prop.keyInTemporalEase(kIndex + 1);
            } catch (e) {
                continue;
            }
            if (!easeOut || easeOut.length === 0 || !easeIn || easeIn.length === 0) continue;
            var val1 = prop.keyValue(kIndex);
            var val2 = prop.keyValue(kIndex + 1);
            var v1 = (val1 instanceof Array) ? val1[0] : val1;
            var v2 = (val2 instanceof Array) ? val2[0] : val2;
            var dVal = v2 - v1;
            var avgRate = dVal / dt;
            x1 = easeOut[0].influence / 100;
            x2 = 1 - (easeIn[0].influence / 100);
            var safeX1 = (x1 <= 0) ? 0.001 : x1;
            var safeX2 = (x2 >= 1) ? 0.999 : x2;
            if (Math.abs(avgRate) > 0.0001) {
                y1 = (easeOut[0].speed / avgRate) * safeX1;
                y2 = 1 + (easeIn[0].speed / avgRate) * (safeX2 - 1);
            } else {
                y1 = 0; y2 = 1;
            }
            break;
        } catch (e) {
            continue;
        }
    }
    return JSON.stringify({ x1: x1, y1: y1, x2: x2, y2: y2 });
}

function _applyEase(dataObj) {
    _graphKeyHint = null;
    var x1 = dataObj.x1;
    var y1 = dataObj.y1;
    var x2 = dataObj.x2;
    var y2 = dataObj.y2;
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ok:false, err:"No Comp"});
    var props = _findSelectedProps();
    if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
    if (!props || props.length === 0) return JSON.stringify({ok:false, err:"No props"});
    var applied = false;
    app.beginUndoGroup("Apply Graph Ease");
    try {
        var expandedProps = [];
        for (var pi = 0; pi < props.length; pi++) {
            var pp = props[pi];
            var isSeparatedPos = false;
            try {
                if (pp.matchName === "ADBE Position") {
                    var easeOriginalKeys = _getKeysForProp(pp, comp);
                    if (easeOriginalKeys && easeOriginalKeys.length >= 2) _graphKeyHint = [easeOriginalKeys[0], easeOriginalKeys[1]];
                    if (!pp.dimensionsSeparated) {
                        pp.dimensionsSeparated = true;
                    }
                    var parentGroup = pp.parentProperty;
                    var subNames = ["ADBE Position_0", "ADBE Position_1", "ADBE Position_2"];
                    for (var si = 0; si < subNames.length; si++) {
                        try {
                            var subP = parentGroup.property(subNames[si]);
                            if (subP && subP.numKeys >= 2) expandedProps.push(subP);
                        } catch(e2) {}
                    }
                    isSeparatedPos = true;
                }
            } catch(e) {}
            if (!isSeparatedPos) expandedProps.push(pp);
        }
        props = expandedProps;
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            try {
                var nk = 0;
                try { nk = prop.numKeys; } catch (e) { continue; }
                if (nk < 2) continue;
                var keys = _getKeysForProp(prop, comp);
                if (!keys || keys.length < 2) continue;
                try {
                    if (prop.expressionEnabled) {
                        prop.expressionEnabled = false;
                    }
                } catch (e) {}
                keys.sort(function (a, b) { return a - b; });
                for (var k = 0; k < keys.length - 1; k++) {
                    var idx1 = keys[k];
                    var idx2 = keys[k + 1];
                    if (idx2 !== idx1 + 1) continue;
                    var t1, t2, dt;
                    try {
                        t1 = prop.keyTime(idx1);
                        t2 = prop.keyTime(idx2);
                        dt = t2 - t1;
                    } catch(e) { continue; }
                    if (dt <= 0) continue;

                    try {
                        prop.setInterpolationTypeAtKey(idx1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                        prop.setInterpolationTypeAtKey(idx2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    } catch(e) { continue; }

                    var inf1 = x1 * 100;
                    var inf2 = (1 - x2) * 100;
                    inf1 = Math.max(0.1, Math.min(100, inf1));
                    inf2 = Math.max(0.1, Math.min(100, inf2));

                    var dim = 1;
                    try {
                        var ce = prop.keyOutTemporalEase(idx1);
                        if (ce && ce.length > 0) dim = ce.length;
                    } catch (e) {
                        try {
                            var val = prop.keyValue(idx1);
                            if (val instanceof Array) dim = val.length;
                        } catch (e2) {}
                    }

                    var safeX1 = (x1 <= 0) ? 0.001 : x1;
                    var safeX2 = (x2 >= 1) ? 0.999 : x2;
                    var m1 = y1 / safeX1;
                    var m2 = (y2 - 1) / (safeX2 - 1);

                    var easeOut = [];
                    var easeIn = [];

                    for (var d = 0; d < dim; d++) {
                        var avgRate = 0;
                        try {
                            var val1 = prop.keyValue(idx1);
                            var val2 = prop.keyValue(idx2);
                            var v1 = (dim === 1 || !(val1 instanceof Array)) ? val1 : val1[d];
                            var v2 = (dim === 1 || !(val2 instanceof Array)) ? val2 : val2[d];
                            var dVal = v2 - v1;
                            avgRate = dVal / dt;
                        } catch(e) {}

                        var s1 = 0;
                        var s2 = 0;
                        if (Math.abs(avgRate) > 0.000001) {
                            s1 = m1 * avgRate;
                            s2 = m2 * avgRate;
                        }

                        easeOut.push(new KeyframeEase(s1, inf1));
                        easeIn.push(new KeyframeEase(s2, inf2));
                    }

                    try {
                        prop.setTemporalEaseAtKey(idx1, prop.keyInTemporalEase(idx1), easeOut);
                        prop.setTemporalEaseAtKey(idx2, easeIn, prop.keyOutTemporalEase(idx2));
                        applied = true;
                    } catch (e) {
                    }
                }
            } catch (e) {
                continue;
            }
        }
    } finally {
        app.endUndoGroup();
    }
    return JSON.stringify({ok: applied});
}

function _applyMidWaveEase(prop) {
    if (prop.numKeys < 3) return;
    for (var i = 1; i <= 3; i++) {
        prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    }
    prop.setTemporalEaseAtKey(1, [new KeyframeEase(0, 17)], [new KeyframeEase(0, 75)]);
    prop.setTemporalEaseAtKey(2, [new KeyframeEase(0, 0.1)], [new KeyframeEase(0, 0.1)]);
    prop.setTemporalEaseAtKey(3, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 17)]);
}

function _readVelocity() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ error: "No Comp" });
    var props = _findSelectedProps();
    if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
    if (!props || props.length === 0) return JSON.stringify({ error: "No property selected" });
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        try {
            var nk = 0;
            try { nk = prop.numKeys; } catch (e) { continue; }
            if (nk < 1) continue;
            var keys = _getKeysForProp(prop, comp);
            if (keys.length === 0) continue;
            var kIdx = keys[0];
            if (kIdx < 1 || kIdx > nk) continue;
            var inEase = prop.keyInTemporalEase(kIdx);
            var outEase = prop.keyOutTemporalEase(kIdx);
            if (!inEase || inEase.length === 0 || !outEase || outEase.length === 0) continue;
            return JSON.stringify({
                inSpeed: inEase[0].speed,
                inInflu: inEase[0].influence,
                outSpeed: outEase[0].speed,
                outInflu: outEase[0].influence
            });
        } catch (e) {
            continue;
        }
    }
    return JSON.stringify({ error: "No Key selected" });
}

function _applyVelocity(dataStr) {
    try {
        _graphKeyHint = null;
        var data = JSON.parse(dataStr);
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "false";

        var props = _findSelectedProps();
        if (!props || props.length === 0) return JSON.stringify({ ok: false, error: "Select a property and keyframe in the Speed Graph first." });
        if (!_hasSelectedKeyframes(props)) return JSON.stringify({ ok: false, error: "Select at least one keyframe in the Speed Graph first." });
        props = _graphPropsWithKeys(props, comp, 1);
        if (!props || props.length === 0) return JSON.stringify({ ok: false, error: "No selected keyframe property is available." });

        var inS = parseFloat(data.inSpeed); if (isNaN(inS)) inS = 0;
        var inI = parseFloat(data.inInflu); if (isNaN(inI)) inI = 33.3;
        var outS = parseFloat(data.outSpeed); if (isNaN(outS)) outS = 0;
        var outI = parseFloat(data.outInflu); if (isNaN(outI)) outI = 33.3;

        inI = Math.max(0.1, Math.min(100, inI));
        outI = Math.max(0.1, Math.min(100, outI));

        app.beginUndoGroup("Apply Velocity");
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            try {
                var nk = 0;
                try { nk = prop.numKeys; } catch (e) { continue; }
                if (nk < 1) continue;

                var keys = _getKeysForProp(prop, comp);
                if (!keys || keys.length === 0) continue;

                var inE = new KeyframeEase(inS, inI);
                var outE = new KeyframeEase(outS, outI);

                var dim = 1;
                try {
                    var val = prop.value;
                    if (val instanceof Array) {
                        dim = val.length;
                    } else if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) {
                        dim = 2;
                    } else if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                        dim = 3;
                    }
                } catch (e) {}

                var inArray = [], outArray = [];
                for (var d = 0; d < dim; d++) {
                    inArray.push(inE);
                    outArray.push(outE);
                }

                for (var k = 0; k < keys.length; k++) {
                    prop.setTemporalEaseAtKey(keys[k], inArray, outArray);
                }
            } catch (e) {
                continue;
            }
        }
        app.endUndoGroup();
        return "true";
    } catch (e) {
        if (app.isInUndoGroup) app.endUndoGroup();
        return "false";
    }
}

function _debugProps() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ error: "No Comp" });
    var info = { compName: comp.name, time: comp.time, selectedLayers: [], allKeyframeProps: [] };
    try {
        var sl = comp.selectedLayers;
        info.selectedLayersCount = sl ? sl.length : 0;
        if (sl) {
            for (var j = 0; j < sl.length; j++) {
                info.selectedLayers.push(sl[j].name);
            }
        }
        var allProps = _getAllKeyframeProps(comp);
        info.allKeyframePropsCount = allProps.length;
        for (var i = 0; i < allProps.length; i++) {
            try {
                var p = allProps[i];
                var pi = { name: p.name, numKeys: p.numKeys };
                try { pi.selectedKeys = p.selectedKeys; } catch (e) { pi.selectedKeys = "err"; }
                try {
                    var sk = p.selectedKeys;
                    pi.hasSelectedKeys = sk && sk.length > 0;
                } catch (e) {
                    pi.hasSelectedKeys = false;
                }
                info.allKeyframeProps.push(pi);
            } catch (e) {}
        }
    } catch (e) {
        info.error = e.toString();
    }
    return JSON.stringify(info);
}

function _applyElastic(dataObj) {
    try {
        _graphKeyHint = null;
        if (typeof dataObj === 'string') {
            try { dataObj = JSON.parse(dataObj); } catch (parseErr) {}
        }
        var type = (dataObj && dataObj.type) ? dataObj.type : 'elastic';
        var mode = (dataObj && dataObj.mode) ? dataObj.mode : 'in';
        var params = (dataObj && dataObj.params) ? dataObj.params : {};

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "{ok:false}";

        var props = _findSelectedProps();
        if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
        if (!props || props.length === 0) return "{ok:false}";

        // 1. Elastic Easing (Alight Motion ElasticEasing)
        function evalElastic(t, sL, decay, mag) {
            if (t <= 0) return 0.0;
            if (t >= 1) return 1.0;
            var stepLength = (typeof sL === 'number' && !isNaN(sL)) ? Math.max(0.05, Math.min(0.95, sL)) : 0.35;
            var d = (typeof decay === 'number' && !isNaN(decay) && decay <= 1.0) ? Math.max(0.0, Math.min(0.95, decay)) : 0.45;
            var m = (typeof mag === 'number' && !isNaN(mag)) ? Math.max(0.1, Math.min(3.0, mag)) : 1.0;
            var exp = 1.0 + 15.0 * (d * d);

            function basic(time) {
                var omega = (Math.PI * time) / stepLength;
                var tC = Math.max(0.005, Math.min(1.0, time));
                var env = Math.abs(Math.pow(1.0 - tC, exp));
                return Math.cos(omega) * env;
            }

            if (t < stepLength) {
                var v0 = 1.0 - (basic(stepLength) * m);
                var v1 = (1.0 - Math.cos((Math.PI * t) / stepLength)) / 2.0;
                var normT = t / stepLength;
                var powVal = 1.0 - Math.pow(normT, 3.0);
                var baseVal = 1.0 - (basic(t) * m);
                return (v1 * v0 * powVal) + (baseVal * (1.0 - powVal));
            } else {
                return 1.0 - (basic(t) * m);
            }
        }

        // 2. Bounce Easing (Alight Motion BounceEasing)
        function evalBounce(t, firstStepLength, bounciness, maxBounces) {
            var fStep = (typeof firstStepLength === 'number' && !isNaN(firstStepLength)) ? Math.max(0.05, Math.min(0.95, firstStepLength)) : 0.45;
            var bnc = (typeof bounciness === 'number' && !isNaN(bounciness)) ? Math.max(0.05, Math.min(0.95, bounciness)) : 0.65;
            var maxB = (typeof maxBounces === 'number' && !isNaN(maxBounces)) ? Math.max(1, Math.min(10, Math.round(maxBounces))) : 4;
            if (fStep <= 0) return 1.0;
            if (t <= 0) return 0.0;
            if (t >= 1) return 1.0;

            var tShifted = t + (fStep / 2.0);
            var step = fStep;
            var height = 1.0;
            var start = 0.0;
            var bounceCount = 0;

            while (tShifted > start + step) {
                start += step;
                step *= bnc;
                height *= bnc;
                bounceCount++;
                if (bounceCount >= maxB || height < 0.005) return 1.0;
            }

            var norm = (tShifted - start) / step;
            var x = Math.abs((norm - 0.5) * 2.0);
            return (1.0 - height) + (x * x) * height;
        }

        // 3. Cyclic Easing (Alight Motion CyclicEasing)
        function evalCyclic(t, stepLength, sharpness, skew, decay) {
            if (t <= 0) return 0.0;
            if (t >= 1) return 1.0;
            var sL = (typeof stepLength === 'number' && !isNaN(stepLength)) ? Math.max(0.005, Math.min(0.95, stepLength)) : 0.35;
            var shp = (typeof sharpness === 'number' && !isNaN(sharpness)) ? Math.max(0.0, Math.min(1.0, sharpness)) : 0.0;
            var skw = Math.max(0.001, Math.min(0.999, (typeof skew === 'number' && !isNaN(skew)) ? skew : 0.5));
            var dcy = (typeof decay === 'number' && !isNaN(decay)) ? Math.max(0.0, Math.min(0.9, decay)) : 0.0;

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

        function calculateCurve(t) {
            var raw;
            if (type === 'bounce') {
                raw = evalBounce(mode === 'out' ? 1.0 - t : t, params.firstStepLength, params.bounciness, params.maxBounces);
            } else if (type === 'cyclic') {
                raw = evalCyclic(mode === 'out' ? 1.0 - t : t, params.stepLength, params.sharpness, params.skew, params.decay);
            } else {
                raw = evalElastic(mode === 'out' ? 1.0 - t : t, params.stepLength, params.decay, params.magnitude);
            }
            return (mode === 'out') ? 1.0 - raw : raw;
        }

        function elasticVal(t) {
            return calculateCurve(t);
        }

        function findExtrema() {
            var pts = [];

            if (type === 'bounce') {
                var fStep = (typeof params.firstStepLength === 'number' && !isNaN(params.firstStepLength)) ? Math.max(0.05, Math.min(0.95, params.firstStepLength)) : 0.45;
                var bnc = (typeof params.bounciness === 'number' && !isNaN(params.bounciness)) ? Math.max(0.05, Math.min(0.95, params.bounciness)) : 0.65;
                var maxB = (typeof params.maxBounces === 'number' && !isNaN(params.maxBounces)) ? Math.max(1, Math.min(10, Math.round(params.maxBounces))) : 4;

                // 1. Initial point
                pts.push({ t: 0.0, val: elasticVal(0.0), isFloor: (mode === 'out'), isApex: (mode === 'in') });

                var curTime = fStep / 2.0;
                var step = fStep * bnc;
                var height = bnc;
                var bounces = 0;

                // First floor contact
                if (curTime < 0.98) {
                    var tNorm = (mode === 'out') ? 1.0 - curTime : curTime;
                    pts.push({ t: tNorm, val: elasticVal(tNorm), isFloor: true, isApex: false });
                }

                while (curTime + step <= 0.98 && bounces < maxB && height > 0.02) {
                    var apexT = curTime + (step / 2.0);
                    var floorT = curTime + step;

                    var normApex = (mode === 'out') ? 1.0 - apexT : apexT;
                    var normFloor = (mode === 'out') ? 1.0 - floorT : floorT;

                    pts.push({ t: normApex, val: elasticVal(normApex), isFloor: false, isApex: true });
                    pts.push({ t: normFloor, val: elasticVal(normFloor), isFloor: true, isApex: false });

                    curTime += step;
                    step *= bnc;
                    height *= bnc;
                    bounces++;
                }

                // Final destination
                pts.push({ t: 1.0, val: elasticVal(1.0), isFloor: (mode === 'in'), isApex: (mode === 'out') });
                pts.sort(function (a, b) { return a.t - b.t; });
                return pts;
            }

            // General numerical extrema for Elastic and Cyclic
            pts.push({ t: 0.0, val: elasticVal(0.0), isApex: false, isFloor: false });
            var steps = 600;
            var prevV = elasticVal(0.0001);
            var prevS = 0.0;
            for (var ii = 1; ii < steps; ii++) {
                var tt = ii / steps;
                var curV = elasticVal(tt);
                var curS = curV - prevV;
                if (ii > 1 && curS !== 0 && prevS !== 0) {
                    if ((curS > 0 && prevS < 0) || (curS < 0 && prevS > 0)) {
                        var pk = (ii - 0.5) / steps;
                        var pkVal = elasticVal(pk);
                        var lastPt = pts[pts.length - 1];
                        if (Math.abs(pkVal - lastPt.val) > 0.015 && pk < 0.96) {
                            pts.push({ t: pk, val: pkVal, isApex: true, isFloor: false });
                        }
                    }
                }
                prevS = curS;
                prevV = curV;
            }
            pts.push({ t: 1.0, val: elasticVal(1.0), isApex: false, isFloor: false });
            return pts;
        }

        var extrema = findExtrema();

        var applied = false;
        app.beginUndoGroup('Apply ' + type.charAt(0).toUpperCase() + type.slice(1) + ' ' + (mode === 'out' ? 'Out' : 'In'));

        for (var pi = 0; pi < props.length; pi++) {
            var prop = props[pi];
            try {
                var nk = 0;
                try { nk = prop.numKeys; } catch (e) { continue; }
                if (nk < 2) continue;

                var keys = _getKeysForProp(prop, comp);
                if (!keys || keys.length < 2) continue;
                keys.sort(function (a, b) { return a - b; });

                var isSpatial = false;
                try {
                    if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                        prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                        isSpatial = true;
                    }
                } catch (spErr) {}

                var dim = 1;
                try {
                    var sampleVal = prop.keyValue(keys[0]);
                    if (sampleVal instanceof Array) dim = sampleVal.length;
                } catch (e) {}

                try {
                    if (prop.expressionEnabled) prop.expressionEnabled = false;
                } catch (e) {}

                // Extract all selected key times and values upfront
                var keyTimes = [];
                var keyValues = [];
                for (var ki = 0; ki < keys.length; ki++) {
                    keyTimes.push(prop.keyTime(keys[ki]));
                    keyValues.push(prop.keyValue(keys[ki]));
                }

                for (var k = 0; k < keyTimes.length - 1; k++) {
                    var t1 = keyTimes[k];
                    var t2 = keyTimes[k + 1];
                    var dt = t2 - t1;
                    if (dt <= 0) continue;

                    var val1 = keyValues[k];
                    var val2 = keyValues[k + 1];

                    // 1. Remove only pre-existing keys strictly between t1 and t2
                    for (var rki = prop.numKeys; rki >= 1; rki--) {
                        var rkt = prop.keyTime(rki);
                        if (rkt > t1 + 0.001 && rkt < t2 - 0.001) {
                            try { prop.removeKey(rki); } catch (rmErr) {}
                        }
                    }

                    // 2. Insert intermediate peaks & valleys between t1 and t2
                    for (var e = 1; e < extrema.length - 1; e++) {
                        var et = extrema[e].t;
                        var ev = extrema[e].val;
                        var newT = t1 + et * dt;
                        var newVal;

                        if (dim === 1) {
                            newVal = val1 + (val2 - val1) * ev;
                        } else {
                            newVal = [];
                            for (var d = 0; d < dim; d++) {
                                newVal.push(val1[d] + (val2[d] - val1[d]) * ev);
                            }
                        }

                        try {
                            prop.setValueAtTime(newT, newVal);
                        } catch (setErr) {}
                    }
                }

                var totalT1 = keyTimes[0];
                var totalT2 = keyTimes[keyTimes.length - 1];

                // 3. Set Spatial Tangents to linear across [totalT1, totalT2] to prevent wobble
                if (isSpatial) {
                    for (var sk = 1; sk <= prop.numKeys; sk++) {
                        var skt = prop.keyTime(sk);
                        if (skt >= totalT1 - 0.001 && skt <= totalT2 + 0.001) {
                            try {
                                prop.setSpatialAutoBezierAtKey(sk, false);
                                prop.setSpatialContinuousAtKey(sk, false);
                                if (dim === 2) {
                                    prop.setSpatialTangentsAtKey(sk, [0, 0], [0, 0]);
                                } else if (dim === 3) {
                                    prop.setSpatialTangentsAtKey(sk, [0, 0, 0], [0, 0, 0]);
                                }
                            } catch (tangentErr) {}
                        }
                    }
                }

                // 4. Set Physics-Accurate Dynamic Easing:
                // - Bounce: Sharp LINEAR V-cusp on floor impacts (no deceleration/float), Smooth BEZIER on apexes!
                // - Elastic & Cyclic: Smooth harmonic Easy Ease (F9)
                var easeDim = isSpatial ? 1 : dim;
                var apexEaseObj = new KeyframeEase(0, 45.0);
                var standardEaseObj = new KeyframeEase(0, 33.333333);

                var apexInArr = [];
                var apexOutArr = [];
                var stdInArr = [];
                var stdOutArr = [];
                for (var ed = 0; ed < easeDim; ed++) {
                    apexInArr.push(apexEaseObj);
                    apexOutArr.push(apexEaseObj);
                    stdInArr.push(standardEaseObj);
                    stdOutArr.push(standardEaseObj);
                }

                for (var bk = 1; bk <= prop.numKeys; bk++) {
                    var bkt = prop.keyTime(bk);
                    if (bkt >= totalT1 - 0.001 && bkt <= totalT2 + 0.001) {
                        try {
                            if (type === 'bounce') {
                                var matchedPt = null;
                                for (var kpi = 0; kpi < keyTimes.length - 1; kpi++) {
                                    var segT1 = keyTimes[kpi];
                                    var segDt = keyTimes[kpi + 1] - segT1;
                                    for (var epi = 0; epi < extrema.length; epi++) {
                                        var targetT = segT1 + extrema[epi].t * segDt;
                                        if (Math.abs(bkt - targetT) < 0.004) {
                                            matchedPt = extrema[epi];
                                            break;
                                        }
                                    }
                                    if (matchedPt) break;
                                }

                                if (matchedPt && matchedPt.isFloor) {
                                    // Sharp physical impact (Linear - No floaty slow down!)
                                    prop.setInterpolationTypeAtKey(
                                        bk,
                                        KeyframeInterpolationType.LINEAR,
                                        KeyframeInterpolationType.LINEAR
                                    );
                                } else {
                                    // Smooth apex peak (Parabolic gravity ease)
                                    prop.setInterpolationTypeAtKey(
                                        bk,
                                        KeyframeInterpolationType.BEZIER,
                                        KeyframeInterpolationType.BEZIER
                                    );
                                    prop.setTemporalEaseAtKey(bk, apexInArr, apexOutArr);
                                }
                            } else {
                                // Elastic & Cyclic: Standard Easy Ease (F9)
                                prop.setInterpolationTypeAtKey(
                                    bk,
                                    KeyframeInterpolationType.BEZIER,
                                    KeyframeInterpolationType.BEZIER
                                );
                                prop.setTemporalEaseAtKey(bk, stdInArr, stdOutArr);
                            }
                        } catch (easeErr) {}
                    }
                }

                applied = true;
            } catch (propErr) {
                continue;
            }
        }

        app.endUndoGroup();
        return applied ? '{ok:true}' : '{ok:false}';
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return '{ok:false}';
    }
}

