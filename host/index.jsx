/*
 * FishTools - Host Script
 * Copyright (c) 2024
 */

"object" != typeof JSON && (JSON = {}), function () { "use strict"; var rx_one = /^[\],:{}\s]*$/, rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, rx_four = /(?:^|:|,)(?:\s*\[)+/g, rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta, rep; function f(t) { return t < 10 ? "0" + t : t } function this_value() { return this.valueOf() } function quote(t) { return rx_escapable.lastIndex = 0, rx_escapable.test(t) ? '"' + t.replace(rx_escapable, function (t) { var e = meta[t]; return "string" == typeof e ? e : "\\u" + ("0000" + t.charCodeAt(0).toString(16)).slice(-4) }) + '"' : '"' + t + '"' } function str(t, e) { var r, n, o, u, f, a = gap, i = e[t]; switch (i && "object" == typeof i && "function" == typeof i.toJSON && (i = i.toJSON(t)), "function" == typeof rep && (i = rep.call(e, t, i)), typeof i) { case "string": return quote(i); case "number": return isFinite(i) ? String(i) : "null"; case "boolean": case "null": return String(i); case "object": if (!i) return "null"; if (gap += indent, f = [], "[object Array]" === Object.prototype.toString.apply(i)) { for (u = i.length, r = 0; r < u; r += 1)f[r] = str(r, i) || "null"; return o = 0 === f.length ? "[]" : gap ? "[\n" + gap + f.join(",\n" + gap) + "\n" + a + "]" : "[" + f.join(",") + "]", gap = a, o } if (rep && "object" == typeof rep) for (u = rep.length, r = 0; r < u; r += 1)"string" == typeof rep[r] && (o = str(n = rep[r], i)) && f.push(quote(n) + (gap ? ": " : ":") + o); else for (n in i) Object.prototype.hasOwnProperty.call(i, n) && (o = str(n, i)) && f.push(quote(n) + (gap ? ": " : ":") + o); return o = 0 === f.length ? "{}" : gap ? "{\n" + gap + f.join(",\n" + gap) + "\n" + a + "}" : "{" + f.join(",") + "}", gap = a, o } } "function" != typeof Date.prototype.toJSON && (Date.prototype.toJSON = function () { return isFinite(this.valueOf()) ? this.getUTCFullYear() + "-" + f(this.getUTCMonth() + 1) + "-" + f(this.getUTCDate()) + "T" + f(this.getUTCHours()) + ":" + f(this.getUTCMinutes()) + ":" + f(this.getUTCSeconds()) + "Z" : null }, Boolean.prototype.toJSON = this_value, Number.prototype.toJSON = this_value, String.prototype.toJSON = this_value), "function" != typeof JSON.stringify && (meta = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"': '\\"', "\\": "\\\\" }, JSON.stringify = function (t, e, r) { var n; if (gap = "", indent = "", "number" == typeof r) for (n = 0; n < r; n += 1)indent += " "; else "string" == typeof r && (indent = r); if (rep = e, e && "function" != typeof e && ("object" != typeof e || "number" != typeof e.length)) throw new Error("JSON.stringify"); return str("", { "": t }) }), "function" != typeof JSON.parse && (JSON.parse = function (text, reviver) { var j; function walk(t, e) { var r, n, o = t[e]; if (o && "object" == typeof o) for (r in o) Object.prototype.hasOwnProperty.call(o, r) && (void 0 !== (n = walk(o, r)) ? o[r] = n : delete o[r]); return reviver.call(t, e, o) } if (text = String(text), rx_dangerous.lastIndex = 0, rx_dangerous.test(text) && (text = text.replace(rx_dangerous, function (t) { return "\\u" + ("0000" + t.charCodeAt(0).toString(16)).slice(-4) })), rx_one.test(text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""))) return j = eval("(" + text + ")"), "function" == typeof reviver ? walk({ "": j }, "") : j; throw new SyntaxError("JSON.parse") }) }();

var ns = "FishTools";

function generateRandomNumber() {
    return Math.random();
}

var executeTool = function (toolName, arg1, arg2) {
    try {
        var result = tools[toolName](arg1, arg2);
        if (typeof result === "string") return result;
        return result ? "true" : "false";
    } catch (error) {
        return '{"error":true,"tool":"' + toolName + '","type":"error","message":"' + error.toString().replace(/"/g, "'") + ' (Line ' + error.line + ')"}';
    }
};

var tools = {
    FRZ: function () { return _FRZ(); },
    FIT: function (alter) { return _FIT(alter); },
    DSH: function () { return _DSH(); },
    MIR: function (alter) { return _MIR(alter); },
    ADJ: function () { return _ADJ(); },
    SHA: function () { return _SHA(); },
    SOL: function (alter) { return _SOL(alter); },
    NUL: function (alter) { return _NUL(alter); },
    CAM: function () { return _CAM(); },
    HUE: function () { return _HUE(); },
    FILL: function () { return _FILL(); },
    TINT: function () { return _TINT(); },
    BLUR: function (alter) { return _BLUR(alter); },
    LUM: function () { return _LUM(); },
    CURV: function () { return _CURV(); },
    PRECOMP: function () { return _PRECOMP(); },
    CENTERINCOMP: function () { return _CENTERINCOMP(); },
    setAnchorPoint: function (pos) { return _setAnchorPoint(pos); },
    TWIX: function () { return _TWIX(); },
    TMRE: function () { return _TMRE(); },
    GHST: function () { return _GHST(); },
    EXPO: function () { return _EXPO(); },
    LENS: function () { return _LENS(); },
    SHKE: function () { return _SHAKE(); },
    WARP: function () { return _WARP(); },
    OVERLAP: function () { return _OVERLAP(); }
};

function _FRZ() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    app.beginUndoGroup("Freeze Frame");
    var currentTime = comp.time;
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (!layer.canSetTimeRemapEnabled) continue;
        if (currentTime < layer.inPoint || currentTime > layer.outPoint) continue;
        layer.timeRemapEnabled = true;
        layer.property("ADBE Time Remapping");
        app.executeCommand(3695);
    }
    app.endUndoGroup();
    return true;
}

function _FIT(alter) {
    alter = alter === undefined ? false : alter;
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    if (comp.selectedLayers.length == 0) return false;
    app.beginUndoGroup("Fit to Comp");
    alter ? app.executeCommand(2733) : app.executeCommand(2732);
    app.endUndoGroup();
    return true;
}

function _DSH() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    if (comp.selectedLayers.length == 0) return false;
    app.beginUndoGroup("Add Drop Shadow");
    var selectedLayers = comp.selectedLayers;
    for (var i = 0; i < selectedLayers.length; i++) {
        var shadow = selectedLayers[i].Effects.addProperty("ADBE Drop Shadow");
        shadow.property(4).setValue(10);
        shadow.property(5).setValue(100);
    }
    app.endUndoGroup();
    return true;
}

function _MIR(alter) {
    alter = alter === undefined ? false : alter;
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    if (comp.selectedLayers.length == 0) return false;
    app.beginUndoGroup("Mirror");
    alter ? app.executeCommand(3767) : app.executeCommand(3766);
    app.endUndoGroup();
    return true;
}

function _ADJ() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var hasSelection = comp.selectedLayers.length > 0;
    var targetLayer = hasSelection ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Create Adjustment Layer");
    var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, 1);
    adjLayer.adjustmentLayer = true;
    adjLayer.label = 5;
    if (hasSelection) {
        adjLayer.inPoint = targetLayer.inPoint;
        adjLayer.outPoint = targetLayer.outPoint;
        adjLayer.moveBefore(targetLayer);
    }
    app.endUndoGroup();
    return true;
}

function _SHA() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var hasSelection = comp.selectedLayers.length > 0;
    var targetLayer = hasSelection ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Create Shape Layer");
    var shapeLayer = comp.layers.addShape();
    shapeLayer.name = "Shape Layer";
    shapeLayer.label = 8;
    if (hasSelection) {
        shapeLayer.inPoint = targetLayer.inPoint;
        shapeLayer.outPoint = targetLayer.outPoint;
        shapeLayer.moveBefore(targetLayer);
    }
    app.endUndoGroup();
    return true;
}

function _SOL(alter) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var hasSelection = comp.selectedLayers.length > 0;
    var targetLayer = hasSelection ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Create Solid Layer");
    var solidLayer = comp.layers.addSolid([0, 0, 0], "Solid Layer", comp.width, comp.height, 1);
    var fillEffect = solidLayer.Effects.addProperty("ADBE Fill");
    var randomColor = [generateRandomNumber(), generateRandomNumber(), generateRandomNumber()];
    fillEffect.property("ADBE Fill-0002").setValue(alter ? [0, 0, 0] : randomColor);
    solidLayer.label = 1;
    if (hasSelection) {
        solidLayer.inPoint = targetLayer.inPoint;
        solidLayer.outPoint = targetLayer.outPoint;
        solidLayer.moveBefore(targetLayer);
    }
    app.endUndoGroup();
    return true;
}

function _NUL(alter) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = [];
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        selectedLayers.push(comp.selectedLayers[i]);
    }
    var hasSelection = selectedLayers.length > 0;
    var targetLayer = hasSelection ? selectedLayers[0] : null;

    app.beginUndoGroup(alter ? "Create Null and Parent" : "Create Null Object");

    var nullLayer = comp.layers.addNull();
    nullLayer.name = alter ? "Controller" : "Null";
    nullLayer.label = 1;

    if (hasSelection) {
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        try { nullLayer.moveBefore(targetLayer); } catch (e) { /* Camera/Light layers may block moveBefore */ }


        if (alter) {
            var bounds = _getSelectionBounds(selectedLayers);
            nullLayer.property("ADBE Transform Group").property("ADBE Position").setValue([bounds.x, bounds.y]);

            for (var j = 0; j < selectedLayers.length; j++) {
                selectedLayers[j].parent = nullLayer;
            }
        }
    }

    app.endUndoGroup();
    return true;
}

function _getSelectionBounds(layers) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < layers.length; i++) {
        var pos = layers[i].property("ADBE Transform Group").property("ADBE Position").value;
        minX = Math.min(minX, pos[0]);
        maxX = Math.max(maxX, pos[0]);
        minY = Math.min(minY, pos[1]);
        maxY = Math.max(maxY, pos[1]);
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function _CAM() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var hasSelection = comp.selectedLayers.length > 0;
    var targetLayer = hasSelection ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Create Camera");
    app.executeCommand(2564);
    var l = comp.selectedLayers[0];
    if (l && l.matchName == "ADBE Camera Layer") {
        if (hasSelection) {
            l.inPoint = targetLayer.inPoint;
            l.outPoint = targetLayer.outPoint;
            l.moveBefore(targetLayer);
        }
    }
    app.endUndoGroup();
    return true;
}

function _HUE() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length == 0) return false;
    app.beginUndoGroup("Add Hue/Saturation");
    for (var i = 0; i < selectedLayers.length; i++) {
        selectedLayers[i].Effects.addProperty("ADBE HUE SATURATION");
    }
    app.endUndoGroup();
    return true;
}

function _FILL() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var sel = comp.selectedLayers;
    if (sel.length == 0) return false;
    app.beginUndoGroup("Add Fill Effect");
    for (var i = 0; i < sel.length; i++) sel[i].Effects.addProperty("ADBE Fill");
    app.endUndoGroup();
    return true;
}

function _TINT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var sel = comp.selectedLayers;
    if (sel.length == 0) return false;
    app.beginUndoGroup("Add Tint Effect");
    for (var i = 0; i < sel.length; i++) sel[i].Effects.addProperty("ADBE Tint");
    app.endUndoGroup();
    return true;
}

function _BLUR(alter) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var sel = comp.selectedLayers;
    if (sel.length == 0) return false;
    app.beginUndoGroup("Add Blur");
    for (var i = 0; i < sel.length; i++) {
        sel[i].Effects.addProperty(alter ? "ADBE Camera Lens Blur" : "ADBE Gaussian Blur 2");
    }
    app.endUndoGroup();
    return true;
}

function _LUM() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var sel = comp.selectedLayers;
    if (sel.length == 0) return false;
    app.beginUndoGroup("Add Lumetri Color");
    for (var i = 0; i < sel.length; i++) sel[i].Effects.addProperty("ADBE Lumetri");
    app.endUndoGroup();
    return true;
}

function _CURV() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var sel = comp.selectedLayers;
    if (sel.length == 0) return false;
    app.beginUndoGroup("Add Curves");
    for (var i = 0; i < sel.length; i++) sel[i].Effects.addProperty("ADBE CurvesCustom");
    app.endUndoGroup();
    return true;
}

function _PRECOMP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;
    app.beginUndoGroup("Pre-compose");
    try {
        var earliestStartTime = Number.MAX_VALUE;
        var latestEndTime = 0;
        var layerIndices = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            layerIndices.push(layer.index);
            if (layer.inPoint < earliestStartTime) earliestStartTime = layer.inPoint;
            if (layer.outPoint > latestEndTime) latestEndTime = layer.outPoint;
        }
        var preCompName = "Pre-comp " + comp.layer(layerIndices[0]).name;
        var preComp = comp.layers.precompose(layerIndices, preCompName, true);
        var newDuration = latestEndTime - earliestStartTime;
        if (newDuration > 0 && newDuration < preComp.duration) {
            preComp.duration = newDuration;
        }
        for (var i = 1; i <= preComp.numLayers; i++) {
            preComp.layer(i).startTime -= earliestStartTime;
        }
        for (var i = 1; i <= comp.numLayers; i++) {
            var cl = comp.layer(i);
            if (cl.source instanceof CompItem && cl.source.id === preComp.id) {
                cl.startTime = earliestStartTime;
                break;
            }
        }
        return true;
    } catch (err) {
        alert("Pre-compose Error: " + err.toString());
        return false;
    } finally {
        app.endUndoGroup();
    }
}

function _CENTERINCOMP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;
    app.beginUndoGroup("Center In Composition");
    try {
        var compWidth = comp.width;
        var compHeight = comp.height;
        var currentTime = comp.time;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer instanceof CameraLayer || layer instanceof LightLayer || layer.nullLayer) continue;
            var position = layer.property("ADBE Transform Group").property("ADBE Position");
            if (position.canVaryOverTime) {
                var newPosition = [compWidth / 2, compHeight / 2];
                if (layer.threeDLayer) {
                    var currentPos = position.valueAtTime(currentTime, true);
                    newPosition.push(currentPos[2]);
                }
                if (position.numKeys > 0) {
                    position.setValueAtTime(currentTime, newPosition);
                } else {
                    position.setValue(newPosition);
                }
            }
        }
        return true;
    } catch (err) {
        return false;
    } finally {
        app.endUndoGroup();
    }
}

function _setAnchorPoint(pos) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;
    app.beginUndoGroup("Set Anchor Point");
    try {
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer instanceof CameraLayer || layer instanceof LightLayer || layer.nullLayer) continue;
            var curTime = comp.time;
            var anchor = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            var row = Math.floor((pos - 1) / 3);
            var col = (pos - 1) % 3;
            var hasMasks = false;
            if (layer.mask.numProperties != 0) {
                for (var m = 1; m <= layer.mask.numProperties; m++) {
                    if (layer.mask(m).maskMode != MaskMode.NONE) { hasMasks = true; break; }
                }
            }
            var x, y;
            if (!hasMasks) {
                var rect = layer.sourceRectAtTime(curTime, false);
                switch (col) {
                    case 0: x = rect.left; break;
                    case 1: x = rect.left + rect.width / 2; break;
                    case 2: x = rect.left + rect.width; break;
                }
                switch (row) {
                    case 0: y = rect.top; break;
                    case 1: y = rect.top + rect.height / 2; break;
                    case 2: y = rect.top + rect.height; break;
                }
            } else {
                var xBounds = [], yBounds = [];
                for (var m = 1; m <= layer.mask.numProperties; m++) {
                    if (layer.mask(m).maskMode == MaskMode.NONE) continue;
                    var vertices = layer.mask(m).maskShape.valueAtTime(curTime, false).vertices;
                    for (var v = 0; v < vertices.length; v++) {
                        xBounds.push(vertices[v][0]);
                        yBounds.push(vertices[v][1]);
                    }
                }
                xBounds.sort(function (a, b) { return a - b; });
                yBounds.sort(function (a, b) { return a - b; });
                var xl = xBounds[0], xh = xBounds[xBounds.length - 1];
                var yl = yBounds[0], yh = yBounds[yBounds.length - 1];
                if (layer instanceof TextLayer || layer instanceof ShapeLayer) {
                    var rect = layer.sourceRectAtTime(curTime, false);
                    xl = Math.max(xl, rect.left);
                    xh = Math.min(xh, rect.left + rect.width);
                    yl = Math.max(yl, rect.top);
                    yh = Math.min(yh, rect.top + rect.height);
                }
                switch (col) {
                    case 0: x = xl; break;
                    case 1: x = xl + (xh - xl) / 2; break;
                    case 2: x = xh; break;
                }
                switch (row) {
                    case 0: y = yl; break;
                    case 1: y = yl + (yh - yl) / 2; break;
                    case 2: y = yh; break;
                }
            }
            if (anchor.isTimeVarying) {
                anchor.setValueAtTime(curTime, [x, y]);
            } else {
                var curAnchor = anchor.value;
                var xMove = (x - curAnchor[0]) * (layer.scale.value[0] / 100);
                var yMove = (y - curAnchor[1]) * (layer.scale.value[1] / 100);
                var position = layer.property("ADBE Transform Group").property("ADBE Position");
                var posEx = false;
                if (position.expressionEnabled) { position.expressionEnabled = false; posEx = true; }
                var dupLayer = layer.duplicate();
                var oldParent = layer.parent;
                dupLayer.moveToEnd();
                if (dupLayer.scale.isTimeVarying) { dupLayer.scale.setValueAtTime(curTime, [100, 100]); }
                else { dupLayer.scale.setValue([100, 100]); }
                layer.parent = dupLayer;
                anchor.setValue([x, y]);
                if (position.isTimeVarying) {
                    var numKeys = position.numKeys;
                    for (var k = 1; k <= numKeys; k++) {
                        var curPos = position.keyValue(k);
                        position.setValueAtKey(k, [curPos[0] + xMove, curPos[1] + yMove, curPos[2]]);
                    }
                } else {
                    var curPos = position.value;
                    position.setValue([curPos[0] + xMove, curPos[1] + yMove, curPos[2]]);
                }
                layer.parent = oldParent;
                if (posEx) position.expressionEnabled = true;
                dupLayer.remove();
            }
        }
        return true;
    } catch (err) {
        return false;
    } finally {
        app.endUndoGroup();
    }
}

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

function _getLayerMarkers(layer) {
    var markers = [];
    var markerProp = layer.property("ADBE Marker");
    if (markerProp && markerProp.numKeys > 0) {
        for (var i = 1; i <= markerProp.numKeys; i++) {
            markers.push(markerProp.keyTime(i));
        }
    } else {
        var comp = layer.containingComp;
        var globalMarkers = comp.markerProperty;
        if (globalMarkers && globalMarkers.numKeys > 0) {
            for (var j = 1; j <= globalMarkers.numKeys; j++) {
                var t = globalMarkers.keyTime(j);
                if (t >= layer.inPoint && t <= layer.outPoint) {
                    markers.push(t);
                }
            }
        }
    }
    markers.sort(function (a, b) { return a - b; });
    return markers;
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

            // Apply Easing: Fast (at markers) -> Slow (in middle) -> Fast (at markers)
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

        var adj = comp.layers.addSolid([0, 0, 0], "Ghost Effect", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.startTime = curTime;
        adj.outPoint = curTime + 2;
        adj.label = 5;
        if (layer) adj.moveBefore(layer);


        var transformEffect = adj.Effects.addProperty("ADBE Geometry2");

        transformEffect.property(3).setValue(true);
        var scale = transformEffect.property(4);
        scale.setValueAtTime(curTime, 100);
        scale.setValueAtTime(curTime + 2, 250);

        var opacity = adj.property("ADBE Transform Group").property("ADBE Opacity");
        opacity.setValueAtTime(curTime, 100);
        opacity.setValueAtTime(curTime + 2, 0);

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
                var easeInSlow = new KeyframeEase(0, 100);
                masterExpo.setTemporalEaseAtKey(kIdxZero, [easeInSlow], masterExpo.keyOutTemporalEase(kIdxZero));
            }

            masterExpo.setValueAtTime(t, 1);

            var kIdxPeak = masterExpo.nearestKeyIndex(t);
            if (kIdxPeak > 0) {
                var easeOutFast = new KeyframeEase(0, 0.1);
                masterExpo.setTemporalEaseAtKey(kIdxPeak, masterExpo.keyInTemporalEase(kIdxPeak), [easeOutFast]);
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
        adj.label = 5; // Same label color as Expo

        // Effect reference
        var lens = adj.Effects.addProperty("ADBE Camera Lens Blur");
        if (!lens) {
            // Fallback for older AE versions or if Camera Lens Blur is missing
            lens = adj.Effects.addProperty("ADBE Fast Blur"); // Fallback
        }

        var blurRadius = null;
        if (lens) {
            // Try known property names
            blurRadius = lens.property("ADBE Camera Lens Blur-0001"); // Blur Radius matchname
            if (!blurRadius) blurRadius = lens.property("Blur Radius");
            if (!blurRadius) blurRadius = lens.property("Blurriness"); // For Fast Blur
            if (!blurRadius && lens.numProperties >= 1) blurRadius = lens.property(1); // Blind guess
        }

        if (!blurRadius) {
            return '{"error":true,"tool":"LENS","type":"error","message":"Could not find Blur Radius property."}';
        }

        var markers = _getLayerMarkers(layer);
        var fd = comp.frameDuration;

        for (var i = 0; i < markers.length; i++) {
            var t = markers[i];

            // Frame before marker: Value 0 (Low)
            blurRadius.setValueAtTime(t - fd, 0);

            var kIdxZero = blurRadius.nearestKeyIndex(t - fd);
            if (kIdxZero > 0) {
                var easeInSlow = new KeyframeEase(0, 100);
                blurRadius.setTemporalEaseAtKey(kIdxZero, [easeInSlow], blurRadius.keyOutTemporalEase(kIdxZero));
            }

            // Frame at marker: Value 50 (High)
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
        // Create Adjustment Layer
        var adj = comp.layers.addSolid([0, 0, 0], "S_Shake Adjust", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.inPoint = layer.inPoint;
        adj.outPoint = layer.outPoint;
        adj.label = 5;


        try {
            if (adj.index !== layer.index - 1) adj.moveBefore(layer);
        } catch (e) { /* ignore move error */ }

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
        var adj = comp.layers.addSolid([0, 0, 0], "Warp Effect", comp.width, comp.height, 1);
        adj.adjustmentLayer = true;
        adj.startTime = curTime;
        adj.outPoint = curTime + 1; // 1 second duration
        adj.label = 5;

        var selectedLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
        if (selectedLayer) {
            try {
                if (adj.index !== selectedLayer.index - 1) adj.moveBefore(selectedLayer);
            } catch (e) { /* ignore move error */ }
        }

        var warp = adj.Effects.addProperty("ADBE Wave Warp");
        if (!warp) {
            alert("Wave Warp effect not found.");
            adj.remove();
            return false;
        }

        warp.property("ADBE Wave Warp-0001").setValue(9); // Smooth Noise
        warp.property("ADBE Wave Warp-0003").setValue(109);
        warp.property("ADBE Wave Warp-0004").setValue(0);
        warp.property("ADBE Wave Warp-0005").setValue(0.2);
        warp.property("ADBE Wave Warp-0006").setValue(2);
        warp.property("ADBE Wave Warp-0008").setValue(1);

        var height = warp.property("ADBE Wave Warp-0002");
        height.setValueAtTime(curTime, 228);
        height.setValueAtTime(curTime + 1, 0);

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

function _OVERLAP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;
    var layer = selectedLayers[0];

    // Auto-detect 2D or 3D and route to the correct function
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

        // Property groups to check
        var propertyNames = [
            { name: "ADBE Position", matchName: "ADBE Position", dimensions: 2 },
            { name: "ADBE Scale", matchName: "ADBE Scale", dimensions: 2 },
            { name: "ADBE Rotate Z", matchName: "ADBE Rotate Z", dimensions: 1 }
        ];

        var nullsCreated = [];
        var firstKfValues = {}; // Store first keyframe value per property for reset

        // Process each property
        for (var p = 0; p < propertyNames.length; p++) {
            var propInfo = propertyNames[p];
            var prop = transform.property(propInfo.matchName);

            if (!prop || prop.numKeys < 2) continue; // Skip if no keyframes or less than 2

            // Get all keyframe times and values
            var keyframes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keyframes.push({
                    time: prop.keyTime(k),
                    value: prop.keyValue(k),
                    index: k
                });
            }

            // Save first keyframe value for reset later
            firstKfValues[propInfo.matchName] = keyframes[0].value;

            // Create nulls for each transition (Leapfrog pattern)
            // Null 1: K1->K3, Null 2: K2->K4, etc.
            for (var i = 0; i < keyframes.length - 1; i++) {
                var startKf = keyframes[i];
                var endKf = keyframes[i + 1];

                // Create null for this transition
                var nullLayer = comp.layers.addNull();
                nullLayer.name = "Overlap_" + propInfo.name.replace("ADBE ", "") + "_" + (i + 1);
                nullLayer.label = 14; // Cyan color
                nullLayer.shy = true; // Mark as shy

                // Calculate leapfrog timing: Start at K_i, End at K_(i+2) if exists, else extend
                var nullStartTime = startKf.time;
                var nullEndTime = (i + 2 < keyframes.length) ? keyframes[i + 2].time : endKf.time + (endKf.time - startKf.time);

                // Set null duration to match its animation range only
                nullLayer.inPoint = nullStartTime;
                nullLayer.outPoint = nullEndTime;

                // Get the property on the null
                var nullProp = nullLayer.property("ADBE Transform Group").property(propInfo.matchName);

                // Use actual property dimension count (Scale is always 3D internally in AE)
                var actualDims = (propInfo.dimensions === 1) ? 1 : nullProp.value.length;

                // Set actual keyframe values on null (not deltas)
                if (actualDims === 1) {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                } else {
                    var startVal = [];
                    var endVal = [];

                    for (var d = 0; d < actualDims; d++) {
                        // Determine value for this dimension
                        var s = (d < propInfo.dimensions) ? startKf.value[d] : ((propInfo.matchName === "ADBE Scale") ? 100 : 0);
                        var e = (d < propInfo.dimensions) ? endKf.value[d] : ((propInfo.matchName === "ADBE Scale") ? 100 : 0);

                        startVal.push(s);
                        endVal.push(e);
                    }

                    nullProp.setValueAtTime(nullStartTime, startVal);
                    nullProp.setValueAtTime(nullEndTime, endVal);
                }

                // Adaptive asymmetric easing: steep point at keyframe position
                // ratio = where the intermediate keyframe falls within this null's span
                var transitionDuration = nullEndTime - nullStartTime;
                var ratio = (transitionDuration > 0) ? (endKf.time - nullStartTime) / transitionDuration : 0.5;
                var baseInfluence = 85;
                var influenceOut = Math.max(33, Math.min(100, ratio * 2 * baseInfluence));
                var influenceIn = Math.max(33, Math.min(100, (1 - ratio) * 2 * baseInfluence));

                // Query AE for exact easing dimension count
                // Spatial properties (Position) = 1, Scale = 3 (even 2D), Rotation = 1
                var easeDims = nullProp.keyInTemporalEase(1).length;

                var easeOutSymmetric = [];
                var easeInSymmetric = [];

                for (var d = 0; d < easeDims; d++) {
                    easeOutSymmetric.push(new KeyframeEase(0, influenceOut));
                    easeInSymmetric.push(new KeyframeEase(0, influenceIn));
                }

                // Set bezier interpolation with asymmetric ease
                nullProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                nullProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

                nullProp.setTemporalEaseAtKey(1, nullProp.keyInTemporalEase(1), easeOutSymmetric);
                nullProp.setTemporalEaseAtKey(2, easeInSymmetric, nullProp.keyOutTemporalEase(2));

                // Store reference
                nullsCreated.push({
                    layer: nullLayer,
                    property: propInfo.matchName
                });
            }
        }

        // Chain parenting: Layer -> Last Null -> ... -> First Null
        if (nullsCreated.length > 0) {
            // Reverse order for proper chain
            nullsCreated.reverse();

            // Parent layer to first null in reversed list (which is the last created)
            layer.parent = nullsCreated[0].layer;

            // Chain the nulls
            for (var n = 0; n < nullsCreated.length - 1; n++) {
                nullsCreated[n].layer.parent = nullsCreated[n + 1].layer;
            }

            // Clean up original layer: remove all keyframes and reset to default
            for (var p = 0; p < propertyNames.length; p++) {
                var propInfo = propertyNames[p];
                var prop = transform.property(propInfo.matchName);

                if (!prop) continue;

                // Remove all keyframes
                while (prop.numKeys > 0) {
                    prop.removeKey(1);
                }

                // Reset to default values (nulls carry actual values)
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

        // 3D property definitions
        var propDefs = [
            { matchName: "ADBE Position", dims: 3, defaultVal: [0, 0, 0] },
            { matchName: "ADBE Scale", dims: 3, defaultVal: [100, 100, 100] },
            { matchName: "ADBE Rotate X", dims: 1, defaultVal: 0 },
            { matchName: "ADBE Rotate Y", dims: 1, defaultVal: 0 },
            { matchName: "ADBE Rotate Z", dims: 1, defaultVal: 0 }
        ];

        var nullsCreated = [];
        var firstKfValues = {}; // Store first keyframe value per property for reset

        // Process each property separately (per-property nulls with LEAPFROG pattern)
        for (var p = 0; p < propDefs.length; p++) {
            var def = propDefs[p];
            var prop = transform.property(def.matchName);

            if (!prop || prop.numKeys < 2) continue;

            // Collect keyframes for this property
            var keyframes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keyframes.push({
                    time: prop.keyTime(k),
                    value: prop.keyValue(k)
                });
            }

            // Save first keyframe value for reset later
            firstKfValues[def.matchName] = keyframes[0].value;

            // Create nulls with LEAPFROG pattern: Null_i spans K_i -> K_{i+2}
            for (var i = 0; i < keyframes.length - 1; i++) {
                var startKf = keyframes[i];
                var endKf = keyframes[i + 1];

                var nullLayer = comp.layers.addNull();
                nullLayer.name = "3DCam_" + def.matchName.replace("ADBE ", "") + "_" + (i + 1);
                nullLayer.threeDLayer = true;
                nullLayer.label = 11; // Purple
                nullLayer.shy = true;

                // LEAPFROG timing: Start at K_i, End at K_{i+2} if exists, else extend
                var nullStartTime = startKf.time;
                var nullEndTime = (i + 2 < keyframes.length) ? keyframes[i + 2].time : endKf.time + (endKf.time - startKf.time);

                nullLayer.inPoint = nullStartTime;
                nullLayer.outPoint = nullEndTime;

                var nullProp = nullLayer.property("ADBE Transform Group").property(def.matchName);

                // Set actual keyframe values on null (not deltas)
                if (def.dims === 1) {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                } else {
                    nullProp.setValueAtTime(nullStartTime, startKf.value);
                    nullProp.setValueAtTime(nullEndTime, endKf.value);
                }

                // Adaptive asymmetric easing: steep point at keyframe position
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

        // Chain parenting: Layer -> Last Null -> ... -> First Null
        if (nullsCreated.length > 0) {
            nullsCreated.reverse();

            layer.parent = nullsCreated[0];

            for (var n = 0; n < nullsCreated.length - 1; n++) {
                nullsCreated[n].parent = nullsCreated[n + 1];
            }

            // Cleanup original layer - reset to neutral (nulls carry actual values)
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

$.global.FishTools = {
    executeTool: executeTool,
    readEase: _readEase,
    applyEase: _applyEase
};
