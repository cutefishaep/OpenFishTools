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
        return tools[toolName](arg1, arg2);
    } catch (error) {
        alert("FishTools Error [" + toolName + "]: Line " + error.line + " - " + error.toString());
        return false;
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
    NUL: function () { return _NUL(); },
    CAM: function () { return _CAM(); },
    HUE: function () { return _HUE(); },
    FILL: function () { return _FILL(); },
    TINT: function () { return _TINT(); },
    BLUR: function (alter) { return _BLUR(alter); },
    LUM: function () { return _LUM(); },
    CURV: function () { return _CURV(); },
    PRECOMP: function () { return _PRECOMP(); },
    CENTERINCOMP: function () { return _CENTERINCOMP(); },
    setAnchorPoint: function (pos) { return _setAnchorPoint(pos); }
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

function _NUL() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var hasSelection = comp.selectedLayers.length > 0;
    var targetLayer = hasSelection ? comp.selectedLayers[0] : null;
    app.beginUndoGroup("Create Null Object");
    var nullLayer = comp.layers.addNull();
    nullLayer.name = "Null";
    nullLayer.label = 1;
    if (hasSelection) {
        nullLayer.inPoint = targetLayer.inPoint;
        nullLayer.outPoint = targetLayer.outPoint;
        nullLayer.moveBefore(targetLayer);
    }
    app.endUndoGroup();
    return true;
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
    var useOvershoot = dataObj.overshoot;
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var props = comp.selectedProperties;
    app.beginUndoGroup("Apply Graph Ease");
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (!prop.canVaryOverTime) continue;
        var keys = prop.selectedKeys;
        if (keys.length < 2 && !useOvershoot) continue;
        if (useOvershoot) {
            var expr = "amp = .05; freq = 4.0; decay = 2.0;\n" +
                "n = 0;\n" +
                "if (numKeys > 0){\n" +
                "  n = nearestKey(time).index;\n" +
                "  if (key(n).time > time){\n" +
                "    n--;\n" +
                "  }\n" +
                "}\n" +
                "if (n == 0){ t = 0; }\n" +
                "else{\n" +
                "  t = time - key(n).time;\n" +
                "}\n" +
                "if (n > 0 && n < numKeys){\n" +
                "  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);\n" +
                "  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);\n" +
                "}else{value}";
            prop.expression = expr;
            prop.expressionEnabled = true;
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
            var dim = 1;
            if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.TwoD) dim = 2;
            else if (prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD) dim = 3;
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

$.global.FishTools = {
    executeTool: executeTool,
    readEase: _readEase,
    applyEase: _applyEase
};
