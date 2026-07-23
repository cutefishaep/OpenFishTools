tools.AE_TO_AM = function(bakeExpr, importAdj) {
    bakeExpr = (bakeExpr !== false);
    importAdj = !!importAdj;

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition first.");
        return false;
    }

    var progWin = new Window("palette", "Ae > Am Converter", undefined);
    progWin.orientation = "column";
    progWin.alignChildren = ["fill", "top"];
    progWin.spacing = 8;
    progWin.margins = 16;
    var progStatus = progWin.add("statictext", undefined, "Preparing...");
    progStatus.preferredSize.width = 420;
    var progBarRow = progWin.add("group");
    progBarRow.orientation = "row";
    progBarRow.alignChildren = ["fill", "center"];
    var progBar = progBarRow.add("progressbar", undefined, 0, 100);
    progBar.preferredSize.width = 360;
    var progPercentText = progBarRow.add("statictext", undefined, "0%");
    progPercentText.preferredSize.width = 40;
    try { progWin.center(); } catch (e) {}
    try { progWin.show(); } catch (e) {}

    var gBakedPropKeys = {};
    var gBakeProgress = { done: 0, total: 0 };
    var idCounter = 1000000;
    var gXmlLogCounter = 0;

    function setProgress(percent, status) {
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        try { progBar.value = percent; } catch (e) {}
        try { progPercentText.text = Math.round(percent) + "%"; } catch (e) {}
        if (status) { try { progStatus.text = status; } catch (e) {} }
        try { progWin.update(); } catch (e) {}
    }

    function nextId() { return idCounter++; }

    function markPropAsBaked(layer, prop) {
        try {
            var key = layer.containingComp.id + "|" + layer.index + "|" + prop.name;
            gBakedPropKeys[key] = true;
        } catch (e) {}
    }

    function isBakedProp(layer, prop) {
        try {
            var key = layer.containingComp.id + "|" + layer.index + "|" + prop.name;
            return !!gBakedPropKeys[key];
        } catch (e) { return false; }
    }

    var totalBaked = 0;

    if (bakeExpr) {
        setProgress(0, "Counting expressions...");
        try { gBakeProgress.total = countExpressionPropsRecursive(comp, 0); } catch (e) { gBakeProgress.total = 0; }
        try { totalBaked = bakeAllCompsRecursive(comp, 0); } catch (e) {
            alert("Warning: expression baking partially failed.\n" + e.toString());
        }
        try { comp.openInViewer(); } catch (e) {}
    }

    setProgress(70, "Saving XML file...");
    var xmlFile = File.saveDialog("Save Alight Motion Project", "Alight Motion XML (*.xml):*.xml");
    if (!xmlFile) { try { progWin.close(); } catch (e) {} return false; }

    var now = new Date();
    var exportDateStr = now.getFullYear() + '-' +
        ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
        ('0' + now.getDate()).slice(-2) + ' ' +
        ('0' + now.getHours()).slice(-2) + ':' +
        ('0' + now.getMinutes()).slice(-2) + ' ' +
        (now.getHours() < 12 ? 'AM' : 'PM');

    var xml = "<?xml version='1.0' encoding='UTF-8' ?><!--\n";
    xml += 'Created by Alight Motion (http://alightmotion.com)\n';
    xml += 'Exported: ' + exportDateStr + '\n';
    xml += '5.0.275 (1002592)\n';
    xml += 'a34a6c0 (Oct 7, 2024 5:17:29 PM)\n';
    xml += '-->\n';

    var title = comp.name;
    var width = comp.width;
    var height = comp.height;
    var totalTime = Math.round(comp.duration * 1000);
    var fps = comp.frameRate;

    xml += '<scene title="' + escapeXml(title) + '" width="' + width + '" height="' + height + '" exportWidth="' + width + '" exportHeight="' + height + '" precompose="dynamicResolution" bgcolor="#ff000000" totalTime="' + totalTime + '" fps="' + fps + '" modifiedTime="' + new Date().getTime() + '" amver="1002592" ffver="106" am="com.alightcreative.motion/5.0.275" amplatform="android" retime="freeze" retimeAdaptFPS="false">\n';

    var markerProp = comp.markerProperty;
    if (markerProp) {
        for (var i = 1; i <= markerProp.numKeys; i++) {
            var tMs = Math.round(markerProp.keyTime(i) * 1000);
            xml += '  <bookmark t="' + tMs + '" />\n';
        }
    }

    setProgress(75, "Generating XML...");
    xml += renderCompLayers(comp, "  ");
    xml += '</scene>\n';

    setProgress(95, "Writing file to disk...");
    xmlFile.open("w");
    xmlFile.encoding = "UTF-8";
    xmlFile.write(xml);
    xmlFile.close();

    setProgress(100, "Done.");
    try { $.sleep(400); } catch (e) {}
    try { progWin.close(); } catch (e) {}

    alert("Export complete.\nExpressions baked: " + totalBaked + ".");
    return true;

    function countExpressionPropsRecursive(targetComp, depth) {
        if (depth > 20) return 0;
        var count = 0;
        function findExpr(propertyGroup) {
            var c = 0;
            for (var j = 1; j <= propertyGroup.numProperties; j++) {
                var prop = propertyGroup.property(j);
                if (prop.propertyType === PropertyType.PROPERTY) {
                    if (prop.canSetExpression && prop.expressionEnabled && prop.expression !== "") c++;
                } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
                    c += findExpr(prop);
                }
            }
            return c;
        }
        for (var i = 1; i <= targetComp.numLayers; i++) {
            var lyr = targetComp.layer(i);
            try { count += findExpr(lyr); } catch (e) {}
            try {
                if (lyr.source && (lyr.source instanceof CompItem)) {
                    count += countExpressionPropsRecursive(lyr.source, depth + 1);
                }
            } catch (e) {}
        }
        return count;
    }

    function bakeAllCompsRecursive(topComp, depth) {
        if (depth > 20) return 0;
        var count = 0;
        try { count += bakeExpressionsInComp(topComp); } catch (e) {}
        for (var i = 1; i <= topComp.numLayers; i++) {
            try {
                var lyr = topComp.layer(i);
                if (lyr.source && (lyr.source instanceof CompItem)) {
                    count += bakeAllCompsRecursive(lyr.source, depth + 1);
                }
            } catch (e) {}
        }
        return count;
    }

    function bakeExpressionsInComp(targetComp) {
        try { targetComp.openInViewer(); } catch (e) {}
        var layersToProcess = [];
        for (var i = 1; i <= targetComp.numLayers; i++) {
            layersToProcess.push(targetComp.layer(i));
        }
        if (layersToProcess.length === 0) return 0;
        var targetProperties = [];
        function findExpressions(propertyGroup, currentLayer) {
            for (var j = 1; j <= propertyGroup.numProperties; j++) {
                var prop = propertyGroup.property(j);
                if (prop.propertyType === PropertyType.PROPERTY) {
                    if (prop.canSetExpression && prop.expressionEnabled && prop.expression !== "") {
                        targetProperties.push({ property: prop, layer: currentLayer });
                    }
                } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
                    findExpressions(prop, currentLayer);
                }
            }
        }
        for (var l = 0; l < layersToProcess.length; l++) {
            try { findExpressions(layersToProcess[l], layersToProcess[l]); } catch (e) {}
        }
        if (targetProperties.length === 0) return 0;
        var originalSelectedLayers = [];
        for (var s = 0; s < targetComp.selectedLayers.length; s++) {
            originalSelectedLayers.push(targetComp.selectedLayers[s]);
        }
        var bakedCount = 0;
        var tolerance = 0.001;
        var commandId = app.findMenuCommandId("Convert Expression to Keyframes");
        if (commandId === 0) commandId = 2371;
        var BATCH_SIZE = 15;
        var batchCounter = 0;
        app.beginUndoGroup("Bake Expressions Batch");
        var undoGroupOpen = true;
        for (var p = 0; p < targetProperties.length; p++) {
            var item = targetProperties[p];
            var currentProp = item.property;
            var parentLayer = item.layer;
            for (var cl = 1; cl <= targetComp.numLayers; cl++) {
                targetComp.layer(cl).selected = false;
            }
            parentLayer.selected = true;
            currentProp.selected = true;
            try {
                app.executeCommand(commandId);
                if (currentProp.numKeys > 2) {
                    for (var k = currentProp.numKeys - 1; k > 1; k--) {
                        var timeBefore = currentProp.keyTime(k - 1);
                        var timeCurrent = currentProp.keyTime(k);
                        var timeAfter = currentProp.keyTime(k + 1);
                        var valBefore = currentProp.keyValue(k - 1);
                        var valCurrent = currentProp.keyValue(k);
                        var valAfter = currentProp.keyValue(k + 1);
                        if (isEqualVal(valBefore, valCurrent, tolerance) && isEqualVal(valCurrent, valAfter, tolerance)) {
                            currentProp.removeKey(k);
                            continue;
                        }
                        if (isLinearVal(timeBefore, valBefore, timeCurrent, valCurrent, timeAfter, valAfter, tolerance)) {
                            currentProp.removeKey(k);
                        }
                    }
                }
                if (currentProp.canSetExpression) {
                    currentProp.expression = "";
                    currentProp.expressionEnabled = false;
                }
                bakedCount++;
                try { markPropAsBaked(parentLayer, currentProp); } catch (e) {}
            } catch (e) {}
            currentProp.selected = false;
            try {
                gBakeProgress.done++;
                var pct = gBakeProgress.total > 0 ? (gBakeProgress.done / gBakeProgress.total) * 70 : 0;
                setProgress(pct, "Baking: " + gBakeProgress.done + " / " + gBakeProgress.total);
            } catch (e) {}
            if ((p + 1) % BATCH_SIZE === 0 && p < targetProperties.length - 1) {
                app.endUndoGroup();
                undoGroupOpen = false;
                try { app.purge(PurgeTarget.ALL_CACHES); } catch (e) {}
                batchCounter++;
                if (batchCounter % 3 === 0) {
                    try { if (app.project.file) { app.project.save(); } } catch (e) {}
                }
                try { $.sleep(30); } catch (e) {}
                app.beginUndoGroup("Bake Expressions Batch");
                undoGroupOpen = true;
            }
        }
        if (undoGroupOpen) { app.endUndoGroup(); }
        for (var cl2 = 1; cl2 <= targetComp.numLayers; cl2++) {
            targetComp.layer(cl2).selected = false;
        }
        for (var ol = 0; ol < originalSelectedLayers.length; ol++) {
            originalSelectedLayers[ol].selected = true;
        }
        return bakedCount;
    }

    function isEqualVal(val1, val2, tol) {
        if (typeof val1 === "number") return Math.abs(val1 - val2) < tol;
        for (var i = 0; i < val1.length; i++) {
            if (Math.abs(val1[i] - val2[i]) > tol) return false;
        }
        return true;
    }

    function isLinearVal(t1, v1, t2, v2, t3, v3, tol) {
        var ratio = (t2 - t1) / (t3 - t1);
        if (typeof v1 === "number") {
            var expectedV2 = v1 + (v3 - v1) * ratio;
            return Math.abs(v2 - expectedV2) < tol;
        }
        for (var i = 0; i < v1.length; i++) {
            var expectedV2_i = v1[i] + (v3[i] - v1[i]) * ratio;
            if (Math.abs(v2[i] - expectedV2_i) > tol) return false;
        }
        return true;
    }

    function renderCompLayers(sourceComp, indent) {
        var localIdMap = {};
        try {
            for (var p = 1; p <= sourceComp.layers.length; p++) {
                var pLayer = sourceComp.layers[p];
                if (pLayer.guideLayer || (!pLayer.hasVideo && !pLayer.nullLayer)) continue;
                if (!pLayer.enabled) continue;
                if (!importAdj && pLayer.adjustmentLayer) continue;
                localIdMap[pLayer.index] = nextId();
            }
        } catch (e) {
            alert("PASS 1 failed, comp: \"" + sourceComp.name + "\"\n" + e.toString());
            throw e;
        }
        function idFor(lyr) {
            if (lyr && localIdMap[lyr.index] !== undefined) return localIdMap[lyr.index];
            return null;
        }
        var out = "";
        for (var l = sourceComp.layers.length; l >= 1; l--) {
            var layer = sourceComp.layers[l];
            if (layer.guideLayer || (!layer.hasVideo && !layer.nullLayer)) continue;
            if (!layer.enabled) continue;
            if (!importAdj && layer.adjustmentLayer) continue;
            try {
                out += renderSingleLayer(sourceComp, layer, indent, idFor);
            } catch (e) {
                alert("Layer failed: \"" + layer.name + "\" (comp: \"" + sourceComp.name + "\")\n" + e.toString());
                throw e;
            }
        }
        return out;
    }

    function getMotionTileEffectXML(layer, indent) {
        var out = "";
        try {
            var fx = layer.Effects;
            if (!fx) return out;
            for (var e = 1; e <= fx.numProperties; e++) {
                var eff = fx.property(e);
                if (!eff || !eff.enabled) continue;
                var matchName = "";
                try { matchName = eff.matchName; } catch (em) {}
                if (matchName !== "ADBE Tile") continue;
                var tileW = 100, tileH = 100, phaseDeg = 0;
                try { tileW = eff.property(2).valueAtTime(0, false); } catch (e1) {}
                try { tileH = eff.property(3).valueAtTime(0, false); } catch (e2) {}
                try { phaseDeg = eff.property(7).valueAtTime(0, false); } catch (e3) {}
                var scaleVal = ((tileW + tileH) / 2) / 100;
                if (scaleVal <= 0) scaleVal = 1;
                var phaseNorm = (((phaseDeg % 360) + 360) % 360) / 360;
                out += indent + '<effect id="com.alightcreative.effects.tile" locallyApplied="true">\n';
                out += indent + '  <property name="scale" type="float" value="' + scaleVal.toFixed(6) + '" />\n';
                out += indent + '  <property name="phase" type="float" value="' + phaseNorm.toFixed(6) + '" />\n';
                out += indent + '  <property name="mirror" type="bool" value="true" />\n';
                out += indent + '  <property name="vertoffs" type="bool" value="false" />\n';
                out += indent + '  <property name="angle" type="float" value="0.000000" />\n';
                out += indent + '</effect>\n';
            }
        } catch (e) {}
        return out;
    }

    function getMotionBlurEffectXML(layer, comp, indent) {
        var out = "";
        try {
            var layerMB = false;
            try { layerMB = layer.motionBlur; } catch (e) {}
            var compMB = false;
            try { compMB = comp.motionBlur; } catch (e) {}
            if (layerMB && compMB) {
                out += indent + '<effect id="com.alightcreative.effects.motionblur4" locallyApplied="true">\n';
                out += indent + '  <property name="tune" type="float" value="0.800000" />\n';
                out += indent + '  <property name="usePos" type="bool" value="true" />\n';
                out += indent + '  <property name="useScale" type="bool" value="true" />\n';
                out += indent + '  <property name="useAngle" type="bool" value="true" />\n';
                out += indent + '</effect>\n';
            }
        } catch (e) {}
        return out;
    }

    function renderSingleLayer(sourceComp, layer, indent, idFor) {
        var layerId = idFor(layer);
        var label = escapeXml(layer.name);
        var startTime = Math.round(layer.inPoint * 1000);
        var endTime = Math.round(layer.outPoint * 1000);
        var parentStr = "";
        if (layer.parent) {
            var pid = idFor(layer.parent);
            if (pid !== null) parentStr = ' parent="' + pid + '"';
        }
        var isPrecomp = false;
        try { isPrecomp = (layer.source && (layer.source instanceof CompItem)); } catch (e) {}
        var out = "";
        if (isPrecomp) {
            var srcComp = layer.source;
            var precompTotalMs = Math.round(srcComp.duration * 1000);
            out += indent + '<embedScene id="' + layerId + '" label="' + label + '" startTime="' + startTime + '" endTime="' + endTime + '" fillType="intrinsic" outTime="' + precompTotalMs + '"' + parentStr + ' mediaFillMode="fill">\n';
            out += indent + '  <transform>\n';
            out += getTransformXML(layer);
            out += indent + '  </transform>\n';
            out += getMotionTileEffectXML(layer, indent + "  ");
            out += getMotionBlurEffectXML(layer, sourceComp, indent + "  ");
            out += indent + '  <scene title="' + escapeXml(srcComp.name) + '" width="' + srcComp.width + '" height="' + srcComp.height + '" exportWidth="' + srcComp.width + '" exportHeight="' + srcComp.height + '" precompose="dynamicResolution" bgcolor="#00000000" totalTime="' + precompTotalMs + '" fps="' + srcComp.frameRate + '" modifiedTime="0" amver="1002592" ffver="106" am="com.alightcreative.motion/5.0.275" amplatform="android" retime="off" retimeAdaptFPS="false">\n';
            out += renderCompLayers(srcComp, indent + "    ");
            out += indent + '  </scene>\n';
            out += indent + '</embedScene>\n';
        } else if (layer.nullLayer) {
            out += indent + '<nullobj id="' + layerId + '" label="' + label + '" startTime="' + startTime + '" endTime="' + endTime + '"' + parentStr + ' mediaFillMode="fill" type="perspective">\n';
            out += indent + '  <transform>\n';
            out += getTransformXML(layer);
            out += indent + '  </transform>\n';
            out += indent + '</nullobj>\n';
        } else {
            var layerW = 100, layerH = 100;
            if (layer.width !== undefined && layer.height !== undefined) {
                layerW = layer.width;
                layerH = layer.height;
            } else if (layer.source && layer.source.width) {
                layerW = layer.source.width;
                layerH = layer.source.height;
            }
            var hasMask = false;
            var firstMask = null;
            try {
                var maskGroup = layer.property("ADBE Mask Parade");
                if (maskGroup && maskGroup.numProperties > 0) {
                    for (var m = 1; m <= maskGroup.numProperties; m++) {
                        var mp = maskGroup.property(m);
                        if (mp.enabled) { firstMask = mp; hasMask = true; break; }
                    }
                }
            } catch (e) {}
            var sizeW = layerW / 2;
            var sizeH = layerH / 2;
            var isRealMedia = false;
            try {
                if (layer.source && layer.source.mainSource && !(layer.source.mainSource instanceof SolidSource)) {
                    isRealMedia = true;
                }
            } catch (e) {}
            var fillColorHex = isRealMedia ? "" : getLayerFillColor(sourceComp, layer);
            if (isRealMedia) {
                var sourceFileName = layer.name;
                try { if (layer.source && layer.source.name) sourceFileName = layer.source.name; } catch (e) {}
                var mediaLabel = escapeXml(sourceFileName);
                var sampleToken = String(sourceFileName).replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
                if (!sampleToken) sampleToken = 'photo';
                out += indent + '<shape id="' + layerId + '" label="' + mediaLabel + '" startTime="' + startTime + '" endTime="' + endTime + '"' + parentStr + ' fillType="media" fillImage="sample:' + sampleToken + '?w=' + Math.round(layerW) + '&amp;h=' + Math.round(layerH) + '" mediaFillMode="fill" s=".rect">\n';
            } else {
                out += indent + '<shape id="' + layerId + '" label="' + label + '" startTime="' + startTime + '" endTime="' + endTime + '"' + parentStr + ' fillType="color" mediaFillMode="fill" s=".rect">\n';
            }
            if (hasMask && firstMask) {
                var t = 0;
                var maskPath = firstMask.property("Mask Path");
                var shapeVal = maskPath.valueAtTime(t, false);
                var maskInverted = false;
                try { maskInverted = firstMask.inverted; } catch (e) {}
                var verts = shapeVal.vertices;
                var maskLeft = verts[0][0], maskRight = verts[0][0];
                var maskTop  = verts[0][1], maskBottom = verts[0][1];
                for (var v = 1; v < verts.length; v++) {
                    if (verts[v][0] < maskLeft)   maskLeft   = verts[v][0];
                    if (verts[v][0] > maskRight)  maskRight  = verts[v][0];
                    if (verts[v][1] < maskTop)    maskTop    = verts[v][1];
                    if (verts[v][1] > maskBottom) maskBottom = verts[v][1];
                }
                var anchor = [layerW / 2, layerH / 2];
                try { anchor = layer.property("Anchor Point").valueAtTime(t, false); } catch (e) {}
                var clamp01 = function(v) { return Math.max(0, Math.min(1, v)); };
                var startH = clamp01(maskLeft  / layerW);
                var endH   = clamp01(maskRight  / layerW);
                var startV = clamp01(maskTop    / layerH);
                var endV   = clamp01(maskBottom / layerH);
                if (maskInverted) {
                    var tmp;
                    tmp = startH; startH = 1 - endH; endH = 1 - tmp;
                    tmp = startV; startV = 1 - endV; endV = 1 - tmp;
                }
                var maskCenterX = (maskLeft + maskRight)  / 2;
                var maskCenterY = (maskTop  + maskBottom) / 2;
                var pivotAM_X = maskCenterX - layerW / 2;
                var pivotAM_Y = maskCenterY - layerH / 2;
                var scaleX = 1.0, scaleY = 1.0;
                try {
                    var sVal = layer.property("Scale").valueAtTime(t, false);
                    scaleX = sVal[0] / 100;
                    scaleY = sVal[1] / 100;
                } catch (e) {}
                out += indent + '  <transform>\n';
                try { out += getPositionXML(layer); } catch (e) {}
                if (Math.abs(pivotAM_X) > 0.5 || Math.abs(pivotAM_Y) > 0.5) {
                    out += indent + '    <pivot value="' + pivotAM_X.toFixed(6) + ',' + pivotAM_Y.toFixed(6) + '" />\n';
                }
                try { out += getScaleXML(layer); } catch (e) {}
                var rot = 0;
                try { rot = layer.property("Rotation").valueAtTime(t, false); } catch (e) {}
                if (rot !== 0) {
                    out += indent + '    <rotation value="' + rot.toFixed(6) + '" />\n';
                }
                try { out += getOpacityXML(layer); } catch (e) {}
                out += indent + '  </transform>\n';
                if (!isRealMedia) {
                    out += indent + '  <fillColor value="' + fillColorHex + '" />\n';
                }
                out += getMotionTileEffectXML(layer, indent + "  ");
                out += getMotionBlurEffectXML(layer, sourceComp, indent + "  ");
                out += indent + '  <effect id="com.alightcreative.effects.wipe2" locallyApplied="true">\n';
                out += indent + '    <property name="start" type="float" value="' + startH.toFixed(6) + '" />\n';
                out += indent + '    <property name="end"   type="float" value="' + endH.toFixed(6)   + '" />\n';
                out += indent + '    <property name="angle" type="float" value="0.000000" />\n';
                out += indent + '    <property name="feather" type="float" value="0.000000" />\n';
                out += indent + '  </effect>\n';
                out += indent + '  <effect id="com.alightcreative.effects.wipe2" locallyApplied="true">\n';
                out += indent + '    <property name="start" type="float" value="' + startV.toFixed(6) + '" />\n';
                out += indent + '    <property name="end"   type="float" value="' + endV.toFixed(6)   + '" />\n';
                out += indent + '    <property name="angle" type="float" value="90.000000" />\n';
                out += indent + '    <property name="feather" type="float" value="0.000000" />\n';
                out += indent + '  </effect>\n';
            } else {
                out += indent + '  <transform>\n';
                out += getTransformXML(layer);
                out += indent + '  </transform>\n';
                if (!isRealMedia) {
                    out += indent + '  <fillColor value="' + fillColorHex + '" />\n';
                }
                out += getMotionTileEffectXML(layer, indent + "  ");
                out += getMotionBlurEffectXML(layer, sourceComp, indent + "  ");
            }
            out += indent + '  <property name="size" type="vec2" value="' + sizeW.toFixed(6) + ',' + sizeH.toFixed(6) + '" />\n';
            out += indent + '</shape>\n';
        }
        return out;
    }

    function toHex2(v) {
        var val = Math.round(Math.max(0, Math.min(1, v)) * 255);
        var h = val.toString(16).toUpperCase();
        return (h.length < 2 ? "0" : "") + h;
    }

    function getLayerFillColor(comp, layer) {
        var FALLBACK = "#ff888888";
        try {
            if (layer.source && layer.source.mainSource && (layer.source.mainSource instanceof SolidSource)) {
                var col = layer.source.mainSource.color;
                return "#ff" + toHex2(col[0]) + toHex2(col[1]) + toHex2(col[2]);
            }
        } catch (e) {}
        try {
            var sampled = samplePixelColorAtCenter(comp, layer);
            if (sampled) return sampled;
        } catch (e) {}
        return FALLBACK;
    }

    function samplePixelColorAtCenter(comp, layer) {
        var t = (layer.inPoint + layer.outPoint) / 2;
        if (t < 0) t = 0;
        var maxT = comp.duration - (1 / comp.frameRate);
        if (t > maxT) t = maxT;
        var rect = layer.sourceRectAtTime(t, false);
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var fx = null;
        try {
            fx = layer.Effects.addProperty("ADBE Color Control");
        } catch (e) { return null; }
        var result = null;
        try {
            var colorProp = fx.property(1);
            colorProp.expression = 'sampleImage([' + cx.toFixed(3) + ',' + cy.toFixed(3) + '], [1,1], true, ' + t.toFixed(6) + ');';
            var val = colorProp.valueAtTime(t, false);
            if (val && val.length >= 3) result = val;
        } catch (e) { result = null; }
        try { fx.remove(); } catch (e) {}
        if (result) {
            var a = (result.length >= 4) ? result[3] : 1;
            return "#" + toHex2(a) + toHex2(result[0]) + toHex2(result[1]) + toHex2(result[2]);
        }
        return null;
    }

    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    function getLayerSize(layer) {
        var size = { w: 100, h: 100 };
        if (layer.width !== undefined && layer.height !== undefined) {
            size.w = layer.width;
            size.h = layer.height;
        } else if (typeof layer.sourceRectAtTime === "function") {
            try {
                var rect = layer.sourceRectAtTime(0, false);
                size.w = rect.width;
                size.h = rect.height;
            } catch (e) {}
        }
        if (size.w <= 0) size.w = 100;
        if (size.h <= 0) size.h = 100;
        size.w = size.w / 2;
        size.h = size.h / 2;
        return size;
    }

    function getNormalizedTime(aeTime, layer) {
        var layerStartMs = layer.inPoint * 1000;
        var layerEndMs = layer.outPoint * 1000;
        var layerDurationMs = layerEndMs - layerStartMs;
        if (layerDurationMs <= 0) return 0;
        var keyMs = aeTime * 1000;
        var t = (keyMs - layerStartMs) / layerDurationMs;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return t;
    }

    function clampKeyTimesToLayerRange(keyTimes, layer) {
        var inT = layer.inPoint;
        var outT = layer.outPoint;
        var EPS = 1e-6;
        var result = [];
        for (var i = 0; i < keyTimes.length; i++) {
            var t = keyTimes[i];
            if (t < inT - EPS || t > outT + EPS) continue;
            result.push(t);
        }
        if (result.length === 0) result.push(inT);
        return result;
    }

    function getEaseString(prop, keyIndex) {
        if (keyIndex === 1) return "";
        try {
            if (prop.keyInInterpolationType(keyIndex) !== KeyframeInterpolationType.BEZIER) return "";
            var t0 = prop.keyTime(keyIndex - 1);
            var t1 = prop.keyTime(keyIndex);
            var dt = t1 - t0;
            var v0raw = prop.keyValue(keyIndex - 1);
            var v1raw = prop.keyValue(keyIndex);
            var v0 = (v0raw instanceof Array) ? v0raw[0] : v0raw;
            var v1 = (v1raw instanceof Array) ? v1raw[0] : v1raw;
            var dv = v1 - v0;
            var x1, y1, x2, y2;
            if (dv === 0 || dt === 0) {
                x1 = 0.333; y1 = 0.333; x2 = 0.667; y2 = 0.667;
            } else {
                var outEase = prop.keyOutTemporalEase(keyIndex - 1)[0];
                var inEase = prop.keyInTemporalEase(keyIndex)[0];
                x1 = outEase.influence / 100;
                y1 = (outEase.speed * dt) / (3 * dv);
                x2 = 1 - (inEase.influence / 100);
                y2 = 1 - ((inEase.speed * dt) / (3 * dv));
            }
            x1 = Math.max(0, Math.min(1, x1));
            x2 = Math.max(0, Math.min(1, x2));
            return ' e="cubicBezier ' + x1.toFixed(4) + ' ' + y1.toFixed(4) + ' ' + x2.toFixed(4) + ' ' + y2.toFixed(4) + '"';
        } catch (e) { return ""; }
    }

    function findKeyIndexAtTime(prop, t) {
        for (var k = 1; k <= prop.numKeys; k++) {
            if (Math.abs(prop.keyTime(k) - t) < 0.001) return k;
        }
        return -1;
    }

    function getHoldPlateauXML(prop, keyIndex, currentValueStr, nextTimeNorm, currentTimeNorm, layer) {
        if (keyIndex === -1) return "";
        try {
            if (prop.keyOutInterpolationType(keyIndex) !== KeyframeInterpolationType.HOLD) return "";
        } catch (e) { return ""; }
        var oneFrameNorm = 0.0005;
        try {
            var fps = layer.containingComp.frameRate;
            var layerDurationSec = layer.outPoint - layer.inPoint;
            if (fps > 0 && layerDurationSec > 0) {
                oneFrameNorm = (1 / fps) / layerDurationSec;
            }
        } catch (e) {}
        var plateauT = nextTimeNorm - oneFrameNorm;
        if (plateauT < currentTimeNorm) plateauT = currentTimeNorm;
        return '        <kf t="' + plateauT.toFixed(6) + '" v="' + currentValueStr + '" />\n';
    }

    function getTransformXML(layer) {
        var tXml = "";
        try { tXml += getPositionXML(layer); } catch (e) { throw new Error("getPositionXML failed for \"" + layer.name + "\": " + e.toString()); }
        try {
            var layerW = 100, layerH = 100;
            if (layer.width !== undefined && layer.height !== undefined) {
                layerW = layer.width; layerH = layer.height;
            } else if (layer.source && layer.source.width) {
                layerW = layer.source.width; layerH = layer.source.height;
            }
            var anchor = [layerW / 2, layerH / 2];
            try { anchor = layer.property("Anchor Point").valueAtTime(0, false); } catch (e) {}
            var hasCustomAnchor = (Math.abs(anchor[0] - layerW / 2) > 0.5 || Math.abs(anchor[1] - layerH / 2) > 0.5);
            if (!layer.nullLayer && hasCustomAnchor) {
                var pivotAM_X = anchor[0] - layerW / 2;
                var pivotAM_Y = anchor[1] - layerH / 2;
                if (Math.abs(pivotAM_X) > 0.5 || Math.abs(pivotAM_Y) > 0.5) {
                    tXml += '      <pivot value="' + pivotAM_X.toFixed(6) + ',' + pivotAM_Y.toFixed(6) + '" />\n';
                }
            }
        } catch (e) {}
        try { tXml += getScaleXML(layer); } catch (e) { throw new Error("getScaleXML failed for \"" + layer.name + "\": " + e.toString()); }
        try { tXml += getRotationXML(layer); } catch (e) { throw new Error("getRotationXML failed for \"" + layer.name + "\": " + e.toString()); }
        try { tXml += getOpacityXML(layer); } catch (e) { throw new Error("getOpacityXML failed for \"" + layer.name + "\": " + e.toString()); }
        return tXml;
    }

    function getPositionXML(layer) {
        var posProp = layer.transform.position;
        var isSeparated = posProp.dimensionsSeparated;
        var isAnimated = isSeparated ? (layer.transform.xPosition.numKeys > 0 || layer.transform.yPosition.numKeys > 0) : (posProp.numKeys > 0);
        var layerW = 100, layerH = 100;
        if (layer.width !== undefined && layer.height !== undefined) {
            layerW = layer.width; layerH = layer.height;
        } else if (layer.source && layer.source.width) {
            layerW = layer.source.width; layerH = layer.source.height;
        }
        var anchor = [layerW / 2, layerH / 2];
        try { anchor = layer.property("Anchor Point").valueAtTime(0, false); } catch (e) {}
        if (layer.nullLayer) { anchor = [layerW / 2, layerH / 2]; }
        var hasCustomAnchor = (Math.abs(anchor[0] - layerW / 2) > 0.5 || Math.abs(anchor[1] - layerH / 2) > 0.5);
        var usePivot = hasCustomAnchor;
        var targetCenterX = hasCustomAnchor ? anchor[0] : layerW / 2;
        var targetCenterY = hasCustomAnchor ? anchor[1] : layerH / 2;
        var processPosition = function(val) {
            var xVal = val[0];
            var yVal = val[1];
            if (usePivot) {
                xVal = xVal + (layerW / 2 - targetCenterX);
                yVal = yVal + (layerH / 2 - targetCenterY);
            } else {
                xVal = xVal + (layerW / 2 - anchor[0]);
                yVal = yVal + (layerH / 2 - anchor[1]);
            }
            return xVal.toFixed(6) + ',' + yVal.toFixed(6) + ',0.000000';
        };
        if (!isAnimated) {
            var val = isSeparated ? [layer.transform.xPosition.value, layer.transform.yPosition.value, 0] : posProp.value;
            return '      <location value="' + processPosition(val) + '" />\n';
        }
        var xml = '      <location>\n';
        var keyTimes = [];
        if (isSeparated) {
            var xProp = layer.transform.xPosition;
            var yProp = layer.transform.yPosition;
            var timesMap = {};
            for (var k = 1; k <= xProp.numKeys; k++) timesMap[xProp.keyTime(k).toFixed(4)] = xProp.keyTime(k);
            for (var k2 = 1; k2 <= yProp.numKeys; k2++) timesMap[yProp.keyTime(k2).toFixed(4)] = yProp.keyTime(k2);
            for (var key in timesMap) keyTimes.push(timesMap[key]);
            keyTimes.sort(function(a, b){ return a - b; });
        } else {
            for (var k3 = 1; k3 <= posProp.numKeys; k3++) { keyTimes.push(posProp.keyTime(k3)); }
        }
        keyTimes = clampKeyTimesToLayerRange(keyTimes, layer);
        for (var i = 0; i < keyTimes.length; i++) {
            var t = keyTimes[i];
            var xVal = isSeparated ? layer.transform.xPosition.valueAtTime(t, true) : posProp.valueAtTime(t, true)[0];
            var yVal = isSeparated ? layer.transform.yPosition.valueAtTime(t, true) : posProp.valueAtTime(t, true)[1];
            var processed = processPosition([xVal, yVal]);
            var normTimeNum = getNormalizedTime(t, layer);
            var normTime = normTimeNum.toFixed(6);
            var easeStr = "";
            if (i > 0) {
                if (isSeparated) {
                    if (isBakedProp(layer, layer.transform.xPosition) || isBakedProp(layer, layer.transform.yPosition)) {
                        easeStr = "";
                    } else {
                        var easeX = "", easeY = "";
                        var kx = findKeyIndexAtTime(layer.transform.xPosition, t);
                        var ky = findKeyIndexAtTime(layer.transform.yPosition, t);
                        if (kx !== -1) easeX = getEaseString(layer.transform.xPosition, kx);
                        if (ky !== -1) easeY = getEaseString(layer.transform.yPosition, ky);
                        easeStr = easeX || easeY || ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                    }
                } else if (isBakedProp(layer, posProp)) {
                    easeStr = "";
                } else {
                    var keyIndex = findKeyIndexAtTime(posProp, t);
                    easeStr = (keyIndex !== -1) ? getEaseString(posProp, keyIndex) : ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                }
            }
            xml += '        <kf t="' + normTime + '" v="' + processed + '"' + easeStr + ' />\n';
            if (!isSeparated && i < keyTimes.length - 1) {
                var curIdx = findKeyIndexAtTime(posProp, t);
                var nextNorm = getNormalizedTime(keyTimes[i + 1], layer);
                xml += getHoldPlateauXML(posProp, curIdx, processed, nextNorm, normTimeNum, layer);
            }
        }
        xml += '      </location>\n';
        return xml;
    }

    function getScaleXML(layer) {
        var scaleProp = layer.transform.scale;
        var isSeparated = false;
        try { isSeparated = scaleProp.dimensionsSeparated; } catch (e) {}
        var xProp = null, yProp = null;
        if (isSeparated) {
            try {
                xProp = layer.transform.property("X Scale");
                yProp = layer.transform.property("Y Scale");
                if (!xProp || !yProp) isSeparated = false;
            } catch (e) { isSeparated = false; }
        }
        var processScale = function(xv, yv) { return (xv / 100).toFixed(6) + ',' + (yv / 100).toFixed(6); };
        var isAnimated = isSeparated ? ((xProp.numKeys > 0) || (yProp.numKeys > 0)) : (scaleProp.numKeys > 0);
        if (!isAnimated) {
            var xv, yv;
            if (isSeparated) { xv = xProp.value; yv = yProp.value; }
            else { var val = scaleProp.value; xv = val[0]; yv = val[1]; }
            return '      <scale value="' + processScale(xv, yv) + '" />\n';
        }
        var xml = '      <scale>\n';
        var keyTimes = [];
        if (isSeparated) {
            var timesMap = {};
            for (var k = 1; k <= xProp.numKeys; k++) timesMap[xProp.keyTime(k).toFixed(4)] = xProp.keyTime(k);
            for (var k2 = 1; k2 <= yProp.numKeys; k2++) timesMap[yProp.keyTime(k2).toFixed(4)] = yProp.keyTime(k2);
            for (var key in timesMap) keyTimes.push(timesMap[key]);
            keyTimes.sort(function(a, b) { return a - b; });
        } else {
            for (var k3 = 1; k3 <= scaleProp.numKeys; k3++) keyTimes.push(scaleProp.keyTime(k3));
        }
        keyTimes = clampKeyTimesToLayerRange(keyTimes, layer);
        for (var i = 0; i < keyTimes.length; i++) {
            var t = keyTimes[i];
            var xVal = isSeparated ? xProp.valueAtTime(t, true) : scaleProp.valueAtTime(t, true)[0];
            var yVal = isSeparated ? yProp.valueAtTime(t, true) : scaleProp.valueAtTime(t, true)[1];
            var processed = processScale(xVal, yVal);
            var normTimeNum = getNormalizedTime(t, layer);
            var normTime = normTimeNum.toFixed(6);
            var easeStr = "";
            if (i > 0) {
                if (isSeparated) {
                    if (isBakedProp(layer, xProp) || isBakedProp(layer, yProp)) {
                        easeStr = "";
                    } else {
                        var easeX = "", easeY = "";
                        var kx = findKeyIndexAtTime(xProp, t);
                        var ky = findKeyIndexAtTime(yProp, t);
                        if (kx !== -1) easeX = getEaseString(xProp, kx);
                        if (ky !== -1) easeY = getEaseString(yProp, ky);
                        easeStr = easeX || easeY || ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                    }
                } else if (isBakedProp(layer, scaleProp)) {
                    easeStr = "";
                } else {
                    var keyIndex = findKeyIndexAtTime(scaleProp, t);
                    easeStr = (keyIndex !== -1) ? getEaseString(scaleProp, keyIndex) : ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                }
            }
            xml += '        <kf t="' + normTime + '" v="' + processed + '"' + easeStr + ' />\n';
            if (!isSeparated && i < keyTimes.length - 1) {
                var curIdx = findKeyIndexAtTime(scaleProp, t);
                var nextNorm = getNormalizedTime(keyTimes[i + 1], layer);
                xml += getHoldPlateauXML(scaleProp, curIdx, processed, nextNorm, normTimeNum, layer);
            }
        }
        xml += '      </scale>\n';
        return xml;
    }

    function getRotationXML(layer) {
        var rotProp = layer.transform.rotation;
        var isAnimated = rotProp.numKeys > 0;
        var processRotation = function(val) { return val.toFixed(6); };
        return exportPropertyToXML(rotProp, 'rotation', isAnimated, processRotation, layer);
    }

    function getOpacityXML(layer) {
        var opProp = layer.transform.opacity;
        var isAnimated = opProp.numKeys > 0;
        var processOpacity = function(val) { return (val / 100).toFixed(6); };
        return exportPropertyToXML(opProp, 'opacity', isAnimated, processOpacity, layer);
    }

    function exportPropertyToXML(prop, name, isAnimated, processValueFn, layer) {
        if (!isAnimated) {
            var val = prop.value;
            return '      <' + name + ' value="' + processValueFn(val) + '" />\n';
        }
        var xml = '      <' + name + '>\n';
        var keyTimes = [];
        for (var k = 1; k <= prop.numKeys; k++) { keyTimes.push(prop.keyTime(k)); }
        keyTimes = clampKeyTimesToLayerRange(keyTimes, layer);
        for (var i = 0; i < keyTimes.length; i++) {
            var t = keyTimes[i];
            var val = prop.valueAtTime(t, true);
            var processed = processValueFn(val);
            var normTimeNum = getNormalizedTime(t, layer);
            var normTime = normTimeNum.toFixed(6);
            var easeStr = "";
            var keyIndex = findKeyIndexAtTime(prop, t);
            if (i > 0) {
                if (isBakedProp(layer, prop)) {
                    easeStr = "";
                } else {
                    easeStr = (keyIndex !== -1) ? getEaseString(prop, keyIndex) : ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                }
            }
            xml += '        <kf t="' + normTime + '" v="' + processed + '"' + easeStr + ' />\n';
            if (i < keyTimes.length - 1) {
                var nextNorm = getNormalizedTime(keyTimes[i + 1], layer);
                xml += getHoldPlateauXML(prop, keyIndex, processed, nextNorm, normTimeNum, layer);
            }
        }
        xml += '      </' + name + '>\n';
        return xml;
    }
};
