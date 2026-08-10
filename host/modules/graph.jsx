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

function _applyElastic(dataObj) {
    try {
        var hx = parseFloat(dataObj.x);
        var hy = parseFloat(dataObj.y);
        if (isNaN(hx)) hx = 0.40;
        if (isNaN(hy)) hy = 0.55;

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "{ok:false}";

        var props = _findSelectedProps();
        if (!props || props.length === 0) props = _getAllKeyframeProps(comp);
        if (!props || props.length === 0) return "{ok:false}";

        var applied = false;
        app.beginUndoGroup("Apply Elastic Bounce");

        for (var p = 0; p < props.length; p++) {
            var prop = props[p];
            try {
                var nk = 0;
                try { nk = prop.numKeys; } catch (e) { continue; }
                if (nk < 2) continue;

                var keys = _getKeysForProp(prop, comp);
                if (!keys || keys.length < 2) continue;
                keys.sort(function (a, b) { return a - b; });

                var dim = 1;
                try {
                    var sampleVal = prop.keyValue(keys[0]);
                    if (sampleVal instanceof Array) dim = sampleVal.length;
                } catch (e) {}

                try {
                    if (prop.expressionEnabled) prop.expressionEnabled = false;
                } catch (e) {}

                var targetTrough = Math.max(0.02, hx);
                var dampingRatio = 0.04 + hy * 0.32;
                var omega = (2.0 * Math.PI) / targetTrough;
                var decay = dampingRatio * omega;

                function elasticVal(t) {
                    if (t <= 0) return 0;
                    if (t >= 1) return 1;
                    var fade = Math.pow(1 - t * t, 2);
                    var env = Math.exp(-decay * t) * fade;
                    var wave = Math.cos(omega * t);
                    return 1 - (env * wave);
                }

                function findExtrema() {
                    var pts = [{ t: 0, val: 0 }];
                    var steps = 500;
                    var prevV = elasticVal(0);
                    var prevS = 0;
                    for (var i = 1; i <= steps; i++) {
                        var t = i / steps;
                        var curV = elasticVal(t);
                        var curS = curV - prevV;
                        if (i > 1 && curS !== 0 && prevS !== 0) {
                            if ((curS > 0 && prevS < 0) || (curS < 0 && prevS > 0)) {
                                var pk = ((i - 0.5) / steps);
                                pts.push({ t: pk, val: elasticVal(pk) });
                            }
                        }
                        prevS = curS;
                        prevV = curV;
                    }
                    pts.push({ t: 1, val: 1 });
                    return pts;
                }

                var extrema = findExtrema();

                var allNewTimes = [];
                var allNewValues = [];

                for (var k = 0; k < keys.length - 1; k++) {
                    var idx1 = keys[k];
                    var idx2 = keys[k + 1];
                    var t1 = prop.keyTime(idx1);
                    var t2 = prop.keyTime(idx2);
                    var dt = t2 - t1;
                    if (dt <= 0) continue;

                    var val1 = prop.keyValue(idx1);
                    var val2 = prop.keyValue(idx2);

                    for (var e = 0; e < extrema.length; e++) {
                        if (k > 0 && e === 0) continue;

                        var et = extrema[e].t;
                        var ev = extrema[e].val;

                        allNewTimes.push(t1 + et * dt);

                        if (dim === 1) {
                            allNewValues.push(val1 + (val2 - val1) * ev);
                        } else {
                            var arr = [];
                            for (var d = 0; d < dim; d++) {
                                arr.push(val1[d] + (val2[d] - val1[d]) * ev);
                            }
                            allNewValues.push(arr);
                        }
                    }
                }

                var totalKeys = prop.numKeys;
                for (var kk = totalKeys; kk >= 1; kk--) {
                    try { prop.removeKey(kk); } catch (e) {}
                }

                for (var n = 0; n < allNewTimes.length; n++) {
                    try {
                        prop.setValueAtTime(allNewTimes[n], allNewValues[n]);
                    } catch (e) {}
                }

                var finalNk = prop.numKeys;
                for (var m = 1; m <= finalNk; m++) {
                    try {
                        prop.setInterpolationTypeAtKey(m, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    } catch (e) {}
                }

                function elasticDeriv(t) {
                    var h = 0.0001;
                    var tm = Math.max(0, t - h);
                    var tp = Math.min(1, t + h);
                    return (elasticVal(tp) - elasticVal(tm)) / (tp - tm);
                }

                var influence = 33;
                for (var m = 1; m <= finalNk; m++) {
                    try {
                        var kt = prop.keyTime(m);
                        var overallT1 = prop.keyTime(1);
                        var overallT2 = prop.keyTime(finalNk);
                        var overallDt = overallT2 - overallT1;
                        if (overallDt <= 0) continue;
                        var tn = (kt - overallT1) / overallDt;
                        tn = Math.max(0, Math.min(1, tn));
                        var deriv = elasticDeriv(tn);

                        var firstVal = prop.keyValue(1);
                        var lastVal = prop.keyValue(finalNk);

                        if (dim === 1) {
                            var spd = (lastVal - firstVal) * deriv / overallDt;
                            var ease = new KeyframeEase(spd, influence);
                            prop.setTemporalEaseAtKey(m, [ease], [ease]);
                        } else {
                            var inArr = [];
                            var outArr = [];
                            for (var dd = 0; dd < dim; dd++) {
                                var dspd = (lastVal[dd] - firstVal[dd]) * deriv / overallDt;
                                inArr.push(new KeyframeEase(dspd, influence));
                                outArr.push(new KeyframeEase(dspd, influence));
                            }
                            prop.setTemporalEaseAtKey(m, inArr, outArr);
                        }
                    } catch (e) {}
                }

                applied = true;
            } catch (e) {
                continue;
            }
        }

        app.endUndoGroup();
        return applied ? "{ok:true}" : "{ok:false}";
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return "{ok:false}";
    }
}
