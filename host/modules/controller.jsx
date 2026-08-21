function _controllerError(message) {
    return JSON.stringify({ error: true, message: message });
}

function _controllerLayer() {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) return { error: "Open a composition first." };
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) return { error: true, message: "No Layer" };
    return comp.selectedLayers[0];
}

function _findShapeRectProp(item) {
    if (!item) return null;
    try {
        if (item.matchName === "ADBE Vector Shape - Rect") return item;
        
        var root = item;
        if (item.property && item.property("ADBE Root Vectors Group")) {
            root = item.property("ADBE Root Vectors Group");
        }
        
        if (root && root.numProperties) {
            for (var i = 1; i <= root.numProperties; i++) {
                var prop = root.property(i);
                if (!prop) continue;
                if (prop.matchName === "ADBE Vector Shape - Rect") return prop;
                if (prop.numProperties && prop.numProperties > 0) {
                    var found = _findShapeRectProp(prop);
                    if (found) return found;
                }
            }
        }
    } catch (e) {}
    return null;
}

function _controllerReadSingle(layer, comp, compW, compH) {
    var layerW = 100;
    var layerH = 100;
    var srcRect = null;
    try {
        var sRect = layer.sourceRectAtTime(comp ? comp.time : 0, false);
        if (sRect && sRect.width > 0 && sRect.height > 0) {
            layerW = sRect.width;
            layerH = sRect.height;
            srcRect = { left: sRect.left, top: sRect.top, width: sRect.width, height: sRect.height };
        } else if (layer.width && layer.height) {
            layerW = layer.width;
            layerH = layer.height;
        }
    } catch (sErr) {
        if (layer.width && layer.height) {
            layerW = layer.width;
            layerH = layer.height;
        }
    }

    var transform = layer.property("ADBE Transform Group");
    var position = transform.property("ADBE Position");
    var scale = transform.property("ADBE Scale");
    var anchor = transform.property("ADBE Anchor Point");
    var rotation = transform.property("ADBE Rotate Z") || transform.property("ADBE Rotation") || transform.property("Rotation") || transform.property("Z Rotation");
    var opacity = transform.property("ADBE Opacity");
    var blendMode = _controllerBlendName(layer.blendingMode);

    var anchorVal = [0, 0];
    if (anchor && anchor.value) {
        anchorVal = [anchor.value[0], anchor.value[1]];
    } else if (srcRect) {
        anchorVal = [srcRect.left + srcRect.width / 2, srcRect.top + srcRect.height / 2];
    }

    var posVal = position ? [position.value[0], position.value[1], position.value.length > 2 ? position.value[2] : 0] : [compW / 2, compH / 2, 0];
    var scVal = scale ? [scale.value[0], scale.value[1]] : [100, 100];

    var single = {
        layerIndex: layer.index,
        layerName: layer.name,
        layerWidth: layerW,
        layerHeight: layerH,
        sourceRect: srcRect,
        is3D: !!layer.threeDLayer,
        position: posVal,
        scale: scVal,
        rotationZ: rotation ? rotation.value : 0,
        rotationX: 0,
        rotationY: 0,
        orientation: [0, 0, 0],
        opacity: opacity ? opacity.value : 100,
        anchor: anchorVal,
        blendMode: blendMode,
        isShape: false,
        shapeRoundness: 0
    };

    var shapeRect = _findShapeRectProp(layer);
    if (shapeRect) {
        single.isShape = true;
        var rProp = shapeRect.property("ADBE Vector Rect Roundness");
        if (rProp) single.shapeRoundness = rProp.value;
        var sProp = shapeRect.property("ADBE Vector Rect Size");
        if (sProp) {
            single.shapeSize = [sProp.value[0], sProp.value[1]];
            single.layerWidth = sProp.value[0];
            single.layerHeight = sProp.value[1];
        }
        var pProp = shapeRect.property("ADBE Vector Rect Position");
        if (pProp) single.shapePos = pProp.value;
    }

    if (layer.threeDLayer) {
        var rotateX = transform.property("ADBE Rotate X") || transform.property("X Rotation");
        var rotateY = transform.property("ADBE Rotate Y") || transform.property("Y Rotation");
        var orient = transform.property("ADBE Orientation") || transform.property("Orientation");
        single.rotationX = rotateX ? rotateX.value : 0;
        single.rotationY = rotateY ? rotateY.value : 0;
        single.orientation = (orient && orient.value) ? [orient.value[0], orient.value[1], orient.value[2]] : [0, 0, 0];
    }

    return single;
}

function _controllerRead() {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) return _controllerError("Open a composition first.");
    var selected = comp.selectedLayers;
    if (!selected || selected.length === 0) return _controllerError("No Layer");

    try {
        var compW = (comp && comp.width) ? comp.width : 1920;
        var compH = (comp && comp.height) ? comp.height : 1080;

        var layers = [];
        for (var i = 0; i < selected.length; i++) {
            layers.push(_controllerReadSingle(selected[i], comp, compW, compH));
        }

        var primary = layers[0];
        var isMulti = layers.length > 1;

        var result = {
            compWidth: compW,
            compHeight: compH,
            multiSelected: isMulti,
            layerCount: layers.length,
            layerName: isMulti ? (layers.length + " Layers Selected") : primary.layerName,
            layers: layers,
            // Primary layer fields
            layerWidth: primary.layerWidth,
            layerHeight: primary.layerHeight,
            sourceRect: primary.sourceRect,
            is3D: primary.is3D,
            position: primary.position,
            scale: primary.scale,
            rotationZ: primary.rotationZ,
            rotationX: primary.rotationX,
            rotationY: primary.rotationY,
            orientation: primary.orientation,
            opacity: primary.opacity,
            anchor: primary.anchor,
            blendMode: primary.blendMode,
            isShape: primary.isShape,
            shapeRoundness: primary.shapeRoundness,
            shapeSize: primary.shapeSize
        };

        return JSON.stringify(result);
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetShapeRoundness(value) {
    if (!isFinite(Number(value))) return _controllerError("Invalid roundness value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle shape path not found on this layer.");
        var rProp = shapeRect.property("ADBE Vector Rect Roundness");
        if (!rProp) return _controllerError("Roundness property not available.");
        var val = Math.max(0, Number(value));
        if (rProp.numKeys > 0) rProp.setValueAtTime(app.project.activeItem.time, val);
        else rProp.setValue(val);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetShapeSize(axis, value) {
    if (!isFinite(Number(value))) return _controllerError("Invalid size value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle shape path not found on this layer.");
        var sProp = shapeRect.property("ADBE Vector Rect Size");
        if (!sProp) return _controllerError("Size property not available.");
        var cur = sProp.value || [100, 100];
        var copy = [cur[0], cur[1]];
        var ax = Number(axis);
        if (ax === 0 || ax === 1) {
            copy[ax] = Math.max(0, Number(value));
        }
        if (sProp.numKeys > 0) sProp.setValueAtTime(app.project.activeItem.time, copy);
        else sProp.setValue(copy);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetShapeSizeBoth(w, h) {
    if (!isFinite(Number(w)) || !isFinite(Number(h))) return _controllerError("Invalid size values.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle shape path not found on this layer.");
        var sProp = shapeRect.property("ADBE Vector Rect Size");
        if (!sProp) return _controllerError("Size property not available.");
        var newSize = [Math.max(0, Number(w)), Math.max(0, Number(h))];
        if (sProp.numKeys > 0) sProp.setValueAtTime(app.project.activeItem.time, newSize);
        else sProp.setValue(newSize);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerBlendName(value) {
    var names = ["NORMAL", "DISSOLVE", "DARKEN", "MULTIPLY", "COLOR_BURN", "LINEAR_BURN", "DARKER_COLOR", "LIGHTEN", "SCREEN", "COLOR_DODGE", "LINEAR_DODGE", "LIGHTER_COLOR", "OVERLAY", "SOFT_LIGHT", "HARD_LIGHT", "VIVID_LIGHT", "LINEAR_LIGHT", "PIN_LIGHT", "HARD_MIX", "DIFFERENCE", "EXCLUSION", "SUBTRACT", "DIVIDE", "HUE", "SATURATION", "COLOR", "LUMINOSITY"];
    for (var i = 0; i < names.length; i++) {
        try {
            if (typeof BlendingMode[names[i]] !== "undefined" && value === BlendingMode[names[i]]) return names[i];
        } catch (e) { }
    }
    return "NORMAL";
}

function _controllerSetBlendMode(modeName) {
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    var modes = {
        NORMAL: BlendingMode.NORMAL, DISSOLVE: BlendingMode.DISSOLVE, DARKEN: BlendingMode.DARKEN,
        MULTIPLY: BlendingMode.MULTIPLY, COLOR_BURN: BlendingMode.COLOR_BURN, LINEAR_BURN: BlendingMode.LINEAR_BURN,
        DARKER_COLOR: BlendingMode.DARKER_COLOR, LIGHTEN: BlendingMode.LIGHTEN, SCREEN: BlendingMode.SCREEN,
        COLOR_DODGE: BlendingMode.COLOR_DODGE, LINEAR_DODGE: BlendingMode.LINEAR_DODGE, LIGHTER_COLOR: BlendingMode.LIGHTER_COLOR,
        OVERLAY: BlendingMode.OVERLAY, SOFT_LIGHT: BlendingMode.SOFT_LIGHT, HARD_LIGHT: BlendingMode.HARD_LIGHT,
        VIVID_LIGHT: BlendingMode.VIVID_LIGHT, LINEAR_LIGHT: BlendingMode.LINEAR_LIGHT, PIN_LIGHT: BlendingMode.PIN_LIGHT,
        HARD_MIX: BlendingMode.HARD_MIX, DIFFERENCE: BlendingMode.DIFFERENCE, EXCLUSION: BlendingMode.EXCLUSION,
        SUBTRACT: BlendingMode.SUBTRACT, DIVIDE: BlendingMode.DIVIDE, HUE: BlendingMode.HUE,
        SATURATION: BlendingMode.SATURATION, COLOR: BlendingMode.COLOR, LUMINOSITY: BlendingMode.LUMINOSITY
    };
    if (typeof modes[modeName] === "undefined") return _controllerError("Unsupported blending mode: " + modeName);
    try { layer.blendingMode = modes[modeName]; return "true"; } catch (e) { return _controllerError(e.toString()); }
}

function _controllerSet(propertyName, values) {
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var transform = layer.property("ADBE Transform Group");
        var prop = transform.property(propertyName);
        if (!prop) return _controllerError("Property is not available on this layer.");
        var value = values.length === 1 ? values[0] : values;
        if (prop.numKeys > 0) prop.setValueAtTime(app.project.activeItem.time, value);
        else prop.setValue(value);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetValue(propertyName, value) {
    if (!isFinite(Number(value))) return _controllerError("Controller received an invalid numeric value.");
    return _controllerSet(propertyName, [Number(value)]);
}

function _controllerSetAxis(propertyName, axis, value) {
    if (!isFinite(Number(value))) return _controllerError("Controller received an invalid numeric value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var prop = layer.property("ADBE Transform Group").property(propertyName);
        if (!prop) return _controllerError("Property is not available on this layer.");
        var current = prop.value;
        if (!current || typeof current.length !== "number") return _controllerError("Property is not a vector.");
        var copy = [];
        for (var i = 0; i < current.length; i++) copy.push(current[i]);
        if (Number(axis) >= copy.length) return _controllerError("Axis is not available on this layer.");
        copy[Number(axis)] = Number(value);
        if (prop.numKeys > 0) prop.setValueAtTime(app.project.activeItem.time, copy);
        else prop.setValue(copy);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetVector(propertyName, x, y, z) {
    var values = [Number(x), Number(y)];
    if (z !== null && z !== undefined && z !== "") values.push(Number(z));
    return _controllerSet(propertyName, values);
}

function _controllerSetPositionXY(x, y) {
    if (!isFinite(Number(x)) || !isFinite(Number(y))) return _controllerError("Invalid XY value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var transform = layer.property("ADBE Transform Group");
        var pos = transform.property("ADBE Position");
        if (!pos) return _controllerError("Position not available.");
        if (pos.dimensionsSeparated) {
            var subX = transform.property("ADBE Position_0");
            var subY = transform.property("ADBE Position_1");
            if (subX) { if (subX.numKeys > 0) subX.setValueAtTime(app.project.activeItem.time, Number(x)); else subX.setValue(Number(x)); }
            if (subY) { if (subY.numKeys > 0) subY.setValueAtTime(app.project.activeItem.time, Number(y)); else subY.setValue(Number(y)); }
        } else {
            var cur = pos.value;
            var newPos = [Number(x), Number(y)];
            if (cur && cur.length > 2) newPos.push(cur[2]);
            if (pos.numKeys > 0) pos.setValueAtTime(app.project.activeItem.time, newPos);
            else pos.setValue(newPos);
        }
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetPositionAxis(axis, value) {
    if (!isFinite(Number(value))) return _controllerError("Controller received an invalid numeric value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var transform = layer.property("ADBE Transform Group");
        var pos = transform.property("ADBE Position");
        if (!pos) return _controllerError("Position property not available.");
        if (!pos.dimensionsSeparated) pos.dimensionsSeparated = true;
        var subPropName = (Number(axis) === 0) ? "ADBE Position_0"
                        : (Number(axis) === 1) ? "ADBE Position_1"
                        :                        "ADBE Position_2";
        var sub = transform.property(subPropName);
        if (!sub) return _controllerError("Separated position axis not available.");
        if (sub.numKeys > 0) sub.setValueAtTime(app.project.activeItem.time, Number(value));
        else sub.setValue(Number(value));
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetPositionZ(z) {
    if (!isFinite(Number(z))) return _controllerError("Invalid Z value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var transform = layer.property("ADBE Transform Group");
        var pos = transform.property("ADBE Position");
        if (!pos) return _controllerError("Position not available.");
        if (pos.dimensionsSeparated) {
            var subZ = transform.property("ADBE Position_2");
            if (!subZ) return _controllerError("Z Position sub-property not available.");
            if (subZ.numKeys > 0) subZ.setValueAtTime(app.project.activeItem.time, Number(z));
            else subZ.setValue(Number(z));
        } else {
            var cur = pos.value;
            if (!cur || cur.length < 3) return _controllerError("Not a 3D layer (position has no Z axis).");
            var next = [cur[0], cur[1], Number(z)];
            if (pos.numKeys > 0) pos.setValueAtTime(app.project.activeItem.time, next);
            else pos.setValue(next);
        }
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerCommit(actionType, values) {
    if (!values || !values.length) return _controllerError("No values provided.");
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) return _controllerError("Open a composition first.");
    var selected = comp.selectedLayers;
    if (!selected || selected.length === 0) return _controllerError("Select a layer first.");

    var isMulti = selected.length > 1;
    var undoTitle = "Controller Edit";
    if (actionType === "position") undoTitle = "Move " + (isMulti ? "Layers" : "Layer");
    else if (actionType === "anchor") undoTitle = "Move Anchor Point";
    else if (actionType === "z") undoTitle = "Move Z Position";
    else if (actionType === "scale") undoTitle = "Scale " + (isMulti ? "Layers" : "Layer");
    else if (actionType === "shapesize") undoTitle = "Resize Shape";
    else if (actionType === "rotate") undoTitle = "Rotate " + (isMulti ? "Layers" : "Layer");
    else if (actionType === "opacity") undoTitle = "Layer Opacity";
    else if (actionType === "shaperoundness") undoTitle = "Shape Roundness";

    app.beginUndoGroup(undoTitle);
    try {
        var time = comp.time;
        for (var i = 0; i < selected.length; i++) {
            var layer = selected[i];
            var transform = layer.property("ADBE Transform Group");
            if (!transform) continue;

            if (actionType === "position") {
                var pos = transform.property("ADBE Position");
                if (pos) {
                    var dx = values.length >= 4 ? Number(values[3]) : 0;
                    var dy = values.length >= 5 ? Number(values[4]) : 0;
                    var dz = values.length >= 6 ? Number(values[5]) : 0;

                    if (isMulti && values.length >= 4) {
                        var curP = pos.value || [0, 0, 0];
                        var nX = curP[0] + dx;
                        var nY = curP[1] + dy;
                        var nZ = (curP.length > 2 ? curP[2] : 0) + dz;
                        if (pos.dimensionsSeparated) {
                            var sX = transform.property("ADBE Position_0");
                            var sY = transform.property("ADBE Position_1");
                            var sZ = transform.property("ADBE Position_2");
                            if (sX) { if (sX.numKeys > 0) sX.setValueAtTime(time, nX); else sX.setValue(nX); }
                            if (sY) { if (sY.numKeys > 0) sY.setValueAtTime(time, nY); else sY.setValue(nY); }
                            if (sZ && layer.threeDLayer) { if (sZ.numKeys > 0) sZ.setValueAtTime(time, nZ); else sZ.setValue(nZ); }
                        } else {
                            var nPos = [nX, nY];
                            if (curP.length > 2 || layer.threeDLayer) nPos.push(nZ);
                            if (pos.numKeys > 0) pos.setValueAtTime(time, nPos);
                            else pos.setValue(nPos);
                        }
                    } else {
                        var x = Number(values[0]);
                        var y = Number(values[1]);
                        var z = values.length > 2 ? Number(values[2]) : (pos.value && pos.value.length > 2 ? pos.value[2] : 0);
                        if (pos.dimensionsSeparated) {
                            var subX = transform.property("ADBE Position_0");
                            var subY = transform.property("ADBE Position_1");
                            var subZ = transform.property("ADBE Position_2");
                            if (subX) { if (subX.numKeys > 0) subX.setValueAtTime(time, x); else subX.setValue(x); }
                            if (subY) { if (subY.numKeys > 0) subY.setValueAtTime(time, y); else subY.setValue(y); }
                            if (subZ && layer.threeDLayer) { if (subZ.numKeys > 0) subZ.setValueAtTime(time, z); else subZ.setValue(z); }
                        } else {
                            var newPos = [x, y];
                            if (pos.value && pos.value.length > 2) newPos.push(z);
                            if (pos.numKeys > 0) pos.setValueAtTime(time, newPos);
                            else pos.setValue(newPos);
                        }
                    }
                }
            } else if (actionType === "scale") {
                var sc = transform.property("ADBE Scale");
                if (sc) {
                    if (isMulti && values.length >= 3) {
                        var dScX = Number(values[2]);
                        var dScY = values.length >= 4 ? Number(values[3]) : dScX;
                        var curSc = sc.value || [100, 100, 100];
                        var nSc = [Math.max(0.1, curSc[0] + dScX), Math.max(0.1, curSc[1] + dScY)];
                        if (curSc.length > 2) nSc.push(curSc[2]);
                        if (sc.numKeys > 0) sc.setValueAtTime(time, nSc);
                        else sc.setValue(nSc);
                    } else {
                        var newSc = [Number(values[0]), Number(values[1])];
                        if (sc.value && sc.value.length > 2) newSc.push(sc.value[2]);
                        if (sc.numKeys > 0) sc.setValueAtTime(time, newSc);
                        else sc.setValue(newSc);
                    }
                }
            } else if (actionType === "rotate") {
                var axis = values[0] || "Z";
                var rProp = null;
                if (axis === "X") {
                    rProp = transform.property("ADBE Rotate X") || transform.property("X Rotation");
                } else if (axis === "Y") {
                    rProp = transform.property("ADBE Rotate Y") || transform.property("Y Rotation");
                } else {
                    rProp = transform.property("ADBE Rotate Z") || transform.property("ADBE Rotation") || transform.property("Rotation") || transform.property("Z Rotation");
                }
                if (rProp) {
                    if (isMulti && values.length >= 3) {
                        var dRot = Number(values[2]);
                        var curR = rProp.value || 0;
                        var nR = curR + dRot;
                        if (rProp.numKeys > 0) rProp.setValueAtTime(time, nR);
                        else rProp.setValue(nR);
                    } else {
                        var rotVal = Number(values[1]);
                        if (rProp.numKeys > 0) rProp.setValueAtTime(time, rotVal);
                        else rProp.setValue(rotVal);
                    }
                }
            } else if (actionType === "opacity") {
                var op = transform.property("ADBE Opacity");
                if (op) {
                    if (isMulti && values.length >= 2) {
                        var dOp = Number(values[1]);
                        var curOp = op.value || 100;
                        var nOp = Math.max(0, Math.min(100, curOp + dOp));
                        if (op.numKeys > 0) op.setValueAtTime(time, nOp);
                        else op.setValue(nOp);
                    } else {
                        var opVal = Math.max(0, Math.min(100, Number(values[0])));
                        if (op.numKeys > 0) op.setValueAtTime(time, opVal);
                        else op.setValue(opVal);
                    }
                }
            } else if (actionType === "shapesize") {
                var shapeRect = _findShapeRectProp(layer);
                if (shapeRect) {
                    var sProp = shapeRect.property("ADBE Vector Rect Size");
                    if (sProp) {
                        var newSize = [Number(values[0]), Number(values[1])];
                        if (sProp.numKeys > 0) sProp.setValueAtTime(time, newSize);
                        else sProp.setValue(newSize);
                    }
                }
            } else if (actionType === "shaperoundness") {
                var shapeRectR = _findShapeRectProp(layer);
                if (shapeRectR) {
                    var rdProp = shapeRectR.property("ADBE Vector Rect Roundness");
                    if (rdProp) {
                        var rdVal = Math.max(0, Number(values[0]));
                        if (rdProp.numKeys > 0) rdProp.setValueAtTime(time, rdVal);
                        else rdProp.setValue(rdVal);
                    }
                }
            } else if (actionType === "anchor") {
                var anc = transform.property("ADBE Anchor Point");
                if (anc) {
                    var newAnc = [Number(values[0]), Number(values[1])];
                    if (anc.numKeys > 0) anc.setValueAtTime(time, newAnc);
                    else anc.setValue(newAnc);
                }
            } else if (actionType === "z") {
                var posZ = transform.property("ADBE Position");
                if (posZ) {
                    var zVal = Number(values[0]);
                    if (posZ.dimensionsSeparated) {
                        var subZ = transform.property("ADBE Position_2");
                        if (subZ) { if (subZ.numKeys > 0) subZ.setValueAtTime(time, zVal); else subZ.setValue(zVal); }
                    } else {
                        var curPZ = posZ.value || [0, 0, 0];
                        var newPZ = [curPZ[0], curPZ[1], zVal];
                        if (posZ.numKeys > 0) posZ.setValueAtTime(time, newPZ);
                        else posZ.setValue(newPZ);
                    }
                }
            }
        }
    } catch (e) {
        try { app.endUndoGroup(); } catch (err) {}
        return _controllerError(e.toString());
    }
    try { app.endUndoGroup(); } catch (e) {}
    return JSON.stringify({ success: true });
}

var _undoOpen = false;
function _controllerBeginUndo(label) {
    if (_undoOpen) {
        try { app.endUndoGroup(); } catch (e) {}
        _undoOpen = false;
    }
    try {
        app.beginUndoGroup(label || "Controller Drag");
        _undoOpen = true;
    } catch (e) {}
    return "true";
}
function _controllerEndUndo() {
    if (_undoOpen) {
        try {
            app.endUndoGroup();
        } catch (e) {}
        _undoOpen = false;
    }
    return "true";
}

function _controllerSetShapeRoundness(value) {
    if (!isFinite(Number(value))) return _controllerError("Invalid numeric value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle path not found on shape layer.");
        var rdProp = shapeRect.property("ADBE Vector Rect Roundness");
        if (!rdProp) return _controllerError("Roundness property not found.");
        var val = Math.max(0, Number(value));
        if (rdProp.numKeys > 0) rdProp.setValueAtTime(app.project.activeItem.time, val);
        else rdProp.setValue(val);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetShapeSize(axis, value) {
    if (!isFinite(Number(value))) return _controllerError("Invalid numeric value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle path not found on shape layer.");
        var sProp = shapeRect.property("ADBE Vector Rect Size");
        if (!sProp) return _controllerError("Size property not found.");
        var cur = sProp.value || [100, 100];
        var idx = Number(axis) === 1 ? 1 : 0;
        var next = [cur[0], cur[1]];
        next[idx] = Math.max(0, Number(value));
        if (sProp.numKeys > 0) sProp.setValueAtTime(app.project.activeItem.time, next);
        else sProp.setValue(next);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}

function _controllerSetShapeSizeBoth(w, h) {
    if (!isFinite(Number(w)) || !isFinite(Number(h))) return _controllerError("Invalid numeric value.");
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");
    try {
        var shapeRect = _findShapeRectProp(layer);
        if (!shapeRect) return _controllerError("Rectangle path not found on shape layer.");
        var sProp = shapeRect.property("ADBE Vector Rect Size");
        if (!sProp) return _controllerError("Size property not found.");
        var next = [Math.max(0, Number(w)), Math.max(0, Number(h))];
        if (sProp.numKeys > 0) sProp.setValueAtTime(app.project.activeItem.time, next);
        else sProp.setValue(next);
        return "true";
    } catch (e) {
        return _controllerError(e.toString());
    }
}
