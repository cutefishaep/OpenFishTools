function _applyTransition(propName, directionType) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length == 0) return "Please select at least one layer.";
    app.beginUndoGroup("Apply Transition: " + directionType);
    var dur = 15 * comp.frameDuration;
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        try {
            var prop;
            if (propName === "ADBE Opacity") {
                prop = layer.transform ? layer.transform.opacity : null;
            } else if (propName === "ADBE Scale") {
                prop = layer.transform ? layer.transform.scale : null;
            }
            if (!prop) continue;
            var inP = layer.inPoint;
            var outP = layer.outPoint;
            var is1D = (propName === "ADBE Opacity");
            var outerValue = is1D ? 0 : [0, 0, 0];
            var curDefault;
            if (prop.numKeys === 0) {
                curDefault = prop.value;
            } else {
                var midTime = inP + (outP - inP) / 2;
                curDefault = prop.valueAtTime(midTime, true);
            }
            if (!is1D) {
                if (curDefault.length === 2) {
                    outerValue = [0, 0];
                }
            }
            var t1, t2;
            if (directionType === "IN") {
                t1 = inP;
                t2 = inP + dur;
            } else if (directionType === "OUT") {
                t1 = outP - dur;
                t2 = outP;
            }
            var v1 = (directionType === "IN") ? outerValue : curDefault;
            var v2 = (directionType === "IN") ? curDefault : outerValue;
            prop.setValueAtTime(t1, v1);
            prop.setValueAtTime(t2, v2);
            var easeInObj = new KeyframeEase(0, 33.33333);
            var easeOutObj = new KeyframeEase(0, 33.33333);
            var easeArr = [];
            var easeOutArr = [];
            var easeLen = is1D ? 1 : curDefault.length;
            for (var d = 0; d < Math.min(easeLen, 3); d++) {
                easeArr.push(easeInObj);
                easeOutArr.push(easeOutObj);
            }
            var k1Idx = prop.nearestKeyIndex(t1);
            if (prop.keyTime(k1Idx) === t1) {
                if (is1D) {
                    prop.setTemporalEaseAtKey(k1Idx, [easeInObj], [easeOutObj]);
                } else {
                    prop.setTemporalEaseAtKey(k1Idx, easeArr, easeOutArr);
                }
            }
            var k2Idx = prop.nearestKeyIndex(t2);
            if (prop.keyTime(k2Idx) === t2) {
                if (is1D) {
                    prop.setTemporalEaseAtKey(k2Idx, [easeInObj], [easeOutObj]);
                } else {
                    prop.setTemporalEaseAtKey(k2Idx, easeArr, easeOutArr);
                }
            }
        } catch (err) {
            app.endUndoGroup();
            return "ERROR:" + err.toString();
        }
    }
    app.endUndoGroup();
    return true;
}
function _TWIX() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return false;
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Apply Twixtor Velocity");
    try {
        var twix = layer.Effects.addProperty("Twixtor");
        if (!twix) {
            alert("Twixtor effect not found. Please make sure it's installed.");
            return false;
        }
        for (var i = 1; i <= twix.numProperties; i++) {
            var p = twix.property(i);
            if (p.name === "In FPS is Out FPS") p.setValue(false);
            if (p.name === "Input: Frame Rate") p.setValue(comp.frameRate);
        }
        var speedProp = null;
        for (var j = 1; j <= twix.numProperties; j++) {
            if (twix.property(j).name === "Speed %") {
                speedProp = twix.property(j);
                break;
            }
        }
        if (speedProp) {
            var markers = _getLayerMarkers(layer);
            if (markers.length > 1) {
                for (var k = 0; k < markers.length; k++) {
                    speedProp.setValueAtTime(markers[k], 100);
                    if (k < markers.length - 1) {
                        var mid = (markers[k] + markers[k + 1]) / 2;
                        speedProp.setValueAtTime(mid, 20);
                    }
                }
            } else {
                speedProp.setValue(100);
            }
        }
        return true;
    } catch (err) {
        return false;
    } finally {
        app.endUndoGroup();
    }
}
function _TMRE() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return false;
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Time Remap Velocity");
    try {
        layer.timeRemapEnabled = true;
        var tr = layer.property("ADBE Time Remapping");
        var markers = _getLayerMarkers(layer);
        if (markers.length > 0) {
            for (var i = 0; i < markers.length; i++) {
                var t = markers[i];
                var val = tr.valueAtTime(t, true);
                tr.setValueAtTime(t, val);
            }
            for (var j = 1; j < tr.numKeys; j++) {
                var t1 = tr.keyTime(j);
                var t2 = tr.keyTime(j + 1);
                var v1 = tr.keyValue(j);
                var v2 = tr.keyValue(j + 1);
                var avgSpeed = Math.abs((v2 - v1) / (t2 - t1));
                var targetSpeed = avgSpeed * 4;
                var easeOut = new KeyframeEase(targetSpeed, 20);
                var easeIn = new KeyframeEase(targetSpeed, 20);
                tr.setTemporalEaseAtKey(j, tr.keyInTemporalEase(j), [easeOut]);
                tr.setTemporalEaseAtKey(j + 1, [easeIn], tr.keyOutTemporalEase(j + 1));
            }
        }
        layer.frameBlended = true;
        layer.frameBlendType = FrameBlendType.PIXEL_MOTION;
        return true;
    } catch (err) {
        return false;
    } finally {
        app.endUndoGroup();
    }
}
function _GHST() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var layer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Ghost Effect");
    try {
        var curTime = comp.time;
        var duration = 25 * comp.frameDuration;
        var adj = comp.layers.addSolid([0, 0, 0], "Ghost Effect", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.startTime = curTime;
        adj.outPoint = curTime + duration;
        adj.label = 5;
        if (layer) adj.moveBefore(layer);
        var transformEffect = adj.Effects.addProperty("ADBE Geometry2");
        transformEffect.property(3).setValue(true);
        var scale = transformEffect.property(4);
        scale.setValueAtTime(curTime, 100);
        scale.setValueAtTime(curTime + duration, 250);
        var opacity = adj.property("ADBE Transform Group").property("ADBE Opacity");
        opacity.setValueAtTime(curTime, 100);
        opacity.setValueAtTime(curTime + duration, 0);
        var easeOutFast = new KeyframeEase(0, 0.1);
        var easeInSlow = new KeyframeEase(0, 95);
        scale.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [easeOutFast]);
        scale.setTemporalEaseAtKey(2, [easeInSlow], [new KeyframeEase(0, 33)]);
        opacity.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [easeOutFast]);
        opacity.setTemporalEaseAtKey(2, [easeInSlow], [new KeyframeEase(0, 33)]);
        return true;
    } catch (err) {
        alert("Ghost Effect Error: " + err.toString());
        return false;
    } finally {
        app.endUndoGroup();
    }
}
function _EXPO() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return '{"error":true,"tool":"EXPO","type":"warn","message":"Please select a layer with markers."}';
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Exposure Flash Beat");
    try {
        var adj = comp.layers.addSolid([0, 0, 0], "Exposure Flash Beat", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.moveBefore(layer);
        adj.label = 5;
        var fx = adj.property("ADBE Effect Parade") || adj.property("ADBE Effect Group") || adj.Effects;
        var maxExpoCtrl = fx.addProperty("ADBE Slider Control");
        maxExpoCtrl.name = "Max Exposure";
        maxExpoCtrl.property("ADBE Slider Control-0001").setValue(1.5);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(5.0);
        var expo = fx.addProperty("ADBE Exposure");
        if (!expo) {
            expo = fx.addProperty("Exposure");
        }
        var masterExpo = null;
        for (var idx = 1; idx <= expo.numProperties; idx++) {
            var prop = expo.property(idx);
            if (prop && prop.name === "Exposure" && prop.canSetExpression) {
                masterExpo = prop;
                break;
            }
        }
        if (!masterExpo && expo.numProperties >= 3) {
            masterExpo = expo.property(3);
        }
        if (!masterExpo) {
            return '{"error":true,"tool":"EXPO","type":"error","message":"Could not find Exposure property."}';
        }
        var expr = [
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "maxExpo = effect(\"Max Exposure\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "if (m && m.numKeys > 0) {",
            "    n = 0;",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) n--;",
            "    if (n > 0) {",
            "        t = time - m.key(n).time;",
            "        maxExpo / Math.exp(t * decay);",
            "    } else {",
            "        0;",
            "    }",
            "} else {",
            "    0;",
            "}"
        ].join("\n");
        masterExpo.expression = expr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        adj.selected = true;
        return true;
    } catch (err) {
        return '{"error":true,"tool":"EXPO","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}
function _LENS() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return '{"error":true,"tool":"LENS","type":"warn","message":"Please select a layer with markers."}';
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Lens Blur Beat");
    try {
        var adj = comp.layers.addSolid([0, 0, 0], "Lens Blur Beat", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.moveBefore(layer);
        adj.label = 5;
        var fx = adj.property("ADBE Effect Parade") || adj.property("ADBE Effect Group") || adj.Effects;

        var maxBlurCtrl = fx.addProperty("ADBE Slider Control");
        maxBlurCtrl.name = "Max Blur";
        maxBlurCtrl.property("ADBE Slider Control-0001").setValue(50);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(6.0);

        var lens = fx.addProperty("ADBE Camera Lens Blur");
        if (!lens) {
            lens = fx.addProperty("ADBE Fast Blur");
        }
        var blurRadius = null;
        if (lens) {
            blurRadius = lens.property("ADBE Camera Lens Blur-0001");
            if (!blurRadius) blurRadius = lens.property("Blur Radius");
            if (!blurRadius) blurRadius = lens.property("Blurriness");
            if (!blurRadius && lens.numProperties >= 1) blurRadius = lens.property(1);
        }
        if (!blurRadius) {
            return '{"error":true,"tool":"LENS","type":"error","message":"Could not find Blur Radius property."}';
        }
        var expr = [
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "maxBlur = effect(\"Max Blur\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "if (m && m.numKeys > 0) {",
            "    n = 0;",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) n--;",
            "    if (n > 0) {",
            "        t = time - m.key(n).time;",
            "        maxBlur / Math.exp(t * decay);",
            "    } else {",
            "        0;",
            "    }",
            "} else {",
            "    0;",
            "}"
        ].join("\n");
        blurRadius.expression = expr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        adj.selected = true;
        return true;
    } catch (err) {
        return '{"error":true,"tool":"LENS","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}
function _SHAKE() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return '{"error":true,"tool":"SHKE","type":"warn","message":"Please select a layer with markers."}';
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Apply S_Shake");
    try {
        var adj = comp.layers.addSolid([0, 0, 0], "S_Shake Adjust", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.label = 5;
        try { adj.moveBefore(layer); } catch (e) { }
        var fx = adj.property("ADBE Effect Parade") || adj.property("ADBE Effect Group") || adj.Effects;

        var maxAmpCtrl = fx.addProperty("ADBE Slider Control");
        maxAmpCtrl.name = "Max Amplitude";
        maxAmpCtrl.property("ADBE Slider Control-0001").setValue(1.0);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(4.0);
        var shake = fx.addProperty("S_Shake");
        if (!shake) {
            alert("S_Shake effect not found. Please make sure Sapphire plugin is installed.");
            adj.remove();
            return false;
        }
        var mb = shake.property("Motion Blur");
        if (mb) mb.setValue(true);
        var amp = shake.property("Amplitude");
        if (!amp) {
            alert("Amplitude property not found in S_Shake.");
            return false;
        }
        var expr = [
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "maxAmp = effect(\"Max Amplitude\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "if (m && m.numKeys > 0) {",
            "    n = 0;",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) n--;",
            "    if (n > 0) {",
            "        t = time - m.key(n).time;",
            "        maxAmp / Math.exp(t * decay);",
            "    } else {",
            "        0;",
            "    }",
            "} else {",
            "    0;",
            "}"
        ].join("\n");
        amp.expression = expr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        adj.selected = true;
        return true;
    } catch (err) {
        return '{"error":true,"tool":"SHKE","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}
function _WARP() {
    var comp = app.project.activeItem;
    if (!comp) return false;
    app.beginUndoGroup("Warp Effect");
    try {
        var curTime = comp.time;
        var duration = 8 * comp.frameDuration;
        var adj = comp.layers.addSolid([0, 0, 0], "Warp Effect", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.startTime = curTime;
        adj.outPoint = curTime + duration;
        adj.label = 5;
        var selectedLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
        if (selectedLayer) {
            try {
                if (adj.index !== selectedLayer.index - 1) adj.moveBefore(selectedLayer);
            } catch (e) { }
        }
        var warp = adj.Effects.addProperty("ADBE Wave Warp");
        if (!warp) {
            alert("Wave Warp effect not found.");
            adj.remove();
            return false;
        }
        warp.property("ADBE Wave Warp-0001").setValue(9);
        warp.property("ADBE Wave Warp-0003").setValue(109);
        warp.property("ADBE Wave Warp-0004").setValue(0);
        warp.property("ADBE Wave Warp-0005").setValue(0.2);
        warp.property("ADBE Wave Warp-0006").setValue(2);
        warp.property("ADBE Wave Warp-0008").setValue(1);
        var height = warp.property("ADBE Wave Warp-0002");
        height.setValueAtTime(curTime, 228);
        height.setValueAtTime(curTime + duration, 0);
        var easeOutFast = new KeyframeEase(-50000, 0.1);
        var easeInSlow = new KeyframeEase(0, 100);
        height.setTemporalEaseAtKey(1, height.keyInTemporalEase(1), [easeOutFast]);
        height.setTemporalEaseAtKey(2, [easeInSlow], height.keyOutTemporalEase(2));
        return true;
    } catch (err) {
        alert("Warp Effect Error: " + err.toString());
        return false;
    } finally {
        app.endUndoGroup();
    }
}
function _MIDWAVE() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    app.beginUndoGroup("Mid-Wave Effect");
    try {
        var curTime = comp.time;
        var fd = comp.frameDuration;
        var t1 = curTime - (15 * fd);
        var t2 = curTime;
        var t3 = curTime + (20 * fd);
        var adj = comp.layers.addSolid([1, 1, 1], "Mid-Wave", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.label = 5;
        if (comp.selectedLayers.length > 0 && comp.selectedLayers[0].index !== adj.index) {
            adj.moveBefore(comp.selectedLayers[0]);
        }
        adj.inPoint = t1;
        adj.outPoint = t3 + fd;
        var markerVal = new MarkerValue("Mid-Wave Center");
        adj.property("ADBE Marker").setValueAtTime(curTime, markerVal);
        var mt = adj.property("ADBE Effect Parade").addProperty("ADBE Tile");
        mt.property("ADBE Tile-0001").setValue([comp.width / 2, comp.height / 2]);
        mt.property("ADBE Tile-0002").setValue(100);
        mt.property("ADBE Tile-0003").setValue(100);
        mt.property("ADBE Tile-0004").setValue(150);
        mt.property("ADBE Tile-0005").setValue(150);
        mt.property("ADBE Tile-0006").setValue(1);
        mt.property("ADBE Tile-0007").setValue(0);
        mt.property("ADBE Tile-0008").setValue(0);
        var ww1 = adj.property("ADBE Effect Parade").addProperty("ADBE Wave Warp");
        ww1.property("ADBE Wave Warp-0001").setValue(1);
        ww1.property("ADBE Wave Warp-0003").setValue(1200);
        ww1.property("ADBE Wave Warp-0004").setValue(45);
        ww1.property("ADBE Wave Warp-0005").setValue(1.3);
        ww1.property("ADBE Wave Warp-0006").setValue(1);
        ww1.property("ADBE Wave Warp-0007").setValue(90);
        ww1.property("ADBE Wave Warp-0008").setValue(1);
        var wh1 = ww1.property("ADBE Wave Warp-0002");
        wh1.setValueAtTime(t1, 0);
        wh1.setValueAtTime(t2, 100);
        wh1.setValueAtTime(t3, 0);
        _applyMidWaveEase(wh1);
        var ww2 = adj.property("ADBE Effect Parade").addProperty("ADBE Wave Warp");
        ww2.property("ADBE Wave Warp-0001").setValue(1);
        ww2.property("ADBE Wave Warp-0003").setValue(1200);
        ww2.property("ADBE Wave Warp-0004").setValue(-45);
        ww2.property("ADBE Wave Warp-0005").setValue(1.3);
        ww2.property("ADBE Wave Warp-0006").setValue(1);
        ww2.property("ADBE Wave Warp-0007").setValue(90);
        ww2.property("ADBE Wave Warp-0008").setValue(1);
        var wh2 = ww2.property("ADBE Wave Warp-0002");
        wh2.setValueAtTime(t1, 0);
        wh2.setValueAtTime(t2, 100);
        wh2.setValueAtTime(t3, 0);
        _applyMidWaveEase(wh2);
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        adj.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _HUESPIN() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    app.beginUndoGroup("Hue Spin Effect");
    try {
        var curTime = comp.time;
        var fd = comp.frameDuration;
        var duration = 25 * fd;
        var selectedLayer = null;
        if (comp.selectedLayers.length > 0) selectedLayer = comp.selectedLayers[0];
        var adj = comp.layers.addSolid([1, 1, 1], "Hue Spin", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.label = 5;
        adj.startTime = curTime;
        adj.outPoint = curTime + duration;
        if (selectedLayer && selectedLayer.index !== adj.index) {
            adj.moveBefore(selectedLayer);
        }
        var hue = adj.property("ADBE Effect Parade").addProperty("ADBE HUE SATURATION");
        var channelRange = hue.property("ADBE HUE SATURATION-0003");
        var masterHue = hue.property("ADBE HUE SATURATION-0004");
        comp.time = curTime;
        masterHue.setValue(0);
        channelRange.addKey(curTime);
        comp.time = curTime + duration;
        masterHue.setValue(360);
        comp.time = curTime;
        if (channelRange.numKeys >= 2) {
            channelRange.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            channelRange.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        }
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        adj.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _OSCILLATE() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("Oscillate");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "OSCILLATE";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade");
        var freqCtrl = fx.addProperty("ADBE Slider Control");
        freqCtrl.name = "Freq";
        freqCtrl.property("ADBE Slider Control-0001").setValue(3);
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(30);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(2.7);
        var attackCtrl = fx.addProperty("ADBE Slider Control");
        attackCtrl.name = "Attack";
        attackCtrl.property("ADBE Slider Control-0001").setValue(40);
        
        var posExpr = [
            "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "attack = effect(\"Attack\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    n = 0;",
            "    if (m.numKeys > 0){",
            "        n = m.nearestKey(time).index;",
            "        if (m.key(n).time > time) n--;",
            "    }",
            "",
            "    if (n > 0){",
            "        markerTime = m.key(n).time;",
            "        if (markerTime >= inPoint && markerTime <= outPoint){",
            "            t = time - markerTime;",
            "            env = (attack > 0) ? (1 - Math.exp(-t * attack)) : 1;",
            "            currAmp = amp * env / Math.exp(t * decay);",
            "            x = Math.sin(t * freq * Math.PI * 2) * currAmp;",
            "            y = (1 - Math.cos(t * freq * Math.PI * 2)) * currAmp;",
            "            value + [x, y];",
            "        }else{",
            "            value;",
            "        }",
            "    }else{",
            "        value;",
            "    }",
            "}"
        ].join("\n");
        var positionProp = nullLayer.property("ADBE Transform Group").property("ADBE Position");
        positionProp.expression = posExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _Y_BEAT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("Y Beat");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Y BEAT";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade");
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(500);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(20);
        var posExpr = [
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) {",
            "        t2 = m.key(n).time;",
            "        t1 = (n > 1) ? m.key(n-1).time : -99999;",
            "    } else {",
            "        t1 = m.key(n).time;",
            "        t2 = (n < m.numKeys) ? m.key(n+1).time : 99999;",
            "    }",
            "",
            "    val1 = 0;",
            "    if (t1 >= inPoint && t1 <= outPoint) {",
            "        val1 = amp / Math.exp((time - t1) * decay);",
            "    }",
            "",
            "    val2 = 0;",
            "    if (t2 >= inPoint && t2 <= outPoint) {",
            "        val2 = amp / Math.exp((t2 - time) * decay);",
            "    }",
            "",
            "    val = (Math.abs(val1) > Math.abs(val2)) ? val1 : val2;",
            "    value + [0, val];",
            "}"
        ].join("\n");
        var positionProp = nullLayer.property("ADBE Transform Group").property("ADBE Position");
        positionProp.expression = posExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _X_BEAT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("X Beat");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "X BEAT";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade");
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(500);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(20);
        var posExpr = [
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) {",
            "        t2 = m.key(n).time;",
            "        t1 = (n > 1) ? m.key(n-1).time : -99999;",
            "    } else {",
            "        t1 = m.key(n).time;",
            "        t2 = (n < m.numKeys) ? m.key(n+1).time : 99999;",
            "    }",
            "",
            "    val1 = 0;",
            "    if (t1 >= inPoint && t1 <= outPoint) {",
            "        val1 = amp / Math.exp((time - t1) * decay);",
            "    }",
            "",
            "    val2 = 0;",
            "    if (t2 >= inPoint && t2 <= outPoint) {",
            "        val2 = amp / Math.exp((t2 - time) * decay);",
            "    }",
            "",
            "    val = (Math.abs(val1) > Math.abs(val2)) ? val1 : val2;",
            "    value + [val, 0];",
            "}"
        ].join("\n");
        var positionProp = nullLayer.property("ADBE Transform Group").property("ADBE Position");
        positionProp.expression = posExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _X_FLIP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("X Flip");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "X FLIP";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;

        var fx = nullLayer.property("ADBE Effect Parade");
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(500);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(20);

        // ─── X FLIP expression ─────────────────────────────────────────────────
        // • Beat 1 (odd):  direction LEFT  (-amp)
        // • Beat 2 (even): direction RIGHT (+amp), alternating
        // • WITHIN each beat: val1 (decay from beat) AND val2 (anticipation toward
        //   next beat) BOTH use the CURRENT beat's direction → creates X-BEAT-style
        //   bounce that stays on the SAME side (kiri→tengah→kiri, or kanan→tengah→kanan)
        // • 1 frame before next beat: TELEPORT to opposite side to set up next beat
        var posExpr = [
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    // Find last beat index (n) at or before current time",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) n = n - 1;",
            "",
            "    if (n <= 0){",
            "        // Before first beat: pre-position to LEFT (beat 1 is LEFT)",
            "        value + [-amp, 0];",
            "    }else{",
            "        t1 = m.key(n).time;",
            "        t2 = (n < m.numKeys) ? m.key(n+1).time : outPoint + 9999;",
            "        oneFrame = 1 / thisComp.frameRate;",
            "",
            "        // Odd beat (1,3,5…) = LEFT (-1), Even (2,4,6…) = RIGHT (+1)",
            "        dir = (n % 2 === 1) ? -1 : 1;",
            "",
            "        if (n < m.numKeys && time >= t2 - oneFrame){",
            "            // 1 frame before next beat → teleport to opposite side",
            "            val = -dir * amp;",
            "        }else{",
            "            // X BEAT formula but BOTH val1 and val2 use the SAME direction",
            "            // → bounce stays on current side (left bounce stays left, right stays right)",
            "            val1 = dir * amp / Math.exp((time - t1) * decay);",
            "            val2 = dir * amp / Math.exp((t2 - time) * decay);",
            "            val = (Math.abs(val1) > Math.abs(val2)) ? val1 : val2;",
            "        }",
            "        value + [val, 0];",
            "    }",
            "}"
        ].join("\n");

        var positionProp = nullLayer.property("ADBE Transform Group").property("ADBE Position");
        positionProp.expression = posExpr;

        // ─── Scale X flip expression (-100 / 100) ─────────────────────────────
        var scaleExpr = [
            "if (time < inPoint || time > outPoint){",
            "    [100, 100];",
            "}else{",
            "    m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "    if (!m || m.numKeys === 0){",
            "        value;",
            "    }else{",
            "        n = m.nearestKey(time).index;",
            "        if (m.key(n).time > time) n = n - 1;",
            "        if (n <= 0){",
            "            [-100, 100];",
            "        }else{",
            "            t2 = (n < m.numKeys) ? m.key(n+1).time : outPoint + 9999;",
            "            oneFrame = 1 / thisComp.frameRate;",
            "            beatIdx = (n < m.numKeys && time >= t2 - oneFrame) ? (n + 1) : n;",
            "            sX = (beatIdx % 2 === 1) ? -100 : 100;",
            "            [sX, 100];",
            "        }",
            "    }",
            "}"
        ].join("\n");
        var scaleProp = nullLayer.property("ADBE Transform Group").property("ADBE Scale");
        scaleProp.expression = scaleExpr;

        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _Y_FLIP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("Y Flip");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Y FLIP";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;

        var fx = nullLayer.property("ADBE Effect Parade");
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(500);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(20);

        // ─── Y FLIP expression ─────────────────────────────────────────────────
        // • Beat 1 (odd):  direction UP   (-amp)
        // • Beat 2 (even): direction DOWN (+amp), alternating
        // • WITHIN each beat: val1 (decay from beat) AND val2 (anticipation toward
        //   next beat) BOTH use the CURRENT beat's direction → creates Y-BEAT-style
        //   bounce that stays on the SAME side (atas→tengah→atas, or bawah→tengah→bawah)
        // • 1 frame before next beat: TELEPORT to opposite side to set up next beat
        var posExpr = [
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) n = n - 1;",
            "",
            "    if (n <= 0){",
            "        // Before first beat: pre-position to UP (beat 1 is UP)",
            "        value + [0, -amp];",
            "    }else{",
            "        t1 = m.key(n).time;",
            "        t2 = (n < m.numKeys) ? m.key(n+1).time : outPoint + 9999;",
            "        oneFrame = 1 / thisComp.frameRate;",
            "",
            "        // Odd beat (1,3,5…) = UP (-1), Even (2,4,6…) = DOWN (+1)",
            "        dir = (n % 2 === 1) ? -1 : 1;",
            "",
            "        if (n < m.numKeys && time >= t2 - oneFrame){",
            "            // 1 frame before next beat → teleport to opposite side",
            "            val = -dir * amp;",
            "        }else{",
            "            val1 = dir * amp / Math.exp((time - t1) * decay);",
            "            val2 = dir * amp / Math.exp((t2 - time) * decay);",
            "            val = (Math.abs(val1) > Math.abs(val2)) ? val1 : val2;",
            "        }",
            "        value + [0, val];",
            "    }",
            "}"
        ].join("\n");

        var positionProp = nullLayer.property("ADBE Transform Group").property("ADBE Position");
        positionProp.expression = posExpr;

        // ─── Scale Y flip expression (100 / -100) ─────────────────────────────
        var scaleExpr = [
            "if (time < inPoint || time > outPoint){",
            "    [100, 100];",
            "}else{",
            "    m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "    if (!m || m.numKeys === 0){",
            "        value;",
            "    }else{",
            "        n = m.nearestKey(time).index;",
            "        if (m.key(n).time > time) n = n - 1;",
            "        if (n <= 0){",
            "            [100, -100];",
            "        }else{",
            "            t2 = (n < m.numKeys) ? m.key(n+1).time : outPoint + 9999;",
            "            oneFrame = 1 / thisComp.frameRate;",
            "            beatIdx = (n < m.numKeys && time >= t2 - oneFrame) ? (n + 1) : n;",
            "            sY = (beatIdx % 2 === 1) ? -100 : 100;",
            "            [100, sY];",
            "        }",
            "    }",
            "}"
        ].join("\n");
        var scaleProp = nullLayer.property("ADBE Transform Group").property("ADBE Scale");
        scaleProp.expression = scaleExpr;

        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _SCALE_BEAT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("Scale Beat");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "SCALE BEAT";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade");
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(500);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(20);
        var scaleExpr = [
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "    n = m.nearestKey(time).index;",
            "    if (m.key(n).time > time) {",
            "        t2 = m.key(n).time;",
            "        t1 = (n > 1) ? m.key(n-1).time : -99999;",
            "    } else {",
            "        t1 = m.key(n).time;",
            "        t2 = (n < m.numKeys) ? m.key(n+1).time : 99999;",
            "    }",
            "",
            "    val1 = 0;",
            "    if (t1 >= inPoint && t1 <= outPoint) {",
            "        val1 = amp / Math.exp((time - t1) * decay);",
            "    }",
            "",
            "    val2 = 0;",
            "    if (t2 >= inPoint && t2 <= outPoint) {",
            "        val2 = amp / Math.exp((t2 - time) * decay);",
            "    }",
            "",
            "    val = (Math.abs(val1) > Math.abs(val2)) ? val1 : val2;",
            "    value + [val, val];",
            "}"
        ].join("\n");
        var scaleProp = nullLayer.property("ADBE Transform Group").property("ADBE Scale");
        scaleProp.expression = scaleExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _SCALE_OVERLAP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return JSON.stringify({error: true, message: "Please select a composition.", tool: "Scale Overlap"});
    if (comp.selectedLayers.length === 0) return JSON.stringify({error: true, message: "Please select a layer with markers.", tool: "Scale Overlap"});
    app.beginUndoGroup("Scale Overlap");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "SCALE OVER";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade") || nullLayer.property("ADBE Effect Group") || nullLayer.Effects;
        var scaleInCtrl = fx.addProperty("ADBE Slider Control");
        scaleInCtrl.name = "Scale In";
        scaleInCtrl.property("ADBE Slider Control-0001").setValue(0);
        var scaleOutCtrl = fx.addProperty("ADBE Slider Control");
        scaleOutCtrl.name = "Scale Out";
        scaleOutCtrl.property("ADBE Slider Control-0001").setValue(20);
        var overshootCtrl = fx.addProperty("ADBE Slider Control");
        overshootCtrl.name = "Overshoot";
        overshootCtrl.property("ADBE Slider Control-0001").setValue(20);
        var scaleExpr = [
            "function bezier(x1, y1, x2, y2, t) {",
            "    if (t <= 0) return 0;",
            "    if (t >= 1) return 1;",
            "    var p = t;",
            "    for (var i = 0; i < 8; i++) {",
            "        var omP = 1 - p;",
            "        var f = 3 * omP * omP * p * x1 + 3 * omP * p * p * x2 + p * p * p - t;",
            "        var df = 3 * omP * omP * x1 + 6 * omP * p * (x2 - x1) + 3 * p * p * (1 - x2);",
            "        if (Math.abs(df) < 1e-6) break;",
            "        p -= f / df;",
            "        p = Math.max(0, Math.min(1, p));",
            "    }",
            "    var omP = 1 - p;",
            "    return 3 * omP * omP * p * y1 + 3 * omP * p * p * y2 + p * p * p;",
            "}",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "scaleIn = effect(\"Scale In\")(\"ADBE Slider Control-0001\");",
            "scaleOut = effect(\"Scale Out\")(\"ADBE Slider Control-0001\");",
            "overshoot = effect(\"Overshoot\")(\"ADBE Slider Control-0001\");",
            "",
            "if (time < inPoint || time > outPoint) {",
            "    value;",
            "} else if (m && m.numKeys > 0) {",
            "    n = 0;",
            "    if (m.numKeys > 0) {",
            "        n = m.nearestKey(time).index;",
            "        if (m.key(n).time > time) n--;",
            "    }",
            "    ",
            "    if (n > 0 && n < m.numKeys) {",
            "        t1 = m.key(n).time;",
            "        t2 = m.key(n+1).time;",
            "        dur = t2 - t1;",
            "        ",
            "        startVal = (n % 2 !== 0) ? scaleIn : scaleOut;",
            "        endVal = (n % 2 !== 0) ? scaleOut : scaleIn;",
            "        ",
            "        t = time - t1;",
            "        progress = Math.max(0, Math.min(1, t / dur));",
            "        yMult = overshoot / 20;",
            "        eased = bezier(0.4, -0.5 * yMult, 0.8, -0.5 * yMult, progress);",
            "        val = startVal + (endVal - startVal) * eased;",
            "        value + [val, val];",
            "    } else if (n >= m.numKeys) {",
            "        finalVal = (m.numKeys % 2 !== 0) ? scaleOut : scaleIn;",
            "        value + [finalVal, finalVal];",
            "    } else {",
            "        value + [scaleIn, scaleIn];",
            "    }",
            "} else {",
            "    value;",
            "}"
        ].join("\n");
        var scaleProp = nullLayer.property("ADBE Transform Group").property("ADBE Scale");
        scaleProp.expression = scaleExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return JSON.stringify({error: true, message: e.toString(), tool: "Scale Overlap"});
    } finally {
        app.endUndoGroup();
    }
}
function _SWING() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";
    app.beginUndoGroup("Swing");
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Swing_Null";
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;
        var fx = nullLayer.property("ADBE Effect Parade");
        var freqCtrl = fx.addProperty("ADBE Slider Control");
        freqCtrl.name = "Freq";
        freqCtrl.property("ADBE Slider Control-0001").setValue(1);
        var ampCtrl = fx.addProperty("ADBE Slider Control");
        ampCtrl.name = "Amp";
        ampCtrl.property("ADBE Slider Control-0001").setValue(4);
        var decayCtrl = fx.addProperty("ADBE Slider Control");
        decayCtrl.name = "Decay";
        decayCtrl.property("ADBE Slider Control-0001").setValue(1.5);
        var rotExpr = [
            "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = (index + 1 <= thisComp.numLayers && thisComp.layer(index + 1).marker.numKeys > 0) ? thisComp.layer(index + 1).marker : thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint || !m || m.numKeys === 0){",
            "    value;",
            "}else{",
            "",
            "    n = 0;",
            "",
            "    if (m.numKeys > 0){",
            "        n = m.nearestKey(time).index;",
            "        if (m.key(n).time > time) n--;",
            "    }",
            "",
            "    if (n > 0){",
            "",
            "        markerTime = m.key(n).time;",
            "",
            "        if (markerTime >= inPoint && markerTime <= outPoint){",
            "",
            "            t = time - markerTime;",
            "",
            "            r = amp * Math.sin(t * freq * Math.PI * 2) / Math.exp(t * decay);",
            "",
            "            value + r;",
            "",
            "        }else{",
            "            value;",
            "        }",
            "",
            "    }else{",
            "        value;",
            "    }",
            "}"
        ].join("\n");
        var rotationProp = nullLayer.property("ADBE Transform Group").property("ADBE Rotate Z");
        rotationProp.expression = rotExpr;
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _createPanningEffect(type) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    if (comp.selectedLayers.length === 0) return "Please select a layer.";

    var title = "Panning Effect";
    var nullName = "PANNING";
    var hasPos = (type === "POS" || type === "MIX_PR" || type === "MIX_ALL");
    var hasRot = (type === "ROT" || type === "MIX_PR" || type === "MIX_ALL");
    var hasScale = (type === "SCALE" || type === "MIX_ALL");

    if (type === "POS") { title = "Panning Position"; nullName = "PANNING Position"; }
    else if (type === "ROT") { title = "Panning Rotation"; nullName = "PANNING Rotation"; }
    else if (type === "SCALE") { title = "Panning Scale"; nullName = "PANNING Scale"; }
    else if (type === "MIX_PR") { title = "Panning Mix PR"; nullName = "PANNING Mix PR"; }
    else if (type === "MIX_ALL") { title = "Panning Mix All"; nullName = "PANNING Mix All"; }

    app.beginUndoGroup(title);
    try {
        var targetLayer = comp.selectedLayers[0];
        var nullLayer = comp.layers.addNull();
        nullLayer.name = nullName;
        nullLayer.label = 1;
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }
        targetLayer.parent = nullLayer;

        var defaultFreq = (type === "MIX_PR") ? 7 : 1.5;
        var defaultPos = (type === "MIX_PR") ? 10 : 30;
        var defaultRot = (type === "MIX_PR") ? 1 : 5;
        var defaultScale = 10;

        var fx = nullLayer.property("ADBE Effect Parade");

        var freqCtrl = fx.addProperty("ADBE Slider Control");
        freqCtrl.name = "Freq";
        freqCtrl.property("ADBE Slider Control-0001").setValue(defaultFreq);

        if (hasPos) {
            var posCtrl = fx.addProperty("ADBE Slider Control");
            posCtrl.name = "Position";
            posCtrl.property("ADBE Slider Control-0001").setValue(defaultPos);
        }

        if (hasRot) {
            var rotCtrl = fx.addProperty("ADBE Slider Control");
            rotCtrl.name = "Rotation";
            rotCtrl.property("ADBE Slider Control-0001").setValue(defaultRot);
        }

        if (hasScale) {
            var scaleCtrl = fx.addProperty("ADBE Slider Control");
            scaleCtrl.name = "Scale";
            scaleCtrl.property("ADBE Slider Control-0001").setValue(defaultScale);
        }

        if (hasPos) {
            var posExpr = [
                "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
                "posAmp = effect(\"Position\")(\"ADBE Slider Control-0001\");",
                "if (time < inPoint || time > outPoint){",
                "    value;",
                "}else{",
                "    t = time * freq;",
                "    x = (Math.sin(t * 1.2) * 0.7 + Math.sin(t * 2.3) * 0.3) * posAmp;",
                "    y = (Math.cos(t * 0.9) * 0.7 + Math.sin(t * 1.7) * 0.3) * posAmp;",
                "    value + [x, y];",
                "}"
            ].join("\n");
            nullLayer.property("ADBE Transform Group").property("ADBE Position").expression = posExpr;
        }

        if (hasRot) {
            var rotExpr = [
                "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
                "rotAmp = effect(\"Rotation\")(\"ADBE Slider Control-0001\");",
                "if (time < inPoint || time > outPoint){",
                "    value;",
                "}else{",
                "    t = time * freq;",
                "    r = (Math.sin(t * 0.8 + 1.5) * 0.7 + Math.cos(t * 1.5) * 0.3) * rotAmp;",
                "    value + r;",
                "}"
            ].join("\n");
            nullLayer.property("ADBE Transform Group").property("ADBE Rotate Z").expression = rotExpr;
        }

        if (hasScale) {
            var scaleExpr = [
                "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
                "scaleAmp = effect(\"Scale\")(\"ADBE Slider Control-0001\");",
                "if (time < inPoint || time > outPoint){",
                "    value;",
                "}else{",
                "    t = time * freq;",
                "    s = (Math.sin(t * 1.1) * 0.7 + Math.cos(t * 2.1) * 0.3) * scaleAmp;",
                "    value + [s, s];",
                "}"
            ].join("\n");
            nullLayer.property("ADBE Transform Group").property("ADBE Scale").expression = scaleExpr;
        }

        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        nullLayer.selected = true;
        return true;
    } catch (e) {
        return "ERROR:" + e.toString();
    } finally {
        app.endUndoGroup();
    }
}
function _FISHEYE() {
    var comp = app.project.activeItem;
    if (!comp) return false;
    app.beginUndoGroup("Fish Eye Ripple");
    try {
        var curTime = comp.time;
        var fd = comp.frameDuration;
        var adj = comp.layers.addSolid([0, 0, 0], "Fish Eye Ripple", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.label = 5;
        adj.startTime = curTime - (2.5 * fd);
        adj.inPoint = curTime - (2 * fd);
        adj.outPoint = curTime + (3 * fd);
        var selectedLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
        if (selectedLayer) {
            try { adj.moveBefore(selectedLayer); } catch(e){}
        }
        var warp = null;
        try {
            var effectGroup = adj.property("ADBE Effect Parade") || adj.property("ADBE Effect Group") || adj.Effects;
            warp = effectGroup.addProperty("ADBE WRPMESH");
        } catch (e) {
            var effectGroup = adj.property("ADBE Effect Parade") || adj.property("ADBE Effect Group") || adj.Effects;
            warp = effectGroup.addProperty("Warp");
        }
        if (!warp) throw new Error("Warp effect creation failed.");
        var warpStyle = warp.property(1); 
        var bend = warp.property(3);      
        if (warpStyle) warpStyle.setValue(12); 
        if (!bend) throw new Error("Could not find Bend property in Warp effect.");
        bend.setValueAtTime(curTime - (5 * fd), 0);
        bend.setValueAtTime(curTime - (2 * fd), 20);
        bend.setValueAtTime(curTime, -100);          
        bend.setValueAtTime(curTime + (4 * fd), 20);
        bend.setValueAtTime(curTime + (10 * fd), -5);
        bend.setValueAtTime(curTime + (18 * fd), 0);
        adj.inPoint = curTime - (5 * fd);
        adj.outPoint = curTime + (19 * fd);
        for (var i = 1; i <= 6; i++) {
            bend.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            var ease = new KeyframeEase(0, 33.33333);
            bend.setTemporalEaseAtKey(i, [ease], [ease]);
        }
        return true;
    } catch (err) {
        alert("Fish Eye Error: " + err.toString());
        return false;
    } finally {
        app.endUndoGroup();
    }
}
function _getEffectGroup(layer) {
    if (!layer) return null;
    return layer.property("ADBE Effect Parade") || layer.property("ADBE Effect Group") || layer.property("Effects") || layer.Effects;
}
function _getSelDuration() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return null;
    var layer = comp.selectedLayers[0];
    return {
        start: layer.inPoint,
        end: layer.outPoint,
        duration: layer.outPoint - layer.inPoint
    };
}
function _createStyleLayer(type, name) {
    var comp = app.project.activeItem;
    var dur = _getSelDuration();
    if (!dur) throw new Error("Please select a layer first!");
    var selectedLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
    var layer;
    var pa = comp.pixelAspect || 1.0;
    if (type === "ADJ") {
        layer = comp.layers.addSolid([0,0,0], name, comp.width, comp.height, pa, dur.duration);
        layer.adjustmentLayer = true;
    } else {
        layer = comp.layers.addSolid([1,1,1], name, comp.width, comp.height, pa, dur.duration);
    }
    layer.startTime = dur.start;
    layer.inPoint = dur.start;
    layer.outPoint = dur.end;
    if (selectedLayer) {
        try { layer.moveBefore(selectedLayer); } catch (e) {}
    }
    return layer;
}
function _CF_COLORIZE() {
    app.beginUndoGroup("CF Colorize");
    try {
        var layer = _createStyleLayer("ADJ", "CF Colorize");
        var effects = _getEffectGroup(layer);
        var tint = effects.addProperty("ADBE Tint");
        var r = Math.random();
        var g = Math.random();
        var b = Math.random();
        tint.property("ADBE Tint-0002").setValue([r, g, b]); 
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Colorize"}); }
    finally { app.endUndoGroup(); }
}
function _CF_SCANLINE() {
    app.beginUndoGroup("CF Scanline");
    try {
        var layer = _createStyleLayer("ADJ", "CF Scanline");
        var effects = _getEffectGroup(layer);
        var tv = effects.addProperty("S_TVDamage");
        tv.property("S_TVDamage-0050").setValue(0);    
        tv.property("S_TVDamage-0051").setValue(0.6);  
        tv.property("S_TVDamage-0052").setValue(0.6);  
        tv.property("S_TVDamage-0053").setValue(0.5);  
        tv.property("S_TVDamage-0054").setValue(0.8);  
        tv.property("S_TVDamage-0055").setValue(0.3);  
        tv.property("S_TVDamage-0060").setValue(0.8);  
        tv.property("S_TVDamage-0061").setValue(0.7);  
        tv.property("S_TVDamage-0101").setValue(1.1);  
        tv.property("S_TVDamage-0102").setValue(0.65); 
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Scanline"}); }
    finally { app.endUndoGroup(); }
}
function _CF_MONO() {
    app.beginUndoGroup("CF Mono");
    try {
        var layer = _createStyleLayer("ADJ", "CF Mono");
        var effects = _getEffectGroup(layer);
        try {
            effects.addProperty("ADBE Black & White");
        } catch(e) {
            effects.addProperty("Black & White");
        }
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Mono"}); }
    finally { app.endUndoGroup(); }
}
function _CF_STARBURST() {
    app.beginUndoGroup("CF Starburst");
    try {
        var layer = _createStyleLayer("SOLID", "CF Starburst");
        var effects = _getEffectGroup(layer);
        var starburst = effects.addProperty("CC Star Burst");
        starburst.property("CC Star Burst-0001").setValue(100); 
        starburst.property("CC Star Burst-0004").setValue(32);  
        starburst.property("CC Star Burst-0005").setValue(20);  
        var fill = effects.addProperty("ADBE Fill");
        var r = Math.random();
        var g = Math.random();
        var b = Math.random();
        fill.property("ADBE Fill-0002").setValue([r, g, b]); 
        effects.addProperty("ADBE Bevel Alpha").property("ADBE Bevel Alpha-0001").setValue(2);
        effects.addProperty("ADBE Drop Shadow").property("ADBE Drop Shadow-0004").setValue(14);
        try { effects.addProperty("PEDG"); } catch(err) {} 
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Starburst"}); }
    finally { app.endUndoGroup(); }
}
function _CF_GRID() {
    app.beginUndoGroup("CF Grid");
    try {
        var layer = _createStyleLayer("SOLID", "CF Grid");
        var effects = _getEffectGroup(layer);
        var comp = app.project.activeItem;
        var grid = effects.addProperty("ADBE Grid");
        grid.property("ADBE Grid-0001").setValue([comp.width / 2, comp.height / 2]); 
        grid.property("ADBE Grid-0002").setValue(1);  
        grid.property("ADBE Grid-0003").setValue([comp.width * 0.701, comp.height * 0.86]); 
        grid.property("ADBE Grid-0006").setValue(5);  
        effects.addProperty("ADBE Bevel Alpha").property("ADBE Bevel Alpha-0004").setValue(0.4);
        effects.addProperty("ADBE Drop Shadow").property("ADBE Drop Shadow-0004").setValue(5);
        try { effects.addProperty("PEDG"); } catch(err) {}
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Grid"}); }
    finally { app.endUndoGroup(); }
}
function _CF_RADIO() {
    app.beginUndoGroup("CF Radio");
    try {
        var layer = _createStyleLayer("SOLID", "CF Radio");
        layer.blendingMode = BlendingMode.SCREEN;
        var effects = _getEffectGroup(layer);
        var radio = effects.addProperty("APC Radio Waves");
        radio.property("APC Radio Waves-0002").setValue(1); 
        radio.property("APC Radio Waves-0008").setValue(5); 
        radio.property("APC Radio Waves-0014").setValue(1); 
        radio.property("APC Radio Waves-0016").setValue(-0.5); 
        radio.property("APC Radio Waves-0036").setValue(35); 
        radio.property("APC Radio Waves-0044").setValue(27); 
        radio.property("APC Radio Waves-0050").setValue(5);  
        radio.property("APC Radio Waves-0052").setValue(5);  
        effects.addProperty("ADBE Bevel Alpha").property("ADBE Bevel Alpha-0001").setValue(3);
        effects.addProperty("ADBE Drop Shadow").property("ADBE Drop Shadow-0004").setValue(21);
        try { effects.addProperty("PEDG"); } catch(err) {}
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Radio"}); }
    finally { app.endUndoGroup(); }
}
function _CF_GLOW_AURA() {
    app.beginUndoGroup("CF Glow Aura");
    try {
        var comp = app.project.activeItem;
        if (!comp || comp.selectedLayers.length === 0) throw new Error("Select a layer first!");
        var layer = comp.selectedLayers[0];
        var effects = _getEffectGroup(layer);
        var glow = effects.addProperty("S_GlowAura");
        glow.property("S_GlowAura-0056").setValue(96); 
        glow.property("S_GlowAura-0050").setValue(0.8); 
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Glow Aura"}); }
    finally { app.endUndoGroup(); }
}
function _CF_SOLID_AURA() {
    app.beginUndoGroup("CF Solid Aura");
    try {
        var comp = app.project.activeItem;
        if (!comp || comp.selectedLayers.length === 0) throw new Error("Select a layer first!");
        var layer = comp.selectedLayers[0];
        var effects = _getEffectGroup(layer);
        var minimax = effects.addProperty("ADBE Minimax");
        minimax.property("ADBE Minimax-0001").setValue(2); 
        minimax.property("ADBE Minimax-0002").setValue(28); 
        minimax.property("ADBE Minimax-0003").setValue(2);  
        effects.addProperty("ADBE Fill").property("ADBE Fill-0002").setValue([1, 1, 1]);
        var turb = effects.addProperty("ADBE Turbulent Displace");
        turb.property("ADBE Turbulent Displace-0001").setValue(1); 
        turb.property("ADBE Turbulent Displace-0002").setValue(50); 
        turb.property("ADBE Turbulent Displace-0003").setValue(18); 
        effects.addProperty("ADBE Bevel Alpha").property("ADBE Bevel Alpha-0001").setValue(3);
        try { effects.addProperty("PEDG").property("PEDG-0002").setValue(0.3); } catch(err) {}
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Solid Aura"}); }
    finally { app.endUndoGroup(); }
}
function _CF_SHATTER_SIMPLE() {
    app.beginUndoGroup("CF Shatter Simple");
    try {
        var comp = app.project.activeItem;
        if (!comp || comp.selectedLayers.length === 0) throw new Error("Select a layer first!");
        var layer = comp.selectedLayers[0];
        var effects = _getEffectGroup(layer);
        var shatter = effects.addProperty("APC Shatter");
        shatter.property("APC Shatter-0002").setValue(1); 
        shatter.property("APC Shatter-0028").setValue(2); 
        shatter.property("APC Shatter-0030").setValue(5); 
        shatter.property("APC Shatter-0038").setValue(5); 
        shatter.property("APC Shatter-0050").setValue(3); 
        shatter.property("APC Shatter-0006").setValue(8); 
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Shatter Simple"}); }
    finally { app.endUndoGroup(); }
}
function _CF_SHATTER_SLOW() {
    app.beginUndoGroup("CF Shatter Slow");
    try {
        var comp = app.project.activeItem;
        if (!comp || comp.selectedLayers.length === 0) throw new Error("Select a layer first!");
        var layer = comp.selectedLayers[0];
        var effects = _getEffectGroup(layer);
        var shatter = effects.addProperty("APC Shatter");
        shatter.property("APC Shatter-0002").setValue(1); 
        shatter.property("APC Shatter-0028").setValue(2); 
        shatter.property("APC Shatter-0030").setValue(0.3); 
        shatter.property("APC Shatter-0050").setValue(0);   
        shatter.property("APC Shatter-0040").setValue(0);   
        shatter.property("APC Shatter-0006").setValue(8);   
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Shatter Slow"}); }
    finally { app.endUndoGroup(); }
}
function _CF_DROP_BEVEL() {
    app.beginUndoGroup("CF Drop Bevel");
    try {
        var comp = app.project.activeItem;
        if (!comp || comp.selectedLayers.length === 0) throw new Error("Select a layer first!");
        var layer = comp.selectedLayers[0];
        var effects = _getEffectGroup(layer);
        var bevel = effects.addProperty("ADBE Bevel Alpha");
        bevel.property(1).setValue(2);    
        bevel.property(2).setValue(-60);  
        bevel.property(3).setValue([1, 1, 1]); 
        bevel.property(4).setValue(1);    
        var shadow = effects.addProperty("ADBE Drop Shadow");
        shadow.property(1).setValue([0, 0, 0]); 
        shadow.property(2).setValue(127.5);    
        shadow.property(3).setValue(135);      
        shadow.property(4).setValue(23);       
        shadow.property(5).setValue(0);        
        return true;
    } catch(e) { return JSON.stringify({error: true, message: e.toString(), tool: "Drop Bevel"}); }
    finally { app.endUndoGroup(); }
}
tools.TRANS_FADE_IN = function () { return _applyTransition("ADBE Opacity", "IN"); };
tools.TRANS_FADE_OUT = function () { return _applyTransition("ADBE Opacity", "OUT"); };
tools.TRANS_SCALE_IN = function () { return _applyTransition("ADBE Scale", "IN"); };
tools.TRANS_SCALE_OUT = function () { return _applyTransition("ADBE Scale", "OUT"); };
tools.TWIX = function () { return _TWIX(); };
tools.TMRE = function () { return _TMRE(); };
tools.GHST = function () { return _GHST(); };
tools.EXPO = function () { return _EXPO(); };
tools.LENS = function () { return _LENS(); };
tools.SHKE = function () { return _SHAKE(); };
tools.WARP = function () { return _WARP(); };
tools.MIDWAVE = function () { return _MIDWAVE(); };
tools.HUESPIN = function () { return _HUESPIN(); };
tools.OSCILLATE = function () { return _OSCILLATE(); };
tools.Y_BEAT = function () { return _Y_BEAT(); };
tools.Y_FLIP = function () { return _Y_FLIP(); };
tools.X_BEAT = function () { return _X_BEAT(); };
tools.X_FLIP = function () { return _X_FLIP(); };
tools.SCALE_BEAT = function () { return _SCALE_BEAT(); };
tools.SCALE_OVERLAP = function () { return _SCALE_OVERLAP(); };
tools.SWING = function () { return _SWING(); };
tools.PANNING = function () { return _createPanningEffect("MIX_ALL"); };
tools.PANNING_POS = function () { return _createPanningEffect("POS"); };
tools.PANNING_ROT = function () { return _createPanningEffect("ROT"); };
tools.PANNING_SCALE = function () { return _createPanningEffect("SCALE"); };
tools.PANNING_MIX_PR = function () { return _createPanningEffect("MIX_PR"); };
tools.PANNING_MIX_ALL = function () { return _createPanningEffect("MIX_ALL"); };
tools.FISHEYE = function () { return _FISHEYE(); };
tools.CF_COLORIZE = function() { return _CF_COLORIZE(); };
tools.CF_SCANLINE = function() { return _CF_SCANLINE(); };
tools.CF_MONO = function() { return _CF_MONO(); };
tools.CF_STARBURST = function() { return _CF_STARBURST(); };
tools.CF_GRID = function() { return _CF_GRID(); };
tools.CF_RADIO = function() { return _CF_RADIO(); };
tools.CF_GLOW_AURA = function() { return _CF_GLOW_AURA(); };
tools.CF_SOLID_AURA = function() { return _CF_SOLID_AURA(); };
tools.CF_SHATTER_SIMPLE = function() { return _CF_SHATTER_SIMPLE(); };
tools.CF_SHATTER_SLOW = function() { return _CF_SHATTER_SLOW(); };
tools.CF_DROP_BEVEL = function() { return _CF_DROP_BEVEL(); };
