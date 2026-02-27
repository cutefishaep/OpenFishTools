function _readEase() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ error: "No Comp" });
    var props = comp.selectedProperties;
    var x1 = 0.33, y1 = 0, x2 = 0.67, y2 = 1;
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (prop.selectedKeys.length > 0) {
            var kIndex = prop.selectedKeys[0];
            if (kIndex < prop.numKeys) {
                var t1 = prop.keyTime(kIndex);
                var t2 = prop.keyTime(kIndex + 1);
                var dt = t2 - t1;
                if (dt > 0) {
                    var easeOut = prop.keyOutTemporalEase(kIndex);
                    var easeIn = prop.keyInTemporalEase(kIndex + 1);
                    if (easeOut.length > 0 && easeIn.length > 0) {
                        var val1 = prop.keyValue(kIndex);
                        var val2 = prop.keyValue(kIndex + 1);
                        var v1 = (val1 instanceof Array) ? val1[0] : val1;
                        var v2 = (val2 instanceof Array) ? val2[0] : val2;
                        var dVal = v2 - v1;
                        var avgRate = dVal / dt;
                        x1 = easeOut[0].influence / 100;
                        x2 = 1 - (easeIn[0].influence / 100);
                        if (Math.abs(avgRate) > 0.0001) {
                            y1 = (easeOut[0].speed / avgRate) * x1;
                            y2 = 1 + (easeIn[0].speed / avgRate) * (x2 - 1);
                        } else {
                            y1 = 0; y2 = 1;
                        }
                    }
                }
            }
            break;
        }
    }
    return JSON.stringify({ x1: x1, y1: y1, x2: x2, y2: y2 });
}

function _applyEase(dataObj) {
    var x1 = dataObj.x1;
    var y1 = dataObj.y1;
    var x2 = dataObj.x2;
    var y2 = dataObj.y2;
    var useOvershoot = dataObj.overshoot === true;
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var props = comp.selectedProperties;
    app.beginUndoGroup("Apply Graph Ease");
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop.canVaryOverTime) continue;
        var keys = prop.selectedKeys;
        if (keys.length < 2) continue;
        if (prop.expressionEnabled) {
            prop.expressionEnabled = false;
        }
        keys.sort(function (a, b) { return a - b; });
        for (var k = 0; k < keys.length - 1; k++) {
            var idx1 = keys[k];
            var idx2 = keys[k + 1];
            if (idx2 !== idx1 + 1) continue;
            var t1 = prop.keyTime(idx1);
            var t2 = prop.keyTime(idx2);
            var dt = t2 - t1;
            if (dt <= 0) continue;
            prop.setInterpolationTypeAtKey(idx1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            var inf1 = x1 * 100;
            var inf2 = (1 - x2) * 100;
            inf1 = Math.max(0.1, Math.min(100, inf1));
            inf2 = Math.max(0.1, Math.min(100, inf2));
            var safeX1 = (x1 <= 0) ? 0.001 : x1;
            var safeX2 = (x2 >= 1) ? 0.999 : x2;
            var m1 = y1 / safeX1;
            var m2 = (y2 - 1) / (safeX2 - 1);
            var currentEase = prop.keyOutTemporalEase(idx1);
            var dim = currentEase.length;
            var easeOut = [];
            var easeIn = [];
            for (var d = 0; d < dim; d++) {
                var val1 = prop.keyValue(idx1);
                var val2 = prop.keyValue(idx2);
                var v1 = (dim === 1) ? val1 : val1[d];
                var v2 = (dim === 1) ? val2 : val2[d];
                var dVal = v2 - v1;
                var avgRate = dVal / dt;
                var s1 = 0;
                var s2 = 0;
                if (Math.abs(avgRate) > 0.000001) {
                    s1 = m1 * avgRate;
                    s2 = m2 * avgRate;
                }
                easeOut.push(new KeyframeEase(s1, inf1));
                easeIn.push(new KeyframeEase(s2, inf2));
            }
            prop.setTemporalEaseAtKey(idx1, prop.keyInTemporalEase(idx1), easeOut);
            prop.setTemporalEaseAtKey(idx2, easeIn, prop.keyOutTemporalEase(idx2));
        }
    }
    app.endUndoGroup();
    return true;
}

function _applyMidWaveEase(prop) {
    if (prop.numKeys < 3) return;
    for (var i = 1; i <= 3; i++) {
        prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    }

    // Convert easing percentages from debug output to KeyframeEase objects
    prop.setTemporalEaseAtKey(1, [new KeyframeEase(0, 17)], [new KeyframeEase(0, 75)]);
    prop.setTemporalEaseAtKey(2, [new KeyframeEase(0, 0.1)], [new KeyframeEase(0, 0.1)]); // 0.1 avoids invalid arg errors
    prop.setTemporalEaseAtKey(3, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 17)]);
}
