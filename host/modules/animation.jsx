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
    if (!comp || comp.selectedLayers.length === 0) return false;
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Exposure Flash");
    try {
        var adj = comp.layers.addSolid([0, 0, 0], "Exposure Flash", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.moveBefore(layer);
        adj.label = 5;

        var expo = adj.Effects.addProperty("ADBE Exposure");

        var masterExpo = null;
        for (var k = 1; k <= expo.numProperties; k++) {
            var prop = expo.property(k);
            if (prop && prop.name === "Exposure" && prop.canSetExpression) {
                masterExpo = prop;
                break;
            }
        }

        if (!masterExpo && expo.numProperties >= 3) {
            masterExpo = expo.property(3);
        }

        if (!masterExpo) {
            alert("Could not find Exposure property.");
            return false;
        }

        var markers = _getLayerMarkers(layer);
        var fd = comp.frameDuration;

        for (var i = 0; i < markers.length; i++) {
            var t = markers[i];

            masterExpo.setValueAtTime(t - fd, 0);

            var kIdxZero = masterExpo.nearestKeyIndex(t - fd);
            if (kIdxZero > 0) {
                var easeStd = new KeyframeEase(0, 33.33);
                masterExpo.setTemporalEaseAtKey(kIdxZero, [easeStd], [easeStd]);
            }

            masterExpo.setValueAtTime(t, 1);

            var kIdxPeak = masterExpo.nearestKeyIndex(t);
            if (kIdxPeak > 0) {
                var easeStd2 = new KeyframeEase(0, 33.33);
                masterExpo.setTemporalEaseAtKey(kIdxPeak, [easeStd2], [easeStd2]);
            }
        }

        return true;
    } catch (err) {
        alert("Exposure Flash Error: " + err.toString());
        return false;
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


        var lens = adj.Effects.addProperty("ADBE Camera Lens Blur");
        if (!lens) {

            lens = adj.Effects.addProperty("ADBE Fast Blur");
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

        var markers = _getLayerMarkers(layer);
        var fd = comp.frameDuration;

        for (var i = 0; i < markers.length; i++) {
            var t = markers[i];


            blurRadius.setValueAtTime(t - fd, 0);

            var kIdxZero = blurRadius.nearestKeyIndex(t - fd);
            if (kIdxZero > 0) {
                var easeInSlow = new KeyframeEase(0, 100);
                blurRadius.setTemporalEaseAtKey(kIdxZero, [easeInSlow], blurRadius.keyOutTemporalEase(kIdxZero));
            }


            blurRadius.setValueAtTime(t, 50);

            var kIdxPeak = blurRadius.nearestKeyIndex(t);
            if (kIdxPeak > 0) {
                var easeOutFast = new KeyframeEase(0, 0.1);
                blurRadius.setTemporalEaseAtKey(kIdxPeak, blurRadius.keyInTemporalEase(kIdxPeak), [easeOutFast]);
            }
        }

        return true;
    } catch (err) {
        return '{"error":true,"tool":"LENS","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}

function _SHAKE() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return false;
    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Apply S_Shake");
    try {

        var adj = comp.layers.addSolid([0, 0, 0], "S_Shake Adjust", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.label = 5;

        try {
            if (adj.index !== layer.index - 1) adj.moveBefore(layer);
        } catch (e) { }

        var shake = adj.Effects.addProperty("S_Shake");
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

        var markers = _getLayerMarkers(layer);
        var fd = comp.frameDuration;

        for (var i = 0; i < markers.length; i++) {
            var t = markers[i];

            amp.setValueAtTime(t - fd, 0);
            var kIdxZero = amp.nearestKeyIndex(t - fd);
            var easeInSlow = new KeyframeEase(0, 100);
            amp.setTemporalEaseAtKey(kIdxZero, [easeInSlow], amp.keyOutTemporalEase(kIdxZero));

            amp.setValueAtTime(t, 1);
            var kIdxPeak = amp.nearestKeyIndex(t);
            var easeOutFast = new KeyframeEase(0, 0.1);
            amp.setTemporalEaseAtKey(kIdxPeak, amp.keyInTemporalEase(kIdxPeak), [easeOutFast]);
        }

        return true;
    } catch (err) {
        alert("S_Shake Error: " + err.toString());
        return false;
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
        mt.property("ADBE Tile-0004").setValue(300);
        mt.property("ADBE Tile-0005").setValue(300);
        mt.property("ADBE Tile-0006").setValue(1);
        mt.property("ADBE Tile-0007").setValue(0);
        mt.property("ADBE Tile-0008").setValue(0);

        
        var ww1 = adj.property("ADBE Effect Parade").addProperty("ADBE Wave Warp");
        ww1.property("ADBE Wave Warp-0001").setValue(1);
        ww1.property("ADBE Wave Warp-0003").setValue(800);
        ww1.property("ADBE Wave Warp-0004").setValue(45);
        ww1.property("ADBE Wave Warp-0005").setValue(2);
        ww1.property("ADBE Wave Warp-0006").setValue(1);
        ww1.property("ADBE Wave Warp-0008").setValue(1);

        var wh1 = ww1.property("ADBE Wave Warp-0002");
        wh1.setValueAtTime(t1, 0);
        wh1.setValueAtTime(t2, 100);
        wh1.setValueAtTime(t3, 0);
        _applyMidWaveEase(wh1);

        
        var ww2 = adj.property("ADBE Effect Parade").addProperty("ADBE Wave Warp");
        ww2.property("ADBE Wave Warp-0001").setValue(1);
        ww2.property("ADBE Wave Warp-0003").setValue(800);
        ww2.property("ADBE Wave Warp-0004").setValue(-45);
        ww2.property("ADBE Wave Warp-0005").setValue(2);
        ww2.property("ADBE Wave Warp-0006").setValue(1);
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
        nullLayer.name = "Oscillate_Null";
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

        var posExpr = [
            "freq = effect(\"Freq\")(\"ADBE Slider Control-0001\");",
            "amp = effect(\"Amp\")(\"ADBE Slider Control-0001\");",
            "decay = effect(\"Decay\")(\"ADBE Slider Control-0001\");",
            "",
            "m = thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint){",
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
            "            currAmp = amp / Math.exp(t * decay);",
            "",
            "            x = Math.cos(t * freq * Math.PI * 2) * currAmp;",
            "            y = Math.sin(t * freq * Math.PI * 2) * currAmp;",
            "",
            "            value + [x, y];",
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
            "m = thisComp.marker;",
            "",
            "if (time < inPoint || time > outPoint){",
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
        
        var grid = effects.addProperty("ADBE Grid");
        grid.property("ADBE Grid-0002").setValue(4);  
        grid.property("ADBE Grid-0004").setValue(32); 
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
tools.SWING = function () { return _SWING(); };
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
