function _controllerError(message) {
    return JSON.stringify({ error: true, message: message });
}

function _controllerLayer() {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) return { error: "Open a composition first." };
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) return { error: true, message: "No Layer" };
    return comp.selectedLayers[0];
}

function _controllerRead() {
    var layer = _controllerLayer();
    if (!layer || layer.error) return _controllerError(layer ? layer.error : "Select a layer first.");

    try {
        var transform = layer.property("ADBE Transform Group");
        var position = transform.property("ADBE Position");
        var scale = transform.property("ADBE Scale");
        var anchor = transform.property("ADBE Anchor Point");
        var rotation = transform.property("ADBE Rotate Z");
        var opacity = transform.property("ADBE Opacity");
        var blendMode = _controllerBlendName(layer.blendingMode);
        var result = {
            layerName: layer.name,
            is3D: !!layer.threeDLayer,
            position: position ? position.value : [0, 0],
            scale: scale ? scale.value : [100, 100],
            rotationZ: rotation ? rotation.value : 0,
            rotationX: 0,
            rotationY: 0,
            opacity: opacity ? opacity.value : 100,
            anchor: anchor ? anchor.value : [0, 0],
            blendMode: blendMode
        };

        if (layer.threeDLayer) {
            var rotateX = transform.property("ADBE Rotate X");
            var rotateY = transform.property("ADBE Rotate Y");
            result.rotationX = rotateX ? rotateX.value : 0;
            result.rotationY = rotateY ? rotateY.value : 0;
        }
        return JSON.stringify(result);
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

var _undoOpen = false;
function _controllerBeginUndo(label) {
    if (!_undoOpen) {
        try { app.beginUndoGroup(label || "Controller Drag"); _undoOpen = true; } catch (e) {}
    }
    return "true";
}
function _controllerEndUndo() {
    if (_undoOpen) {
        try { app.endUndoGroup(); _undoOpen = false; } catch (e) {}
    }
    return "true";
}
