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
                    if (sel.length >= 2) break;
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
    return sel;
}

function _readEase() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ error: "No Comp" });
    var props = _findSelectedProps();
    if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
    var x1 = 0.33, y1 = 0, x2 = 0.67, y2 = 1;
    var found = false;
    var flip = false;
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
            flip = dVal < 0;
            var avgRate = dVal / dt;
            x1 = easeOut[0].influence / 100;
            x2 = 1 - (easeIn[0].influence / 100);
            if (Math.abs(avgRate) > 0.0001) {
                y1 = (easeOut[0].speed / avgRate) * x1;
                y2 = 1 + (easeIn[0].speed / avgRate) * (x2 - 1);
            } else {
                y1 = 0; y2 = 1;
            }
            found = true;
        } catch (e) {
            continue;
        }
        if (found) break;
    }
    if (!found) {
        return JSON.stringify({ error: true, message: "No editable keyframes found.\n\nMake sure:\n1. A layer with keyframes is selected\n2. The playhead is between 2 keyframes" });
    }
    return JSON.stringify({ x1: x1, y1: y1, x2: x2, y2: y2, flip: flip });
}

function _applyEase(dataObj) {
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
    var debugLog = [];
    app.beginUndoGroup("Apply Graph Ease");
    try {
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            var propName = "";
            try { propName = prop.name; } catch(e) {}
            try {
                var nk = 0;
                try { nk = prop.numKeys; } catch (e) { debugLog.push(propName+": numKeys fail"); continue; }
                if (nk < 2) { debugLog.push(propName+": numKeys<2"); continue; }
                var keys = _getKeysForProp(prop, comp);
                debugLog.push(propName+": keys=" + JSON.stringify(keys));
                if (!keys || keys.length < 2) { debugLog.push(propName+": no 2 keys"); continue; }
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
                    } catch(e) { debugLog.push(propName+": keyTime fail"); continue; }
                    if (dt <= 0) continue;
                    var flipY = false;
                    try {
                        var kv1 = prop.keyValue(idx1);
                        var kv2 = prop.keyValue(idx2);
                        var av1 = (kv1 instanceof Array) ? kv1[0] : kv1;
                        var av2 = (kv2 instanceof Array) ? kv2[0] : kv2;
                        flipY = (av2 - av1) < 0;
                    } catch (e) {}
                    var yy1 = flipY ? (1 - y1) : y1;
                    var yy2 = flipY ? (1 - y2) : y2;
                    try {
                        prop.setInterpolationTypeAtKey(idx1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                        prop.setInterpolationTypeAtKey(idx2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    } catch(e) { debugLog.push(propName+": setInterp fail: "+e.toString()); continue; }
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
                    var easeOut = [];
                    var easeIn = [];
                    var canSetEase = true;
                    var oldOut1 = null, oldIn2 = null;
                    try { oldOut1 = prop.keyOutTemporalEase(idx1); } catch(e) {}
                    try { oldIn2 = prop.keyInTemporalEase(idx2); } catch(e) {}
                    var canReadEase = (oldOut1 && oldOut1.length > 0 && oldIn2 && oldIn2.length > 0);
                    for (var d = 0; d < dim; d++) {
                        var curSpeed1 = 0, curSpeed2 = 0;
                        if (oldOut1 && oldOut1.length > d) curSpeed1 = oldOut1[d].speed;
                        if (oldIn2 && oldIn2.length > d) curSpeed2 = oldIn2[d].speed;
                        var s1, s2;
                        if (canReadEase) {
                            var v1 = 0, v2 = 0;
                            try {
                                var val1 = prop.keyValue(idx1);
                                var val2 = prop.keyValue(idx2);
                                v1 = (dim === 1) ? val1 : val1[d];
                                v2 = (dim === 1) ? val2 : val2[d];
                            } catch(e) {}
                            var dVal = v2 - v1;
                            var avgRate = dVal / dt;
                            var safeX1 = (x1 <= 0) ? 0.001 : x1;
                            var safeX2 = (x2 >= 1) ? 0.999 : x2;
                            var m1 = yy1 / safeX1;
                            var m2 = (yy2 - 1) / (safeX2 - 1);
                            s1 = (Math.abs(avgRate) > 0.000001) ? m1 * avgRate : 0;
                            s2 = (Math.abs(avgRate) > 0.000001) ? m2 * avgRate : 0;
                        } else {
                            s1 = curSpeed1;
                            s2 = curSpeed2;
                        }
                        easeOut.push(new KeyframeEase(s1, inf1));
                        easeIn.push(new KeyframeEase(s2, inf2));
                    }
                    if (canSetEase) {
                        var easeApplied = false;
                        try {
                            var oldIn1, oldOut2;
                            try { oldIn1 = prop.keyInTemporalEase(idx1); } catch (e) { oldIn1 = easeOut; }
                            try { oldOut2 = prop.keyOutTemporalEase(idx2); } catch (e) { oldOut2 = easeIn; }
                            prop.setTemporalEaseAtKey(idx1, oldIn1, easeOut);
                            prop.setTemporalEaseAtKey(idx2, easeIn, oldOut2);
                            easeApplied = true;
                            debugLog.push(propName+": ease applied OK");
                        } catch (e) {
                            debugLog.push(propName+": setTemporalEase fail: " + e.toString());
                        }
                        if (easeApplied) applied = true;
                    } else {
                        applied = true;
                    }
                }
            } catch (e) {
                debugLog.push(propName+": outer error: " + e.toString());
                continue;
            }
        }
    } finally {
        app.endUndoGroup();
    }
    return JSON.stringify({ok: applied, debug: debugLog});
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
        var data = JSON.parse(dataStr);
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "false";

        var props = _findSelectedProps();
        if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
        if (!props || props.length === 0) return "true";

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
