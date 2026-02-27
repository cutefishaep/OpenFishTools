function _PNG() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"message":"Please select a composition first!"}';

    var d = new Date();
    var defaultName = "SS_" + d.getTime() + ".png";
    var file = File.saveDialog("Save Screenshot PNG", "Portable Network Graphics:*.png");

    if (file) {
        if (typeof comp.saveFrameToPng === "function") {
            try {
                comp.saveFrameToPng(comp.time, file);
                return '{"error":false, "type":"info", "message":"Screenshot saved successfully!"}';
            } catch (e) {
                return '{"error":true, "message":"Failed to save PNG: ' + e.toString() + '"}';
            }
        } else {
            return '{"error":true, "type":"warn", "message":"This AE version does not support automatic PNG saving (Requires v22.0+)."}';
        }
    }
    return "false";
}

function _CUBE(w, h, d, useLayer) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"message":"Please select a composition first!"}';

    app.beginUndoGroup("Create 3D Cube");
    try {
        var selLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;

        var boxW = parseFloat(w) || 100;
        var boxH = parseFloat(h) || 100;
        var boxD = parseFloat(d) || 100;

        if (useLayer && selLayer) {
            var sz = _getLayerSize(selLayer);
            boxW = sz[0];
            boxH = sz[1];

            boxD = Math.min(boxW, boxH);
        }

        var sides = [];
        var sideNames = ["Front", "Back", "Left", "Right", "Top", "Bottom"];


        for (var i = 0; i < 6; i++) {
            var side;
            if (selLayer) {
                side = selLayer.duplicate();
            } else {
                side = comp.layers.addSolid([0.5, 0.5, 0.5], sideNames[i], boxW, boxH, 1.0);
            }
            side.threeDLayer = true;
            side.name = "Cube_" + sideNames[i];
            sides.push(side);
        }


        var controller = comp.layers.addNull();
        controller.name = "Cube_Controller";
        controller.threeDLayer = true;
        controller.position.setValue([comp.width / 2, comp.height / 2, 0]);

        var halfW = boxW / 2;
        var halfH = boxH / 2;
        var halfD = boxD / 2;

        for (var i = 0; i < 6; i++) {

            var sz = _getLayerSize(sides[i]);
            sides[i].anchorPoint.setValue([sz[0] / 2, sz[1] / 2, 0]);


            sides[i].position.setValue([0, 0, 0]);


            sides[i].parent = controller;


            var localPos = [0, 0, 0];
            var localOri = [0, 0, 0];
            var targetWSide = boxW;
            var targetHSide = boxH;

            if (i == 0) {
                localPos = [0, 0, -halfD];
                localOri = [0, 0, 0];
                targetWSide = boxW; targetHSide = boxH;
            } else if (i == 1) {
                localPos = [0, 0, halfD];
                localOri = [0, 180, 0];
                targetWSide = boxW; targetHSide = boxH;
            } else if (i == 2) {
                localPos = [-halfW, 0, 0];
                localOri = [0, 90, 0];
                targetWSide = boxD; targetHSide = boxH;
            } else if (i == 3) {
                localPos = [halfW, 0, 0];
                localOri = [0, 270, 0];
                targetWSide = boxD; targetHSide = boxH;
            } else if (i == 4) {
                localPos = [0, -halfH, 0];
                localOri = [90, 0, 0];
                targetWSide = boxW; targetHSide = boxD;
            } else if (i == 5) {
                localPos = [0, halfH, 0];
                localOri = [270, 0, 0];
                targetWSide = boxW; targetHSide = boxD;
            }

            sides[i].position.setValue(localPos);
            sides[i].orientation.setValue(localOri);


            var currentW = sz[0];
            var currentH = sz[1];
            sides[i].scale.setValue([100 * targetWSide / currentW, 100 * targetHSide / currentH, 100]);
        }

        app.endUndoGroup();
        return '{"error":false, "message":"Cube generated successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true, "message":"Cube error: ' + e.toString() + '"}';
    }
}

function _PURGE(target) {
    try {
        if (target === 'ALL') {
            app.purge(PurgeTarget.ALL_CACHES);
            app.purge(PurgeTarget.UNDO_CACHES);
            app.purge(PurgeTarget.IMAGE_CACHES);
            app.purge(PurgeTarget.SNAPSHOT_CACHES);
        } else if (target === 'CACHE') {
            app.purge(PurgeTarget.ALL_CACHES);
        } else if (target === 'MEMORY') {
            app.purge(PurgeTarget.IMAGE_CACHES);
        } else if (target === 'UNDO') {
            app.purge(PurgeTarget.UNDO_CACHES);
        }
        return '{"error":false, "message":"Purge ' + target + ' complete."}';
    } catch (e) {
        return '{"error":true, "message":"Purge error: ' + e.toString() + '"}';
    }
}

function _addBeatMark() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
    try {
        app.executeCommand(2157);
        return String(comp.markerProperty.numKeys);
    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

function _clearBeatMarks() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
    try {
        app.beginUndoGroup("Clear Beat Marks");
        var markers = comp.markerProperty;
        while (markers.numKeys > 0) {
            markers.removeKey(1);
        }
        app.endUndoGroup();
        return "0";
    } catch (e) {
        app.endUndoGroup();
        return "ERROR:" + e.toString();
    }
}

function _DEBUG_ALL() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition.";
    var layer = comp.selectedLayers[0];
    if (!layer) return "Please select a layer.";

    var frameRate = 1 / comp.frameDuration;
    var output = "FULL DEBUG: " + layer.name + "\r";
    output += "--------------------------------\r";

    var effects = layer.effect;
    if (!effects || effects.numProperties === 0) effects = layer.property("ADBE Effect Group");
    if (!effects || effects.numProperties === 0) effects = layer.property("Effects");

    if (!effects || effects.numProperties === 0) return output + "No effects found.";

    for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        output += "\r[" + i + "] " + effect.name + " (" + effect.matchName + ")\r";

        for (var j = 1; j <= effect.numProperties; j++) {
            try {
                var prop = effect.property(j);
                if (prop.propertyType === PropertyType.PROPERTY) {
                    var valStr = "[Value Error]";
                    try {
                        var v = prop.value;
                        if (v instanceof Array) valStr = "[" + v.join(", ") + "]";
                        else valStr = v.toString();
                    } catch (e) { }

                    output += "  - " + prop.name + " (" + prop.matchName + ") val: " + valStr + "\r";
                    output += "    Path: layer" + _getSimplePath(prop) + "\r";

                    if (prop.numKeys > 0) {
                        for (var k = 1; k <= prop.numKeys; k++) {
                            var kv = prop.keyValue(k);
                            if (kv instanceof Array) kv = "[" + kv.join(", ") + "]";
                            var kt = prop.keyTime(k);
                            var kf = Math.round(kt * frameRate);

                            var easeStr = "";
                            try {
                                if (prop.keyInTemporalEase(k).length > 0) {
                                    var inE = prop.keyInTemporalEase(k)[0];
                                    var outE = prop.keyOutTemporalEase(k)[0];
                                    easeStr = " [Ease: " + Math.round(inE.influence) + "% / " + Math.round(outE.influence) + "%]";
                                }
                            } catch (e) { }

                            output += "    Key " + k + ": Frame " + kf + " (" + kt.toFixed(2) + "s) val: " + kv + easeStr + "\r";
                        }
                    }
                }
            } catch (err) { }
        }
    }
    return output;
}

function _OVERLAP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;
    var layer = selectedLayers[0];


    if (layer.threeDLayer) {
        return _OVERLAP_3D(comp, layer);
    } else {
        return _OVERLAP_2D(comp, layer);
    }
}

function _OVERLAP_2D(comp, layer) {
    app.beginUndoGroup("2D Overlap (Leapfrog Rig)");
    try {

        var transform = layer.property("ADBE Transform Group");


        var propertyNames = [
            { name: "ADBE Position", matchName: "ADBE Position", dimensions: 2 },
            { name: "ADBE Scale", matchName: "ADBE Scale", dimensions: 2 },
            { name: "ADBE Rotate Z", matchName: "ADBE Rotate Z", dimensions: 1 }
        ];

        var nullsCreated = [];
        var firstKfValues = {};


        for (var p = 0; p < propertyNames.length; p++) {
            var propInfo = propertyNames[p];
            var prop = transform.property(propInfo.matchName);

            if (!prop || prop.numKeys < 2) continue;


            var keyframes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keyframes.push({
                    time: prop.keyTime(k),
                    value: prop.keyValue(k),
                    index: k
                });
            }


            firstKfValues[propInfo.matchName] = keyframes[0].value;



            for (var i = 0; i < keyframes.length - 1; i++) {
                var startKf = keyframes[i];
                var endKf = keyframes[i + 1];


                var nullLayer = comp.layers.addNull();
                nullLayer.name = "Overlap_" + propInfo.name.replace("ADBE ", "") + "_" + (i + 1);
                nullLayer.label = 14;
                nullLayer.shy = true;


                var nullStartTime = startKf.time;
                var nullEndTime = (i + 2 < keyframes.length) ? keyframes[i + 2].time : endKf.time + (endKf.time - startKf.time);


                nullLayer.inPoint = nullStartTime;
                nullLayer.outPoint = nullEndTime;


                var nullProp = nullLayer.property("ADBE Transform Group").property(propInfo.matchName);


                var actualDims = (propInfo.dimensions === 1) ? 1 : nullProp.value.length;


                if (actualDims === 1) {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                } else {
                    var startVal = [];
                    var endVal = [];

                    for (var d = 0; d < actualDims; d++) {

                        var s = (d < propInfo.dimensions) ? startKf.value[d] : ((propInfo.matchName === "ADBE Scale") ? 100 : 0);
                        var e = (d < propInfo.dimensions) ? endKf.value[d] : ((propInfo.matchName === "ADBE Scale") ? 100 : 0);

                        startVal.push(s);
                        endVal.push(e);
                    }

                    nullProp.setValueAtTime(nullStartTime, startVal);
                    nullProp.setValueAtTime(nullEndTime, endVal);
                }



                var transitionDuration = nullEndTime - nullStartTime;
                var ratio = (transitionDuration > 0) ? (endKf.time - nullStartTime) / transitionDuration : 0.5;
                var baseInfluence = 85;
                var influenceOut = Math.max(33, Math.min(100, ratio * 2 * baseInfluence));
                var influenceIn = Math.max(33, Math.min(100, (1 - ratio) * 2 * baseInfluence));



                var easeDims = nullProp.keyInTemporalEase(1).length;

                var easeOutSymmetric = [];
                var easeInSymmetric = [];

                for (var d = 0; d < easeDims; d++) {
                    easeOutSymmetric.push(new KeyframeEase(0, influenceOut));
                    easeInSymmetric.push(new KeyframeEase(0, influenceIn));
                }


                nullProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                nullProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

                nullProp.setTemporalEaseAtKey(1, nullProp.keyInTemporalEase(1), easeOutSymmetric);
                nullProp.setTemporalEaseAtKey(2, easeInSymmetric, nullProp.keyOutTemporalEase(2));


                nullsCreated.push({
                    layer: nullLayer,
                    property: propInfo.matchName
                });
            }
        }


        if (nullsCreated.length > 0) {

            nullsCreated.reverse();


            layer.parent = nullsCreated[0].layer;


            for (var n = 0; n < nullsCreated.length - 1; n++) {
                nullsCreated[n].layer.parent = nullsCreated[n + 1].layer;
            }


            for (var p = 0; p < propertyNames.length; p++) {
                var propInfo = propertyNames[p];
                var prop = transform.property(propInfo.matchName);

                if (!prop) continue;


                while (prop.numKeys > 0) {
                    prop.removeKey(1);
                }


                if (propInfo.matchName === "ADBE Position") {
                    prop.setValue([0, 0]);
                } else if (propInfo.matchName === "ADBE Scale") {
                    prop.setValue([100, 100]);
                } else if (propInfo.matchName === "ADBE Rotate Z") {
                    prop.setValue(0);
                }
            }
        }

        return true;
    } catch (err) {
        return '{"error":true,"tool":"OVERLAP","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}

function _OVERLAP_3D(comp, layer) {
    app.beginUndoGroup("3D Overlap (Leapfrog Rig)");
    try {
        var transform = layer.property("ADBE Transform Group");


        var propDefs = [
            { matchName: "ADBE Position", dims: 3, defaultVal: [0, 0, 0] },
            { matchName: "ADBE Scale", dims: 3, defaultVal: [100, 100, 100] },
            { matchName: "ADBE Rotate X", dims: 1, defaultVal: 0 },
            { matchName: "ADBE Rotate Y", dims: 1, defaultVal: 0 },
            { matchName: "ADBE Rotate Z", dims: 1, defaultVal: 0 }
        ];

        var nullsCreated = [];
        var firstKfValues = {};


        for (var p = 0; p < propDefs.length; p++) {
            var def = propDefs[p];
            var prop = transform.property(def.matchName);

            if (!prop || prop.numKeys < 2) continue;


            var keyframes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keyframes.push({
                    time: prop.keyTime(k),
                    value: prop.keyValue(k)
                });
            }


            firstKfValues[def.matchName] = keyframes[0].value;


            for (var i = 0; i < keyframes.length - 1; i++) {
                var startKf = keyframes[i];
                var endKf = keyframes[i + 1];

                var nullLayer = comp.layers.addNull();
                nullLayer.name = "3DCam_" + def.matchName.replace("ADBE ", "") + "_" + (i + 1);
                nullLayer.threeDLayer = true;
                nullLayer.label = 11;
                nullLayer.shy = true;


                var nullStartTime = startKf.time;
                var nullEndTime = (i + 2 < keyframes.length) ? keyframes[i + 2].time : endKf.time + (endKf.time - startKf.time);

                nullLayer.inPoint = nullStartTime;
                nullLayer.outPoint = nullEndTime;

                var nullProp = nullLayer.property("ADBE Transform Group").property(def.matchName);


                if (def.dims === 1) {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                } else {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                }


                if (nullProp.numKeys === 2) {
                    var transitionDuration = nullEndTime - nullStartTime;
                    var ratio = (transitionDuration > 0) ? (endKf.time - nullStartTime) / transitionDuration : 0.5;
                    var baseInfluence = 85;
                    var influenceOut = Math.max(33, Math.min(100, ratio * 2 * baseInfluence));
                    var influenceIn = Math.max(33, Math.min(100, (1 - ratio) * 2 * baseInfluence));

                    var easeDims = nullProp.keyInTemporalEase(1).length;
                    var easeOut = [];
                    var easeIn = [];
                    for (var d = 0; d < easeDims; d++) {
                        easeOut.push(new KeyframeEase(0, influenceOut));
                        easeIn.push(new KeyframeEase(0, influenceIn));
                    }

                    nullProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    nullProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

                    nullProp.setTemporalEaseAtKey(1, nullProp.keyInTemporalEase(1), easeOut);
                    nullProp.setTemporalEaseAtKey(2, easeIn, nullProp.keyOutTemporalEase(2));
                }

                nullsCreated.push(nullLayer);
            }
        }


        if (nullsCreated.length > 0) {
            nullsCreated.reverse();

            layer.parent = nullsCreated[0];

            for (var n = 0; n < nullsCreated.length - 1; n++) {
                nullsCreated[n].parent = nullsCreated[n + 1];
            }


            for (var p = 0; p < propDefs.length; p++) {
                var def = propDefs[p];
                var prop = transform.property(def.matchName);
                if (!prop) continue;

                while (prop.numKeys > 0) {
                    prop.removeKey(1);
                }

                prop.setValue(def.defaultVal);
            }
        }

        return true;
    } catch (err) {
        return '{"error":true,"tool":"OVERLAP","type":"error","message":"' + err.toString().replace(/"/g, "'") + ' (Line ' + err.line + ')"}';
    } finally {
        app.endUndoGroup();
    }
}

// Tool registration
tools.PNG = function () { return _PNG(); };
tools.CUBE = function (w, h, d, useLayer) { return _CUBE(w, h, d, useLayer); };
tools.PURGE = function (target) { return _PURGE(target); };
tools.BEATMARK = function () { return _addBeatMark(); };
tools.CLEARBEATS = function () { return _clearBeatMarks(); };
tools.DEBUG_ALL = function () { return _DEBUG_ALL(); };
tools.OVERLAP = function () { return _OVERLAP(); };
