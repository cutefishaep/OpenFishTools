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
        try { nullLayer.moveBefore(targetLayer); } catch (e) { }

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

function _PRECOMP_AUTOCROP() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;

    app.beginUndoGroup("Pre-compose Auto Crop");
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

        
        var fps = preComp.frameRate;
        var duration = preComp.duration;
        var totalFrames = Math.round(duration * fps);
        var sampleStep = Math.max(1, Math.floor(totalFrames / 60)); 

        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (var f = 0; f <= totalFrames; f += sampleStep) {
            var t = f / fps;
            if (t > duration) t = duration;
            for (var li = 1; li <= preComp.numLayers; li++) {
                var l = preComp.layer(li);
                if (l instanceof CameraLayer || l instanceof LightLayer) continue;
                if (t < l.inPoint || t > l.outPoint) continue;
                try {
                    var rect = l.sourceRectAtTime(t, false);
                    var sc = l.property("ADBE Transform Group").property("ADBE Scale").valueAtTime(t, false);
                    var pos = l.property("ADBE Transform Group").property("ADBE Position").valueAtTime(t, false);
                    var anc = l.property("ADBE Transform Group").property("ADBE Anchor Point").valueAtTime(t, false);

                    var scX = sc[0] / 100;
                    var scY = sc[1] / 100;

                    
                    var corners = [
                        [rect.left,              rect.top             ],
                        [rect.left + rect.width, rect.top             ],
                        [rect.left,              rect.top + rect.height],
                        [rect.left + rect.width, rect.top + rect.height]
                    ];

                    for (var c = 0; c < corners.length; c++) {
                        var cx = (corners[c][0] - anc[0]) * scX + pos[0];
                        var cy = (corners[c][1] - anc[1]) * scY + pos[1];
                        if (cx < minX) minX = cx;
                        if (cy < minY) minY = cy;
                        if (cx > maxX) maxX = cx;
                        if (cy > maxY) maxY = cy;
                    }
                } catch (e) {  }
            }
        }

        
        if (!isFinite(minX)) {
            minX = 0; minY = 0;
            maxX = preComp.width; maxY = preComp.height;
        }

        var newW = Math.ceil(maxX - minX);
        var newH = Math.ceil(maxY - minY);
        if (newW < 2) newW = 2;
        if (newH < 2) newH = 2;

        
        for (var li = 1; li <= preComp.numLayers; li++) {
            var l = preComp.layer(li);
            if (l instanceof CameraLayer || l instanceof LightLayer) continue;
            try {
                var pos = l.property("ADBE Transform Group").property("ADBE Position");
                if (pos.isTimeVarying) {
                    for (var k = 1; k <= pos.numKeys; k++) {
                        var kv = pos.keyValue(k);
                        pos.setValueAtKey(k, [kv[0] - minX, kv[1] - minY]);
                    }
                } else {
                    var pv = pos.value;
                    pos.setValue([pv[0] - minX, pv[1] - minY]);
                }
            } catch (e) {  }
        }

        
        preComp.width  = newW;
        preComp.height = newH;

        
        for (var i = 1; i <= comp.numLayers; i++) {
            var cl = comp.layer(i);
            if (cl.source instanceof CompItem && cl.source.id === preComp.id) {
                cl.startTime = earliestStartTime;
                var xf = cl.property("ADBE Transform Group");
                xf.property("ADBE Anchor Point").setValue([0, 0]);
                xf.property("ADBE Position").setValue([minX, minY]);
                break;
            }
        }

        return true;
    } catch (err) {
        alert("Pre-compose Auto Crop Error: " + err.toString());
        return false;
    } finally {
        app.endUndoGroup();
    }
}

function _DUP(newName) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Please select a composition or a precomp layer.";

    var targetComp = comp;
    var targetLayer = null;

    if (comp.selectedLayers.length > 0) {
        if (comp.selectedLayers[0] instanceof AVLayer && comp.selectedLayers[0].source instanceof CompItem) {
            targetComp = comp.selectedLayers[0].source;
            targetLayer = comp.selectedLayers[0];
        } else {
            return "Please select a precomp layer.";
        }
    }

    app.beginUndoGroup("Duplicate Comp");

    var previousComps = [];

    function _checkPreviousComps(sourceId) {
        for (var i = 0; i < previousComps.length; i++) {
            if (previousComps[i].source.id === sourceId) return previousComps[i].dest;
        }
        return null;
    }

    function _deepDuplicate(item) {
        var copy = item.duplicate();
        previousComps.push({ source: item, dest: copy });

        for (var i = 1; i <= copy.numLayers; i++) {
            var layer = copy.layer(i);
            if (layer instanceof AVLayer && layer.source instanceof CompItem) {
                var existingDest = _checkPreviousComps(layer.source.id);
                if (existingDest) {
                    layer.replaceSource(existingDest, false);
                } else {
                    var newChild = _deepDuplicate(layer.source);
                    layer.replaceSource(newChild, false);
                }
            }
        }
        return copy;
    }

    try {
        var newComp = _deepDuplicate(targetComp);
        newComp.name = newName;

        if (targetLayer) {
            var newLayer = targetLayer.duplicate();
            newLayer.replaceSource(newComp, false);
            newLayer.name = newName;
        }
    } catch (e) {
        app.endUndoGroup();
        return "ERROR:" + e.toString();
    }

    app.endUndoGroup();
    return true;
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

function _ALIGN(type) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;

    app.beginUndoGroup("Align " + type);
    try {
        var compWidth = comp.width;
        var compHeight = comp.height;
        var curTime = comp.time;

        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer instanceof CameraLayer || layer instanceof LightLayer || layer.nullLayer) continue;

            var position = layer.property("ADBE Transform Group").property("ADBE Position");
            var anchor = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            var scale = layer.property("ADBE Transform Group").property("ADBE Scale").value;


            var rect = layer.sourceRectAtTime(curTime, false);
            var actualWidth = rect.width * (Math.abs(scale[0]) / 100);
            var actualHeight = rect.height * (Math.abs(scale[1]) / 100);


            var anchorOffsetX = (anchor.value[0] - rect.left) * (scale[0] / 100);
            var anchorOffsetY = (anchor.value[1] - rect.top) * (scale[1] / 100);

            var curPos = position.value;
            var newX = curPos[0];
            var newY = curPos[1];

            if (type === 'LEFT') newX = 0 + anchorOffsetX;
            if (type === 'HCENTER') newX = (compWidth / 2) - (actualWidth / 2) + anchorOffsetX;
            if (type === 'RIGHT') newX = compWidth - actualWidth + anchorOffsetX;

            if (type === 'TOP') newY = 0 + anchorOffsetY;
            if (type === 'VCENTER') newY = (compHeight / 2) - (actualHeight / 2) + anchorOffsetY;
            if (type === 'BOTTOM') newY = compHeight - actualHeight + anchorOffsetY;

            var newPosition = [newX, newY];
            if (layer.threeDLayer) newPosition.push(curPos[2]);

            if (position.isTimeVarying) {
                var numKeys = position.numKeys;
                if (numKeys > 0) {
                    position.setValueAtTime(curTime, newPosition);
                } else {
                    position.setValue(newPosition);
                }
            } else {
                position.setValue(newPosition);
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


tools.FRZ = function () { return _FRZ(); };
tools.FIT = function (alter) { return _FIT(alter); };
tools.DSH = function () { return _DSH(); };
tools.MIR = function (alter) { return _MIR(alter); };
tools.ADJ = function () { return _ADJ(); };
tools.SHA = function () { return _SHA(); };
tools.SOL = function (alter) { return _SOL(alter); };
tools.NUL = function (alter) { return _NUL(alter); };
tools.CAM = function () { return _CAM(); };
tools.PRECOMP = function () { return _PRECOMP(); };
tools.PRECOMP_AUTOCROP = function () { return _PRECOMP_AUTOCROP(); };
tools.CENTERINCOMP = function () { return _CENTERINCOMP(); };
tools.setAnchorPoint = function (pos) { return _setAnchorPoint(pos); };
tools.DUP = function (newName) { return _DUP(newName); };
tools.ALIGN_LEFT = function () { return _ALIGN('LEFT') };
tools.ALIGN_HCENTER = function () { return _ALIGN('HCENTER') };
tools.ALIGN_RIGHT = function () { return _ALIGN('RIGHT') };
tools.ALIGN_TOP = function () { return _ALIGN('TOP') };
tools.ALIGN_VCENTER = function () { return _ALIGN('VCENTER') };
tools.ALIGN_BOTTOM = function () { return _ALIGN('BOTTOM') };

function _CUT(type) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return false;
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return false;

    app.beginUndoGroup("Cut " + type);
    try {
        var curTime = comp.time;

        var layerData = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            layerData.push({
                layer:    selectedLayers[i],
                inPoint:  selectedLayers[i].inPoint,
                outPoint: selectedLayers[i].outPoint
            });
        }

        for (var i = 0; i < layerData.length; i++) {
            var data  = layerData[i];
            var layer = data.layer;

            if (type === 'FRONT') {
                if (curTime > data.inPoint && curTime < data.outPoint) {
                    layer.inPoint = curTime;
                }
            } else if (type === 'BACK') {
                if (curTime > data.inPoint && curTime < data.outPoint) {
                    layer.outPoint = curTime;
                }
            } else if (type === 'MID') {
                if (curTime <= data.inPoint || curTime >= data.outPoint) continue;
                var newLayer = layer.duplicate();
                layer.outPoint    = curTime;
                newLayer.inPoint  = curTime;
                newLayer.outPoint = data.outPoint;
                newLayer.moveBefore(layer);
            }
        }
        return true;
    } catch (err) {
        return false;
    } finally {
        app.endUndoGroup();
    }
}

tools.CUT_FRONT = function () { return _CUT('FRONT') };
tools.CUT_MID = function () { return _CUT('MID') };
tools.CUT_BACK = function () { return _CUT('BACK') };
