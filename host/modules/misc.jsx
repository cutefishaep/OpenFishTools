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
        var targetInPoint = selLayer ? selLayer.inPoint : comp.workAreaStart;
        var targetOutPoint = selLayer ? selLayer.outPoint : (comp.workAreaStart + comp.workAreaDuration);
        var targetStartTime = selLayer ? selLayer.startTime : targetInPoint;
        var targetDuration = Math.max(targetOutPoint - targetInPoint, comp.frameDuration);

        var scaleX = parseFloat(w);
        if (isNaN(scaleX) || scaleX <= 0) scaleX = 100;
        var scaleY = parseFloat(h);
        if (isNaN(scaleY) || scaleY <= 0) scaleY = 100;
        var scaleZ = parseFloat(d);
        if (isNaN(scaleZ) || scaleZ <= 0) scaleZ = 100;

        var boxW, boxH, boxD;
        var layerSourceItem = null;

        if (selLayer) {
            if (selLayer.source && (selLayer.source instanceof FootageItem || selLayer.source instanceof CompItem)) {
                layerSourceItem = selLayer.source;
                boxW = layerSourceItem.width;
                boxH = layerSourceItem.height;
            } else {
                var sz = _getLayerSize(selLayer);
                boxW = sz[0] || comp.width;
                boxH = sz[1] || comp.height;
            }
            boxD = Math.min(boxW, boxH);
        } else {
            var compMin = Math.min(comp.width, comp.height);
            boxW = compMin;
            boxH = compMin;
            boxD = compMin;
        }

        var precompName = "Cube_Comp";
        var count = 1;
        while (true) {
            var found = false;
            for (var j = 1; j <= app.project.numItems; j++) {
                if (app.project.item(j) instanceof CompItem && app.project.item(j).name === precompName) {
                    found = true;
                    break;
                }
            }
            if (!found) break;
            count++;
            precompName = "Cube_Comp " + count;
        }

        var cubeComp = app.project.items.addComp(
            precompName,
            Math.round(boxW),
            Math.round(boxH),
            comp.pixelAspect,
            targetDuration,
            comp.frameRate
        );
        cubeComp.motionBlur = true;

        var sideNames = ["Front", "Back", "Left", "Right", "Top", "Bottom"];
        var sides = [];

        for (var i = 0; i < 6; i++) {
            var side;
            if (layerSourceItem) {
                side = cubeComp.layers.add(layerSourceItem);
                side.startTime = targetStartTime - targetInPoint;
            } else {
                side = cubeComp.layers.addSolid([0.5, 0.5, 0.5], "Cube_" + sideNames[i], Math.round(boxW), Math.round(boxH), 1.0);
            }
            side.name = "Cube_" + sideNames[i];
            side.inPoint = 0;
            side.outPoint = targetDuration;
            side.threeDLayer = true;
            side.motionBlur = true;
            side.label = 11;
            sides.push(side);
        }

        var controller = cubeComp.layers.addNull();
        controller.name = "Cube_Controller";
        controller.threeDLayer = true;
        controller.motionBlur = true;
        controller.label = 1;
        controller.inPoint = 0;
        controller.outPoint = targetDuration;
        controller.position.setValue([boxW / 2, boxH / 2, 0]);
        controller.scale.setValue([100, 100, 100]);

        var halfW = boxW / 2;
        var halfH = boxH / 2;
        var halfD = boxD / 2;

        for (var i = 0; i < 6; i++) {
            var sz = _getLayerSize(sides[i]);
            var currentW = sz[0] || boxW;
            var currentH = sz[1] || boxH;

            sides[i].anchorPoint.setValue([currentW / 2, currentH / 2, 0]);
            sides[i].position.setValue([0, 0, 0]);
            sides[i].parent = controller;

            var localPos = [0, 0, 0];
            var localOri = [0, 0, 0];
            var targetWSide = boxW;
            var targetHSide = boxH;

            if (i === 0) {
                
                localPos = [0, 0, -halfD];
                localOri = [0, 0, 0];
                targetWSide = boxW; targetHSide = boxH;
            } else if (i === 1) {
                
                localPos = [0, 0, halfD];
                localOri = [0, 180, 0];
                targetWSide = boxW; targetHSide = boxH;
            } else if (i === 2) {
                
                localPos = [-halfW, 0, 0];
                localOri = [0, 90, 0];
                targetWSide = boxD; targetHSide = boxH;
            } else if (i === 3) {
                
                localPos = [halfW, 0, 0];
                localOri = [0, 270, 0];
                targetWSide = boxD; targetHSide = boxH;
            } else if (i === 4) {
                
                localPos = [0, -halfH, 0];
                localOri = [90, 0, 0];
                targetWSide = boxW; targetHSide = boxD;
            } else if (i === 5) {
                
                localPos = [0, halfH, 0];
                localOri = [270, 0, 0];
                targetWSide = boxW; targetHSide = boxD;
            }

            sides[i].position.setValue(localPos);
            sides[i].orientation.setValue(localOri);
            sides[i].scale.setValue([100 * targetWSide / currentW, 100 * targetHSide / currentH, 100]);
        }

        var precompLayer = comp.layers.add(cubeComp);
        precompLayer.startTime = targetInPoint;
        precompLayer.inPoint = targetInPoint;
        precompLayer.outPoint = targetOutPoint;
        precompLayer.threeDLayer = true;
        try { precompLayer.collapseTransformation = true; } catch (e) {}
        precompLayer.motionBlur = true;
        comp.motionBlur = true;
        precompLayer.position.setValue([comp.width / 2, comp.height / 2, 0]);
        precompLayer.scale.setValue([scaleX, scaleY, scaleZ]);
        precompLayer.label = 11;

        if (selLayer) {
            try { selLayer.remove(); } catch (e) {}
        }

        app.endUndoGroup();
        return '{"error":false, "message":"Cube generated and precomposed successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true, "message":"Cube error: ' + e.toString().replace(/"/g, "'") + '"}';
    }
}

function _create3DFace(comp, name, w, h, pos, ori, parent, textureSource, targetStartTime, targetInPoint, targetDuration, mainCompName, precompName, colorCtrlName, defaultRgba, shadeMult, customAnchor, cornerRoundness) {
    var cleanW = Math.max(2, Math.round(w));
    var cleanH = Math.max(2, Math.round(h));
    var face;

    if (textureSource) {
        face = comp.layers.add(textureSource);
        face.startTime = targetStartTime - targetInPoint;
        face.inPoint = 0;
        face.outPoint = targetDuration;
        var nativeW = face.width || cleanW;
        var nativeH = face.height || cleanH;
        face.scale.setValue([100 * cleanW / nativeW, 100 * cleanH / nativeH, 100]);
        if (customAnchor) {
            face.anchorPoint.setValue([customAnchor[0] * nativeW / cleanW, customAnchor[1] * nativeH / cleanH, 0]);
        } else {
            face.anchorPoint.setValue([nativeW / 2, nativeH / 2, 0]);
        }
    } else {
        face = comp.layers.addSolid([1, 1, 1], name, cleanW, cleanH, 1.0);
        face.inPoint = 0;
        face.outPoint = targetDuration;
        if (customAnchor) {
            face.anchorPoint.setValue([customAnchor[0], customAnchor[1], 0]);
        } else {
            face.anchorPoint.setValue([cleanW / 2, cleanH / 2, 0]);
        }
        try {
            var effectGroup = face.property("ADBE Effect Parade") || face.property("ADBE Effect Group") || face.property("Effects");
            var fill = effectGroup.addProperty("ADBE Fill");
            fill.name = "Color Fill";
            var mult = (typeof shadeMult === "number") ? shadeMult : 1.0;
            var ctrlName = colorCtrlName || "Body Color";
            var def = (defaultRgba && defaultRgba.length >= 4) ? defaultRgba : [0.5, 0.5, 0.5, 1.0];
            var defStr = '[' + def[0] + ',' + def[1] + ',' + def[2] + ',' + def[3] + ']';
            var expr = 'var c = ' + defStr + '; ';
            expr += 'try { c = thisComp.layer("Color Controller").effect("' + ctrlName + '")("Color"); } catch(e) {} ';
            if (mult !== 1.0) {
                expr += '[Math.min(1, c[0]*' + mult + '), Math.min(1, c[1]*' + mult + '), Math.min(1, c[2]*' + mult + '), c[3]]';
            } else {
                expr += 'c';
            }
            var colorProp = fill.property("ADBE Fill-0002") || fill.property("Color") || fill.property(2);
            if (colorProp) colorProp.expression = expr;
        } catch (e) {}
    }

    if (typeof cornerRoundness === "number" && cornerRoundness > 0) {
        try {
            var r = Math.min(cornerRoundness, Math.min(cleanW, cleanH) / 2);
            var layerW = face.width || cleanW;
            var layerH = face.height || cleanH;
            var scaleX = (textureSource && cleanW > 0) ? (layerW / cleanW) : 1;
            var scaleY = (textureSource && cleanH > 0) ? (layerH / cleanH) : 1;
            var rx = r * scaleX;
            var ry = r * scaleY;
            var kx = 0.5522847498 * rx;
            var ky = 0.5522847498 * ry;
            var cx = layerW / 2;
            var cy = layerH / 2;
            var hw = layerW / 2;
            var hh = layerH / 2;

            var maskGroup = face.property("ADBE Mask Parade") || face.property("Masks");
            if (maskGroup) {
                var newMask = maskGroup.addProperty("ADBE Mask Atom");
                newMask.maskMode = MaskMode.ADD;
                var maskShape = newMask.property("ADBE Mask Shape");
                var shape = maskShape.value;
                shape.vertices = [
                    [cx - hw + rx, cy - hh],
                    [cx + hw - rx, cy - hh],
                    [cx + hw, cy - hh + ry],
                    [cx + hw, cy + hh - ry],
                    [cx + hw - rx, cy + hh],
                    [cx - hw + rx, cy + hh],
                    [cx - hw, cy + hh - ry],
                    [cx - hw, cy - hh + ry]
                ];
                shape.inTangents = [
                    [-kx, 0], [0, 0], [0, -ky], [0, 0],
                    [kx, 0], [0, 0], [0, ky], [0, 0]
                ];
                shape.outTangents = [
                    [0, 0], [kx, 0], [0, 0], [0, ky],
                    [0, 0], [-kx, 0], [0, 0], [-ky, 0]
                ];
                shape.closed = true;
                maskShape.setValue(shape);
            }
        } catch (e) {}
    }

    face.name = name;
    face.threeDLayer = true;
    face.motionBlur = true;

    // Set parent first before assigning local coordinates
    face.parent = parent;
    face.position.setValue(pos);
    face.orientation.setValue(ori);

    return face;
}

function _setXRotationExpr(layer, expr) {
    if (!layer) return;
    try {
        var tGroup = layer.property("ADBE Transform Group") || layer;
        var p = tGroup.property("ADBE Rotate X") || layer.property("ADBE Rotate X") || layer.xRotation;
        if (p) p.expression = expr;
    } catch (e) {}
}

function _setYRotationExpr(layer, expr) {
    if (!layer) return;
    try {
        var tGroup = layer.property("ADBE Transform Group") || layer;
        var p = tGroup.property("ADBE Rotate Y") || layer.property("ADBE Rotate Y") || layer.yRotation;
        if (p) p.expression = expr;
    } catch (e) {}
}

function _setZRotationExpr(layer, expr) {
    if (!layer) return;
    try {
        var tGroup = layer.property("ADBE Transform Group") || layer;
        var p = tGroup.property("ADBE Rotate Z") || layer.property("ADBE Rotate Z") || layer.zRotation || layer.rotation;
        if (p) p.expression = expr;
    } catch (e) {}
}

function _addCtrlColor(layer, name, rgba) {
    if (!layer) return null;
    try {
        var effectGroup = layer.property("ADBE Effect Parade") || layer.property("ADBE Effect Group") || layer.property("Effects");
        var eff = effectGroup.addProperty("ADBE Color Control");
        eff.name = name;
        var p = eff.property("ADBE Color Control-0001") || eff.property("Color") || eff.property(1);
        if (p && typeof p.setValue === "function") p.setValue(rgba);
        return eff;
    } catch (e) { return null; }
}

function _addCtrlAngle(layer, name, defaultAngle) {
    if (!layer) return null;
    try {
        var effectGroup = layer.property("ADBE Effect Parade") || layer.property("ADBE Effect Group") || layer.property("Effects");
        var eff = effectGroup.addProperty("ADBE Angle Control");
        eff.name = name;
        var p = eff.property("ADBE Angle Control-0001") || eff.property("Angle") || eff.property(1);
        if (p && typeof p.setValue === "function") p.setValue(defaultAngle);
        return eff;
    } catch (e) { return null; }
}

function _addCtrlSlider(layer, name, defaultVal) {
    if (!layer) return null;
    try {
        var effectGroup = layer.property("ADBE Effect Parade") || layer.property("ADBE Effect Group") || layer.property("Effects");
        var eff = effectGroup.addProperty("ADBE Slider Control");
        eff.name = name;
        var p = eff.property("ADBE Slider Control-0001") || eff.property("Slider") || eff.property(1);
        if (p && typeof p.setValue === "function") p.setValue(defaultVal);
        return eff;
    } catch (e) { return null; }
}

function _addCtrlCheckbox(layer, name, defaultVal) {
    if (!layer) return null;
    try {
        var effectGroup = layer.property("ADBE Effect Parade") || layer.property("ADBE Effect Group") || layer.property("Effects");
        var eff = effectGroup.addProperty("ADBE Checkbox Control");
        eff.name = name;
        var p = eff.property("ADBE Checkbox Control-0001") || eff.property("Checkbox") || eff.property(1);
        if (p && typeof p.setValue === "function") p.setValue(defaultVal ? 1 : 0);
        return eff;
    } catch (e) { return null; }
}

function _GEN_3D(type) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select an active composition first!"}';
    }

    var typeNames = {
        "BOX": "3D_Box",
        "CABINET": "3D_Cabinet",
        "TABLE": "3D_Table",
        "PHONE": "3D_Phone",
        "LAPTOP": "3D_Laptop",
        "ROOM": "3D_Room",
        "CRT": "3D_CRT_TV",
        "ZFLIP": "3D_ZFlip",
        "ZFOLD": "3D_ZFold",
        "BOOK": "3D_Book",
        "BINDER": "3D_Binder",
        "TABLET": "3D_Tablet",
        "GLASSES": "3D_Glasses",
        "WINDOW": "3D_Window",
        "DOOR": "3D_Door",
        "DESK": "3D_Desk",
        "MONITOR": "3D_Monitor",
        "PC": "3D_PC_Tower"
    };

    var baseName = typeNames[type] || "3D_Object";
    app.beginUndoGroup("Generate " + baseName);

    try {
        var selLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
        var targetInPoint = selLayer ? selLayer.inPoint : comp.workAreaStart;
        var targetOutPoint = selLayer ? selLayer.outPoint : (comp.workAreaStart + comp.workAreaDuration);
        var targetStartTime = selLayer ? selLayer.startTime : targetInPoint;
        var targetDuration = Math.max(targetOutPoint - targetInPoint, comp.frameDuration);

        var layerSourceItem = (selLayer && selLayer.source && (selLayer.source instanceof FootageItem || selLayer.source instanceof CompItem)) ? selLayer.source : null;

        var compW = comp.width;
        var compH = comp.height;
        var mCompName = comp.name;

        // Find unique precomp name
        var precompName = baseName + "_Comp";
        var count = 1;
        while (true) {
            var found = false;
            for (var j = 1; j <= app.project.numItems; j++) {
                if (app.project.item(j) instanceof CompItem && app.project.item(j).name === precompName) {
                    found = true;
                    break;
                }
            }
            if (!found) break;
            count++;
            precompName = baseName + "_Comp " + count;
        }

        var objComp = app.project.items.addComp(
            precompName,
            compW,
            compH,
            comp.pixelAspect,
            targetDuration,
            comp.frameRate
        );
        objComp.motionBlur = true;

        var controller = objComp.layers.addNull();
        controller.name = baseName + "_Controller";
        controller.threeDLayer = true;
        controller.motionBlur = true;
        controller.label = 1;
        controller.inPoint = 0;
        controller.outPoint = targetDuration;
        controller.position.setValue([compW / 2, compH / 2, 0]);
        controller.scale.setValue([100, 100, 100]);

        var colorCtrlLayer = objComp.layers.addNull();
        colorCtrlLayer.name = "Color Controller";
        colorCtrlLayer.label = 13;
        colorCtrlLayer.inPoint = 0;
        colorCtrlLayer.outPoint = targetDuration;

        var colorControlsList = [];
        var angleControlsList = [];

        if (type === "BOX") {
            var cOuter = [0.82, 0.65, 0.44, 1.0];
            var cInner = [0.62, 0.46, 0.28, 1.0];
            colorControlsList = [
                { name: "Outer Box Color", val: cOuter },
                { name: "Inner Shade Color", val: cInner }
            ];
            angleControlsList.push({ name: "Front & Back Flaps", val: 65 });
            angleControlsList.push({ name: "Left & Right Flaps", val: 65 });

            var bW = (layerSourceItem && layerSourceItem.width > 200) ? Math.min(layerSourceItem.width, 700) : 500;
            var bH = (layerSourceItem && layerSourceItem.height > 200) ? Math.min(layerSourceItem.height, 700) : 500;
            var bD = Math.min(bW, bH);
            var hW = bW / 2, hH = bH / 2, hD = bD / 2;

            // 1. Bottom Floor
            _create3DFace(objComp, "Bottom", bW, bD, [0, hH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Inner Shade Color", cInner, 0.65);

            // 2. Outer 4 Walls (Mockup Texture on outer walls if layer selected)
            _create3DFace(objComp, "Front", bW, bH, [0, 0, -hD], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 1.0);
            _create3DFace(objComp, "Back", bW, bH, [0, 0, hD], [0, 180, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.7);
            _create3DFace(objComp, "Left", bD, bH, [-hW, 0, 0], [0, -90, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.75);
            _create3DFace(objComp, "Right", bD, bH, [hW, 0, 0], [0, 90, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.85);

            // 3. Inner 4 Walls (for realistic depth when open)
            _create3DFace(objComp, "Inside_Front", bW - 2, bH - 2, [0, 0, -hD + 1], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Inner Shade Color", cInner, 0.55);
            _create3DFace(objComp, "Inside_Back", bW - 2, bH - 2, [0, 0, hD - 1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Inner Shade Color", cInner, 0.5);
            _create3DFace(objComp, "Inside_Left", bD - 2, bH - 2, [-hW + 1, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Inner Shade Color", cInner, 0.45);
            _create3DFace(objComp, "Inside_Right", bD - 2, bH - 2, [hW - 1, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Inner Shade Color", cInner, 0.5);

            // 4. Hinge Nulls for Top Flaps (Split into Front/Back and Left/Right pairs)
            var flapH = bD * 0.48;
            var flapW = bW * 0.48;
            var flapFBExpr = 'var a = 65; try { a = thisComp.layer("' + baseName + '_Controller").effect("Front & Back Flaps")("Angle"); } catch(e) {} -a;';
            var flapLRExpr = 'var a = 65; try { a = thisComp.layer("' + baseName + '_Controller").effect("Left & Right Flaps")("Angle"); } catch(e) {} -a;';

            // Front Flap Hinge Null
            var flapFrontHinge = objComp.layers.addNull();
            flapFrontHinge.name = "Flap_Front_Hinge";
            flapFrontHinge.threeDLayer = true;
            flapFrontHinge.parent = controller;
            flapFrontHinge.position.setValue([0, -hH, -hD]);
            flapFrontHinge.orientation.setValue([0, 0, 0]);
            _setXRotationExpr(flapFrontHinge, flapFBExpr);
            _create3DFace(objComp, "Flap_Front", bW, flapH, [0, 0, 0], [0, 0, 0], flapFrontHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 1.1, [bW / 2, flapH]);

            // Back Flap Hinge Null
            var flapBackHinge = objComp.layers.addNull();
            flapBackHinge.name = "Flap_Back_Hinge";
            flapBackHinge.threeDLayer = true;
            flapBackHinge.parent = controller;
            flapBackHinge.position.setValue([0, -hH, hD]);
            flapBackHinge.orientation.setValue([0, 180, 0]);
            _setXRotationExpr(flapBackHinge, flapFBExpr);
            _create3DFace(objComp, "Flap_Back", bW, flapH, [0, 0, 0], [0, 0, 0], flapBackHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.8, [bW / 2, flapH]);

            // Left Flap Hinge Null
            var flapLeftHinge = objComp.layers.addNull();
            flapLeftHinge.name = "Flap_Left_Hinge";
            flapLeftHinge.threeDLayer = true;
            flapLeftHinge.parent = controller;
            flapLeftHinge.position.setValue([-hW, -hH, 0]);
            flapLeftHinge.orientation.setValue([0, -90, 0]);
            _setXRotationExpr(flapLeftHinge, flapLRExpr);
            _create3DFace(objComp, "Flap_Left", bD, flapW, [0, 0, 0], [0, 0, 0], flapLeftHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.85, [bD / 2, flapW]);

            // Right Flap Hinge Null
            var flapRightHinge = objComp.layers.addNull();
            flapRightHinge.name = "Flap_Right_Hinge";
            flapRightHinge.threeDLayer = true;
            flapRightHinge.parent = controller;
            flapRightHinge.position.setValue([hW, -hH, 0]);
            flapRightHinge.orientation.setValue([0, 90, 0]);
            _setXRotationExpr(flapRightHinge, flapLRExpr);
            _create3DFace(objComp, "Flap_Right", bD, flapW, [0, 0, 0], [0, 0, 0], flapRightHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Outer Box Color", cOuter, 0.95, [bD / 2, flapW]);
        }
        else if (type === "CABINET") {
            var cWood = [0.42, 0.28, 0.18, 1.0];
            var cDoor = [0.55, 0.38, 0.24, 1.0];
            var cMetal = [0.86, 0.76, 0.45, 1.0];
            var cShelf = [0.46, 0.31, 0.19, 1.0];
            colorControlsList = [
                { name: "Wood Body Color", val: cWood },
                { name: "Door Color", val: cDoor },
                { name: "Handles & Feet Color", val: cMetal },
                { name: "Interior Shelf Color", val: cShelf }
            ];
            angleControlsList.push({ name: "Left Door Hinge Y", val: 0 });
            angleControlsList.push({ name: "Right Door Hinge Y", val: 0 });

            var cW = 560, cH = 840, cD = 360;
            var hcW = cW / 2, hcH = cH / 2, hcD = cD / 2;

            // Outer Cabinet Box
            _create3DFace(objComp, "Back_Wall", cW, cH, [0, 0, hcD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wood Body Color", cWood, 0.7);
            _create3DFace(objComp, "Left_Side", cD, cH, [-hcW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wood Body Color", cWood, 0.8);
            _create3DFace(objComp, "Right_Side", cD, cH, [hcW, 0, 0], [0, 270, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wood Body Color", cWood, 0.9);
            _create3DFace(objComp, "Top_Roof", cW, cD, [0, -hcH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wood Body Color", cWood, 1.1);
            _create3DFace(objComp, "Bottom_Floor", cW, cD, [0, hcH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wood Body Color", cWood, 0.6);
            _create3DFace(objComp, "Middle_Shelf", cW - 12, cD - 12, [0, 0, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Interior Shelf Color", cShelf, 0.95);

            // Door Hinges & Doors
            var dW = cW / 2 - 6;
            var dH = cH - 16;

            // Left Door Hinge Null (pivots along the left frame edge)
            var leftDoorHinge = objComp.layers.addNull();
            leftDoorHinge.name = "Left_Door_Hinge";
            leftDoorHinge.threeDLayer = true;
            leftDoorHinge.parent = controller;
            leftDoorHinge.position.setValue([-hcW + 3, 0, -hcD - 3]);
            leftDoorHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(leftDoorHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Left Door Hinge Y")("Angle"); } catch(e) {} -a;');

            _create3DFace(objComp, "Left_Door", dW, dH, [0, 0, 0], [0, 0, 0], leftDoorHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Color", cDoor, 1.05, [0, dH / 2]);
            _create3DFace(objComp, "Left_Handle", 8, 80, [dW - 18, 0, -6], [0, 0, 0], leftDoorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handles & Feet Color", cMetal, 1.0);

            // Right Door Hinge Null (pivots along the right frame edge)
            var rightDoorHinge = objComp.layers.addNull();
            rightDoorHinge.name = "Right_Door_Hinge";
            rightDoorHinge.threeDLayer = true;
            rightDoorHinge.parent = controller;
            rightDoorHinge.position.setValue([hcW - 3, 0, -hcD - 3]);
            rightDoorHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(rightDoorHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Right Door Hinge Y")("Angle"); } catch(e) {} a;');

            _create3DFace(objComp, "Right_Door", dW, dH, [0, 0, 0], [0, 0, 0], rightDoorHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Color", cDoor, 1.0, [dW, dH / 2]);
            _create3DFace(objComp, "Right_Handle", 8, 80, [-dW + 18, 0, -6], [0, 0, 0], rightDoorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handles & Feet Color", cMetal, 1.0);

            // 4 Cabinet Feet
            var legSize = 36, legH = 50;
            var legPos = [
                [-hcW + 30, hcH + legH / 2, -hcD + 30],
                [hcW - 30, hcH + legH / 2, -hcD + 30],
                [-hcW + 30, hcH + legH / 2, hcD - 30],
                [hcW - 30, hcH + legH / 2, hcD - 30]
            ];
            for (var f = 0; f < 4; f++) {
                _create3DFace(objComp, "Foot_" + (f + 1), legSize, legH, legPos[f], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handles & Feet Color", cMetal, 0.7);
            }
        }
        else if (type === "TABLE") {
            var cTop = [0.55, 0.38, 0.24, 1.0];
            var cLegs = [0.20, 0.21, 0.24, 1.0];
            var cTrim = [0.46, 0.31, 0.19, 1.0];
            colorControlsList = [
                { name: "Tabletop Wood Color", val: cTop },
                { name: "Legs Metal Color", val: cLegs },
                { name: "Edge Trim Color", val: cTrim }
            ];

            var tW = 860, tD = 560, tThick = 32, lH = 460, lW = 40;
            var htW = tW / 2, htD = tD / 2, htThick = tThick / 2;

            // Tabletop Slab (Mockup on top surface)
            _create3DFace(objComp, "Top_Surface", tW, tD, [0, -htThick, 0], [-90, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Tabletop Wood Color", cTop, 1.15);
            _create3DFace(objComp, "Bottom_Surface", tW, tD, [0, htThick, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Tabletop Wood Color", cTop, 0.6);
            _create3DFace(objComp, "Front_Edge", tW, tThick, [0, 0, -htD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cTrim, 1.0);
            _create3DFace(objComp, "Back_Edge", tW, tThick, [0, 0, htD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cTrim, 0.75);
            _create3DFace(objComp, "Left_Edge", tD, tThick, [-htW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cTrim, 0.85);
            _create3DFace(objComp, "Right_Edge", tD, tThick, [htW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cTrim, 0.9);

            // 4 Sturdy 3D Pillar Legs
            var legCoords = [
                [-htW + 45, htThick + lH / 2, -htD + 45],
                [htW - 45, htThick + lH / 2, -htD + 45],
                [-htW + 45, htThick + lH / 2, htD - 45],
                [htW - 45, htThick + lH / 2, htD - 45]
            ];
            for (var l = 0; l < 4; l++) {
                var lp = legCoords[l];
                _create3DFace(objComp, "Leg_" + (l + 1) + "_F", lW, lH, [lp[0], lp[1], lp[2] - lW / 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Legs Metal Color", cLegs, 1.0);
                _create3DFace(objComp, "Leg_" + (l + 1) + "_B", lW, lH, [lp[0], lp[1], lp[2] + lW / 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Legs Metal Color", cLegs, 0.7);
                _create3DFace(objComp, "Leg_" + (l + 1) + "_L", lW, lH, [lp[0] - lW / 2, lp[1], lp[2]], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Legs Metal Color", cLegs, 0.8);
                _create3DFace(objComp, "Leg_" + (l + 1) + "_R", lW, lH, [lp[0] + lW / 2, lp[1], lp[2]], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Legs Metal Color", cLegs, 0.9);
            }
        }
        else if (type === "PHONE") {
            var cBody = [0.15, 0.16, 0.18, 1.0];
            var cFrame = [0.45, 0.47, 0.5, 1.0];
            var cBump = [0.12, 0.13, 0.15, 1.0];
            var cRing = [0.72, 0.74, 0.78, 1.0];
            var cBezel = [0.02, 0.02, 0.02, 1.0];
            colorControlsList = [
                { name: "Phone Body Color", val: cBody },
                { name: "Metal Frame Color", val: cFrame },
                { name: "Camera Bump Color", val: cBump },
                { name: "Lens Ring Color", val: cRing },
                { name: "Bezel & Island Color", val: cBezel }
            ];

            var pW = 460, pH = 940, pD = 26;
            var hpW = pW / 2, hpH = pH / 2, hpD = pD / 2;

            // FRONT SCREEN (Mockup texture maps here!)
            _create3DFace(objComp, "Screen_Display", pW - 20, pH - 20, [0, 0, -hpD - 1], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 0.05);

            // Dynamic Island Pill
            _create3DFace(objComp, "Dynamic_Island", 110, 26, [0, -hpH + 42, -hpD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            // Front Screen Border Bezel
            _create3DFace(objComp, "Front_Bezel", pW, pH, [0, 0, -hpD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            // BACK COVER (Orientation 180° so back faces backwards)
            _create3DFace(objComp, "Back_Cover", pW, pH, [0, 0, hpD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Phone Body Color", cBody, 1.0);

            // PRO CAMERA ISLAND (Accurately positioned in top corner of back cover)
            var camPlateW = 145, camPlateH = 150;
            var camX = -hpW + 85;
            var camY = -hpH + 90;
            var camZ = hpD + 4;

            _create3DFace(objComp, "Camera_Island", camPlateW, camPlateH, [camX, camY, camZ], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Camera Bump Color", cBump, 1.0);

            // 3 Pro Camera Lenses
            _create3DFace(objComp, "Lens_Top_Rim", 46, 46, [camX - 25, camY - 26, camZ + 4], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Ring Color", cRing, 1.0);
            _create3DFace(objComp, "Lens_Top_Glass", 36, 36, [camX - 25, camY - 26, camZ + 5], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            _create3DFace(objComp, "Lens_Bottom_Rim", 46, 46, [camX - 25, camY + 28, camZ + 4], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Ring Color", cRing, 1.0);
            _create3DFace(objComp, "Lens_Bottom_Glass", 36, 36, [camX - 25, camY + 28, camZ + 5], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            _create3DFace(objComp, "Lens_Right_Rim", 42, 42, [camX + 32, camY, camZ + 4], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Ring Color", cRing, 1.0);
            _create3DFace(objComp, "Lens_Right_Glass", 32, 32, [camX + 32, camY, camZ + 5], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            // Flash & LiDAR
            _create3DFace(objComp, "Flash_Light", 18, 18, [camX + 32, camY - 36, camZ + 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Ring Color", cRing, 1.4);
            _create3DFace(objComp, "LiDAR_Sensor", 14, 14, [camX + 32, camY + 36, camZ + 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Bezel & Island Color", cBezel, 1.0);

            // Side Frame Edges & Physical Buttons
            _create3DFace(objComp, "Frame_Left", pD, pH, [-hpW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.85);
            _create3DFace(objComp, "Vol_Up_Btn", 5, 55, [-hpW - 3, -110, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.2);
            _create3DFace(objComp, "Vol_Down_Btn", 5, 55, [-hpW - 3, -40, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.2);
            _create3DFace(objComp, "Action_Btn", 5, 30, [-hpW - 3, -180, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.3);

            _create3DFace(objComp, "Frame_Right", pD, pH, [hpW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.95);
            _create3DFace(objComp, "Power_Btn", 5, 80, [hpW + 3, -80, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.2);

            _create3DFace(objComp, "Frame_Top", pW, pD, [0, -hpH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.1);
            _create3DFace(objComp, "Frame_Bottom", pW, pD, [0, hpH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.7);
        }
        else if (type === "LAPTOP") {
            var cAlum = [0.34, 0.36, 0.39, 1.0];
            var cKb = [0.08, 0.08, 0.10, 1.0];
            var cPad = [0.28, 0.30, 0.33, 1.0];
            var cBezelLap = [0.02, 0.02, 0.02, 1.0];
            colorControlsList = [
                { name: "Aluminum Body Color", val: cAlum },
                { name: "Keyboard Color", val: cKb },
                { name: "Trackpad Color", val: cPad },
                { name: "Screen Bezel Color", val: cBezelLap }
            ];
            angleControlsList.push({ name: "Screen Hinge X", val: 30 });

            var lW = 820, lD = 540, bH = 18, sH = 540, sD = 10;
            var hlW = lW / 2, hlD = lD / 2, hbH = bH / 2, hsH = sH / 2, hsD = sD / 2;

            // BASE UNIT (Keyboard in the BACK, Trackpad in the FRONT)
            var baseY = 80;
            var topY = baseY - hbH;

            // Base Top surface (facing UP)
            _create3DFace(objComp, "Base_Top", lW, lD, [0, topY, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 1.05);

            // Recessed Keyboard Well (Rear half: Z > 0, towards hinge)
            var kwW = 680;
            var kwD = 230;
            var kwZ = 95;
            _create3DFace(objComp, "Keyboard_Well", kwW, kwD, [0, topY - 0.5, kwZ], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 0.45);

            // STYLIZED "LAZY KEYS" (Essential distinct keys with high rendering performance)
            var kY = topY - 1.5;

            // Row 1: Function Row (Z = 188)
            _create3DFace(objComp, "Keys_Function_Row", 650, 16, [0, kY, 188], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.05);

            // Row 2: Numbers & Backspace (Z = 160)
            _create3DFace(objComp, "Keys_Numbers", 555, 22, [-45, kY, 160], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.1);
            _create3DFace(objComp, "Key_Backspace", 85, 22, [282, kY, 160], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);

            // Row 3: Tab, QWERTY, Brackets (Z = 130)
            _create3DFace(objComp, "Key_Tab", 75, 22, [-287, kY, 130], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);
            _create3DFace(objComp, "Keys_QWERTY", 475, 22, [-7, kY, 130], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.1);
            _create3DFace(objComp, "Keys_Right_Brackets", 85, 22, [282, kY, 130], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.1);

            // Row 4: CapsLock, ASDF, ENTER KEY (Z = 100)
            _create3DFace(objComp, "Key_CapsLock", 85, 22, [-282, kY, 100], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);
            _create3DFace(objComp, "Keys_ASDF", 450, 22, [-10, kY, 100], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.1);
            _create3DFace(objComp, "Key_Enter", 100, 22, [275, kY, 100], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.25);

            // Row 5: LEFT SHIFT, ZXCV, RIGHT SHIFT (Z = 70)
            _create3DFace(objComp, "Key_LeftShift", 110, 22, [-270, kY, 70], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.2);
            _create3DFace(objComp, "Keys_ZXCV", 405, 22, [-7, kY, 70], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.1);
            _create3DFace(objComp, "Key_RightShift", 120, 22, [265, kY, 70], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.2);

            // Row 6: MODIFIERS, SPACEBAR, ARROWS (Z = 40)
            _create3DFace(objComp, "Keys_Left_Modifiers", 155, 22, [-247, kY, 40], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);
            _create3DFace(objComp, "Key_Spacebar", 280, 22, [-20, kY, 40], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.25);
            _create3DFace(objComp, "Keys_Right_Modifiers", 70, 22, [165, kY, 40], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);
            _create3DFace(objComp, "Keys_Arrows", 80, 22, [285, kY, 40], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Keyboard Color", cKb, 1.15);

            // PRECISE PROPORTIONED GLASS TRACKPAD (Centered in palm rest: Z < 0)
            var tpW = 290;
            var tpD = 180;
            var tpZ = -140;
            _create3DFace(objComp, "Trackpad", tpW, tpD, [0, topY - 0.8, tpZ], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Trackpad Color", cPad, 1.0);

            // Base Bottom & Sides
            _create3DFace(objComp, "Base_Bottom", lW, lD, [0, baseY + hbH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.65);
            _create3DFace(objComp, "Base_Front", lW, bH, [0, baseY, -hlD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 1.0);
            _create3DFace(objComp, "Base_Back", lW, bH, [0, baseY, hlD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.7);
            _create3DFace(objComp, "Base_Left", lD, bH, [-hlW, baseY, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.85);
            _create3DFace(objComp, "Base_Right", lD, bH, [hlW, baseY, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.95);

            // SCREEN HINGE NULL (Located at the BACK edge of the base: +hlD)
            var lidNull = objComp.layers.addNull();
            lidNull.name = "Screen_Hinge";
            lidNull.threeDLayer = true;
            lidNull.motionBlur = true;
            lidNull.inPoint = 0;
            lidNull.outPoint = targetDuration;
            lidNull.parent = controller;
            lidNull.position.setValue([0, baseY - hbH, hlD - 2]);
            lidNull.orientation.setValue([0, 0, 0]);
            _setXRotationExpr(lidNull, 'var a = 30; try { a = thisComp.layer("' + baseName + '_Controller").effect("Screen Hinge X")("Angle"); } catch(e) {} -a;');

            // Screen Display (Mockup texture maps to the display!)
            _create3DFace(objComp, "Screen_Display", lW - 32, sH - 32, [0, -hsH, -hsD - 1], [0, 0, 0], lidNull, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezelLap, 0.05);
            _create3DFace(objComp, "Screen_Bezel", lW, sH, [0, -hsH, -hsD], [0, 0, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezelLap, 1.0);
            _create3DFace(objComp, "Screen_Webcam", 8, 8, [0, -sH + 14, -hsD - 2], [0, 0, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezelLap, 0.4);
            _create3DFace(objComp, "Screen_Back_Lid", lW, sH, [0, -hsH, hsD], [0, 180, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 1.0);
            _create3DFace(objComp, "Logo_Plate", 44, 44, [0, -hsH, hsD + 1], [0, 180, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 1.4);
            _create3DFace(objComp, "Screen_Top_Edge", lW, sD, [0, -sH, 0], [-90, 0, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 1.15);
            _create3DFace(objComp, "Screen_Left_Edge", sD, sH, [-hlW, -hsH, 0], [0, -90, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.85);
            _create3DFace(objComp, "Screen_Right_Edge", sD, sH, [hlW, -hsH, 0], [0, 90, 0], lidNull, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cAlum, 0.95);
        }
        else if (type === "ROOM") {
            var cFloor = [0.58, 0.42, 0.28, 1.0];
            var cWall = [0.91, 0.90, 0.88, 1.0];
            var cCeiling = [0.96, 0.96, 0.97, 1.0];
            var cBase = [0.42, 0.28, 0.18, 1.0];
            colorControlsList = [
                { name: "Floor Color", val: cFloor },
                { name: "Wall Color", val: cWall },
                { name: "Ceiling Color", val: cCeiling },
                { name: "Baseboard Color", val: cBase }
            ];

            var rW = 1000, rH = 800, rD = 1000;
            var hrW = rW / 2, hrH = rH / 2, hrD = rD / 2;

            // 1. Floor (Bottom - facing UP)
            _create3DFace(objComp, "Floor", rW, rD, [0, hrH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Floor Color", cFloor, 1.0);

            // 2. Ceiling (Top - facing DOWN)
            _create3DFace(objComp, "Ceiling", rW, rD, [0, -hrH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Ceiling Color", cCeiling, 0.95);

            // 3. Back Wall (Facing Front/Camera - Mockup backdrop texture)
            _create3DFace(objComp, "Back_Wall", rW, rH, [0, 0, hrD], [0, 180, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wall Color", cWall, 1.0);

            // 4. Left Wall (Facing INWARD RIGHT)
            _create3DFace(objComp, "Left_Wall", rD, rH, [-hrW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wall Color", cWall, 0.85);

            // 5. Right Wall (Facing INWARD LEFT)
            _create3DFace(objComp, "Right_Wall", rD, rH, [hrW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Wall Color", cWall, 0.9);

            // 6. Baseboards along bottom edges of the 3 walls
            _create3DFace(objComp, "Back_Baseboard", rW, 36, [0, hrH - 18, hrD - 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Baseboard Color", cBase, 0.5);
            _create3DFace(objComp, "Left_Baseboard", rD, 36, [-hrW + 2, hrH - 18, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Baseboard Color", cBase, 0.5);
            _create3DFace(objComp, "Right_Baseboard", rD, 36, [hrW - 2, hrH - 18, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Baseboard Color", cBase, 0.5);
        }
        else if (type === "CRT") {
            var cBody = [0.24, 0.25, 0.27, 1.0];
            var cBezel = [0.12, 0.13, 0.14, 1.0];
            var cKnob = [0.84, 0.86, 0.90, 1.0];
            var cAccent = [0.86, 0.35, 0.25, 1.0];
            colorControlsList = [
                { name: "TV Body Color", val: cBody },
                { name: "Screen Bezel Color", val: cBezel },
                { name: "Knobs & Trim Color", val: cKnob },
                { name: "Power Button Color", val: cAccent }
            ];

            var tW = 640, tH = 580, tD = 440;
            var htW = tW / 2, htH = tH / 2, htD = tD / 2;

            // ================= 1. CENTERED TOP SCREEN (ROUNDED CRT SCREEN ONLY) =================
            var sW = 540, sH = 360;
            var sY = -htH + 24 + sH / 2; // -86px (centered in upper region)

            // Recessed CRT Curved Glass & Bezel (Texture mockup maps here with rounded corners!)
            _create3DFace(objComp, "Screen_Glass", sW - 36, sH - 36, [0, sY, -htD - 3], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05, null, 40);
            _create3DFace(objComp, "Screen_Bezel", sW, sH, [0, sY, -htD - 1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0, null, 48);

            // ================= 2. BOTTOM CONTROL BAR (UNDERNEATH SCREEN) =================
            var pW = 540, pH = 120;
            var pY = sY + sH / 2 + 16 + pH / 2; // 170px (under screen)

            // Recessed Control Panel Base
            _create3DFace(objComp, "Control_Panel_Base", pW, pH, [0, pY, -htD - 1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.7);

            // Left Section: Dark Speaker Grille Slits
            for (var g = 0; g < 4; g++) {
                _create3DFace(objComp, "Speaker_Grille_" + (g + 1), 150, 8, [-165, pY - 30 + g * 20, -htD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.15);
            }

            // Center Section: Retro Badge & Power Switch
            _create3DFace(objComp, "Brand_Badge", 60, 16, [0, pY - 24, -htD - 3], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 1.1);
            _create3DFace(objComp, "Power_Button", 30, 30, [0, pY + 20, -htD - 4], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Power Button Color", cAccent, 1.0);
            _create3DFace(objComp, "Power_LED", 8, 8, [28, pY + 20, -htD - 5], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Power Button Color", cAccent, 1.6);

            // Right Section: Dual Classic Circular Tuning Knobs (VHF & UHF Channel)
            _create3DFace(objComp, "Tuning_Knob_1", 48, 48, [130, pY, -htD - 6], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 1.05, null, 24);
            _create3DFace(objComp, "Tuning_Knob_2", 48, 48, [205, pY, -htD - 6], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 1.05, null, 24);

            // ================= 3. RETRO TV CABINET BODY =================
            _create3DFace(objComp, "Front_Face", tW, tH, [0, 0, -htD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 1.0);
            _create3DFace(objComp, "Back_Cover", tW, tH, [0, 0, htD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.7);
            _create3DFace(objComp, "Top_Cover", tW, tD, [0, -htH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 1.1);
            _create3DFace(objComp, "Bottom_Floor", tW, tD, [0, htH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.65);
            _create3DFace(objComp, "Left_Side", tD, tH, [-htW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.85);
            _create3DFace(objComp, "Right_Side", tD, tH, [htW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.95);

            // Retro Rear CRT Tube Housing (Closed volumetric bump)
            var bkW = 380, bkH = 300, bkD = 80;
            var hbkD = bkD / 2;
            _create3DFace(objComp, "Rear_Tube_Back", bkW, bkH, [0, -20, htD + bkD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.55);
            _create3DFace(objComp, "Rear_Tube_Top", bkW, bkD, [0, -20 - bkH / 2, htD + hbkD], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.65);
            _create3DFace(objComp, "Rear_Tube_Bottom", bkW, bkD, [0, -20 + bkH / 2, htD + hbkD], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.45);
            _create3DFace(objComp, "Rear_Tube_Left", bkD, bkH, [-bkW / 2, -20, htD + hbkD], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.5);
            _create3DFace(objComp, "Rear_Tube_Right", bkD, bkH, [bkW / 2, -20, htD + hbkD], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "TV Body Color", cBody, 0.6);

            // 4 Angled Retro Feet
            var legW = 32, legH = 26;
            _create3DFace(objComp, "Foot_Front_Left", legW, legH, [-htW + 50, htH + legH / 2, -htD + 40], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 0.7);
            _create3DFace(objComp, "Foot_Front_Right", legW, legH, [htW - 50, htH + legH / 2, -htD + 40], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 0.7);
            _create3DFace(objComp, "Foot_Back_Left", legW, legH, [-htW + 50, htH + legH / 2, htD - 40], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 0.6);
            _create3DFace(objComp, "Foot_Back_Right", legW, legH, [htW - 50, htH + legH / 2, htD - 40], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 0.6);

            // Telescopic Antennas
            _create3DFace(objComp, "Antenna_Left", 6, 220, [-90, -htH - 95, 0], [0, 0, -28], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 1.15);
            _create3DFace(objComp, "Antenna_Right", 6, 220, [90, -htH - 95, 0], [0, 0, 28], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Knobs & Trim Color", cKnob, 1.15);
        }
        else if (type === "ZFLIP") {
            var cBody = [0.18, 0.20, 0.24, 1.0];
            var cFrame = [0.55, 0.58, 0.62, 1.0];
            var cBezel = [0.02, 0.02, 0.02, 1.0];
            var cCover = [0.10, 0.11, 0.13, 1.0];
            colorControlsList = [
                { name: "Chassis Color", val: cBody },
                { name: "Metal Frame Color", val: cFrame },
                { name: "Screen Bezel Color", val: cBezel },
                { name: "Cover Screen Color", val: cCover }
            ];
            angleControlsList.push({ name: "Fold Angle X", val: 0 });

            var fW = 440, hH = 450, fD = 22;
            var hfW = fW / 2, hhH = hH / 2, hfD = fD / 2;

            // Lower Base Unit
            _create3DFace(objComp, "Base_Back_Cover", fW, hH, [0, hhH, hfD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Color", cBody, 1.0);
            _create3DFace(objComp, "Base_Inner_Display", fW - 20, hH - 12, [0, hhH, -hfD - 1], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05);
            _create3DFace(objComp, "Base_Bezel", fW, hH, [0, hhH, -hfD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Base_Bottom_Frame", fW, fD, [0, hH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.7);
            _create3DFace(objComp, "Base_Left_Frame", fD, hH, [-hfW, hhH, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.85);
            _create3DFace(objComp, "Base_Right_Frame", fD, hH, [hfW, hhH, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.95);

            // Middle Horizontal Hinge
            var flipHinge = objComp.layers.addNull();
            flipHinge.name = "Flip_Hinge";
            flipHinge.threeDLayer = true;
            flipHinge.parent = controller;
            flipHinge.position.setValue([0, 0, -hfD]);
            flipHinge.orientation.setValue([0, 0, 0]);
            _setXRotationExpr(flipHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Fold Angle X")("Angle"); } catch(e) {} -a;');

            // Upper Flip Unit (parented to flipHinge)
            _create3DFace(objComp, "Upper_Inner_Display", fW - 20, hH - 12, [0, -hhH, -1], [0, 0, 0], flipHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05);
            _create3DFace(objComp, "Upper_Bezel", fW, hH, [0, -hhH, 0], [0, 0, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Upper_Back_Cover", fW, hH, [0, -hhH, fD], [0, 180, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Color", cBody, 1.0);
            _create3DFace(objComp, "Cover_Display", fW * 0.84, hH * 0.60, [0, -hhH - 35, fD + 2], [0, 180, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Cover Screen Color", cCover, 1.1);
            _create3DFace(objComp, "Upper_Top_Frame", fW, fD, [0, -hH, hfD], [-90, 0, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.1);
            _create3DFace(objComp, "Upper_Left_Frame", fD, hH, [-hfW, -hhH, hfD], [0, -90, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.85);
            _create3DFace(objComp, "Upper_Right_Frame", fD, hH, [hfW, -hhH, hfD], [0, 90, 0], flipHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.95);
        }
        else if (type === "ZFOLD") {
            var cBody = [0.16, 0.17, 0.20, 1.0];
            var cFrame = [0.65, 0.68, 0.72, 1.0];
            var cBezel = [0.02, 0.02, 0.02, 1.0];
            var cCover = [0.06, 0.07, 0.08, 1.0];
            colorControlsList = [
                { name: "Chassis Color", val: cBody },
                { name: "Metal Frame Color", val: cFrame },
                { name: "Screen Bezel Color", val: cBezel },
                { name: "Cover Screen Color", val: cCover }
            ];
            angleControlsList.push({ name: "Fold Angle Y", val: 0 });

            var hW = 420, fH = 920, fD = 22;
            var hhW = hW / 2, hfH = fH / 2, hfD = fD / 2;

            // Right Half Unit (Base)
            _create3DFace(objComp, "Right_Back_Cover", hW, fH, [hhW, 0, hfD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Color", cBody, 1.0);
            _create3DFace(objComp, "Right_Inner_Display", hW - 14, fH - 24, [hhW, 0, -hfD - 1], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05);
            _create3DFace(objComp, "Right_Bezel", hW, fH, [hhW, 0, -hfD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Cover_Display", hW - 40, fH - 50, [hhW, 0, hfD + 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Cover Screen Color", cCover, 1.1);
            _create3DFace(objComp, "Right_Top_Frame", hW, fD, [hhW, -hfH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.1);
            _create3DFace(objComp, "Right_Bottom_Frame", hW, fD, [hhW, hfH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.7);
            _create3DFace(objComp, "Right_Outer_Frame", fD, fH, [hW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.95);

            // Vertical Hinge Null
            var foldHinge = objComp.layers.addNull();
            foldHinge.name = "Fold_Hinge";
            foldHinge.threeDLayer = true;
            foldHinge.parent = controller;
            foldHinge.position.setValue([0, 0, -hfD]);
            foldHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(foldHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Fold Angle Y")("Angle"); } catch(e) {} a;');

            // Left Half Unit (parented to foldHinge)
            _create3DFace(objComp, "Left_Inner_Display", hW - 14, fH - 24, [-hhW, 0, -1], [0, 0, 0], foldHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05);
            _create3DFace(objComp, "Left_Bezel", hW, fH, [-hhW, 0, 0], [0, 0, 0], foldHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Left_Back_Cover", hW, fH, [-hhW, 0, fD], [0, 180, 0], foldHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Color", cBody, 1.0);
            _create3DFace(objComp, "Left_Top_Frame", hW, fD, [-hhW, -hfH, hfD], [-90, 0, 0], foldHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.1);
            _create3DFace(objComp, "Left_Bottom_Frame", hW, fD, [-hhW, hfH, hfD], [90, 0, 0], foldHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.7);
            _create3DFace(objComp, "Left_Outer_Frame", fD, fH, [-hW, 0, hfD], [0, -90, 0], foldHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.85);
        }
        else if (type === "BOOK") {
            var cCover = [0.14, 0.22, 0.36, 1.0];
            var cSpine = [0.10, 0.16, 0.26, 1.0];
            var cPages = [0.96, 0.95, 0.92, 1.0];
            var cRibbon = [0.72, 0.12, 0.16, 1.0];
            colorControlsList = [
                { name: "Cover Color", val: cCover },
                { name: "Spine Accent Color", val: cSpine },
                { name: "Pages Paper Color", val: cPages },
                { name: "Ribbon Color", val: cRibbon }
            ];
            angleControlsList.push({ name: "Cover Open Angle", val: 0 });

            var bW = 600, bH = 860, bD = 84;
            var hbW = bW / 2, hbH = bH / 2, hbD = bD / 2;
            var pThick = bD - 10;

            // Back Cover & Spine
            _create3DFace(objComp, "Back_Cover", bW, bH, [0, 0, hbD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Cover Color", cCover, 1.0);
            _create3DFace(objComp, "Spine", bD, bH, [-hbW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Spine Accent Color", cSpine, 1.0);

            // Solid 3D Page Block (Full interior volume under front cover!)
            _create3DFace(objComp, "Pages_First_Page", bW - 24, bH - 24, [10, 0, -hbD + 5], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Pages Paper Color", cPages, 1.0);
            _create3DFace(objComp, "Pages_Right_Edge", pThick, bH - 24, [hbW - 2, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Pages Paper Color", cPages, 0.88);
            _create3DFace(objComp, "Pages_Top_Edge", bW - 24, pThick, [10, -hbH + 12, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Pages Paper Color", cPages, 0.95);
            _create3DFace(objComp, "Pages_Bottom_Edge", bW - 24, pThick, [10, hbH - 12, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Pages Paper Color", cPages, 0.75);

            // Ribbon Bookmark
            _create3DFace(objComp, "Ribbon_Bookmark", 18, bH + 60, [hbW - 40, 25, -hbD + 3], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Ribbon Color", cRibbon, 1.1);

            // Front Cover Hinge
            var bookCoverHinge = objComp.layers.addNull();
            bookCoverHinge.name = "Cover_Hinge";
            bookCoverHinge.threeDLayer = true;
            bookCoverHinge.parent = controller;
            bookCoverHinge.position.setValue([-hbW, 0, -hbD]);
            bookCoverHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(bookCoverHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Cover Open Angle")("Angle"); } catch(e) {} -a;');

            // Front Cover (Outside Artwork / Mockup & Inside Endpaper)
            _create3DFace(objComp, "Front_Cover_Outside", bW, bH, [hbW, 0, -2], [0, 0, 0], bookCoverHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Cover Color", cCover, 1.05);
            _create3DFace(objComp, "Front_Cover_Inside", bW, bH, [hbW, 0, 2], [0, 180, 0], bookCoverHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Cover Color", cCover, 0.92);
        }
        else if (type === "BINDER") {
            var cCover = [0.20, 0.38, 0.34, 1.0];
            var cRings = [0.88, 0.90, 0.92, 1.0];
            var cPaper = [0.98, 0.98, 0.97, 1.0];
            var cBand = [0.12, 0.22, 0.19, 1.0];
            colorControlsList = [
                { name: "Binder Cover Color", val: cCover },
                { name: "Metal Rings Color", val: cRings },
                { name: "Paper Sheets Color", val: cPaper },
                { name: "Elastic Band Color", val: cBand }
            ];
            angleControlsList.push({ name: "Cover Open Angle", val: 0 });

            var bW = 620, bH = 880, bD = 80;
            var hbW = bW / 2, hbH = bH / 2, hbD = bD / 2;
            var paperThick = bD * 0.45;

            // Back Cover & Spine
            _create3DFace(objComp, "Back_Cover", bW, bH, [0, 0, hbD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Binder Cover Color", cCover, 1.0);
            _create3DFace(objComp, "Spine", bD, bH, [-hbW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Binder Cover Color", cCover, 0.85);

            // Paper Sheets Stack (Positioned with safe clearance from spine hinge)
            _create3DFace(objComp, "Paper_Sheet_Top", bW - 56, bH - 36, [20, 0, -hbD + 18], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Paper Sheets Color", cPaper, 1.0);
            _create3DFace(objComp, "Paper_Right_Edge", paperThick, bH - 36, [hbW - 8, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Paper Sheets Color", cPaper, 0.88);
            _create3DFace(objComp, "Paper_Top_Edge", bW - 56, paperThick, [20, -hbH + 18, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Paper Sheets Color", cPaper, 0.95);
            _create3DFace(objComp, "Paper_Bottom_Edge", bW - 56, paperThick, [20, hbH - 18, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Paper Sheets Color", cPaper, 0.75);

            // 6 Metallic Binder Rings
            for (var r = 0; r < 6; r++) {
                var ringY = -hbH + 110 + r * 130;
                _create3DFace(objComp, "Binder_Ring_" + (r + 1), 32, 14, [-hbW + 36, ringY, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Rings Color", cRings, 1.25);
            }

            // Front Cover Hinge (Pivoting cleanly along the spine crease)
            var binderCoverHinge = objComp.layers.addNull();
            binderCoverHinge.name = "Cover_Hinge";
            binderCoverHinge.threeDLayer = true;
            binderCoverHinge.parent = controller;
            binderCoverHinge.position.setValue([-hbW, 0, -hbD]);
            binderCoverHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(binderCoverHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Cover Open Angle")("Angle"); } catch(e) {} -a;');

            // Front Cover (Outside & Inside)
            _create3DFace(objComp, "Front_Cover_Outside", bW, bH, [hbW, 0, -2], [0, 0, 0], binderCoverHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Binder Cover Color", cCover, 1.05);
            _create3DFace(objComp, "Front_Cover_Inside", bW, bH, [hbW, 0, 2], [0, 180, 0], binderCoverHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Binder Cover Color", cCover, 0.9);
            _create3DFace(objComp, "Elastic_Band", 26, bH, [bW - 60, 0, -4], [0, 0, 0], binderCoverHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Elastic Band Color", cBand, 1.15);
        }
        else if (type === "TABLET") {
            var cBody = [0.28, 0.30, 0.33, 1.0];
            var cFrame = [0.45, 0.47, 0.50, 1.0];
            var cBezel = [0.02, 0.02, 0.02, 1.0];
            var cLens = [0.75, 0.77, 0.80, 1.0];
            colorControlsList = [
                { name: "Aluminum Body Color", val: cBody },
                { name: "Screen Bezel Color", val: cBezel },
                { name: "Metal Frame Color", val: cFrame },
                { name: "Camera Ring Color", val: cLens }
            ];

            var tW = 760, tH = 1040, tD = 18;
            var htW = tW / 2, htH = tH / 2, htD = tD / 2;

            // Screen Display (Mockup texture maps here!)
            _create3DFace(objComp, "Screen_Display", tW - 28, tH - 28, [0, 0, -htD - 1], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.05);
            _create3DFace(objComp, "Front_Bezel", tW, tH, [0, 0, -htD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Front_Camera", 8, 8, [0, -htH + 10, -htD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 0.5);

            // Back Cover
            _create3DFace(objComp, "Back_Cover", tW, tH, [0, 0, htD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Aluminum Body Color", cBody, 1.0);
            _create3DFace(objComp, "Logo_Plate", 56, 56, [0, 0, htD + 1], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.4);

            // Pro Dual-Camera Module on Back (Top Corner)
            var camX = -htW + 62, camY = -htH + 62, camZ = htD + 3;
            _create3DFace(objComp, "Camera_Plate", 84, 88, [camX, camY, camZ], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.05);
            _create3DFace(objComp, "Lens_Main_Rim", 38, 38, [camX - 16, camY - 16, camZ + 3], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Camera Ring Color", cLens, 1.2);
            _create3DFace(objComp, "Lens_Main_Glass", 28, 28, [camX - 16, camY - 16, camZ + 4], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Lens_Ultra_Rim", 38, 38, [camX - 16, camY + 16, camZ + 3], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Camera Ring Color", cLens, 1.2);
            _create3DFace(objComp, "Lens_Ultra_Glass", 28, 28, [camX - 16, camY + 16, camZ + 4], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);
            _create3DFace(objComp, "Flash_Unit", 16, 16, [camX + 20, camY - 14, camZ + 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Camera Ring Color", cLens, 1.5);
            _create3DFace(objComp, "Mic_Hole", 8, 8, [camX + 20, camY + 14, camZ + 2], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cBezel, 1.0);

            // Aluminum Frame Edges & Stylus Magnetic Strip
            _create3DFace(objComp, "Frame_Top", tW, tD, [0, -htH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.1);
            _create3DFace(objComp, "Frame_Bottom", tW, tD, [0, htH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.7);
            _create3DFace(objComp, "Frame_Left", tD, tH, [-htW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.85);
            _create3DFace(objComp, "Frame_Right", tD, tH, [htW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 0.95);
            _create3DFace(objComp, "Stylus_Strip", 12, 340, [htW + 2, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame Color", cFrame, 1.3);
        }
        else if (type === "GLASSES") {
            var cFrame = [0.10, 0.10, 0.12, 1.0];
            var cAccent = [0.38, 0.22, 0.12, 1.0];
            var cLens = [0.12, 0.14, 0.18, 0.55];
            var cMetal = [0.85, 0.74, 0.42, 1.0];
            colorControlsList = [
                { name: "Primary Frame Color", val: cFrame },
                { name: "Browline Accent Color", val: cAccent },
                { name: "Lens Tint Color", val: cLens },
                { name: "Metal Accents Color", val: cMetal }
            ];
            angleControlsList.push({ name: "Left Temple Angle", val: 0 });
            angleControlsList.push({ name: "Right Temple Angle", val: 0 });

            var gW = 680, gH = 200, gL = 540;

            // Front Frame Bridge & Rims (XY Plane, facing front)
            _create3DFace(objComp, "Nose_Bridge_Metal", 64, 14, [0, -6, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Accents Color", cMetal, 1.0);
            _create3DFace(objComp, "Nose_Pad_Left", 12, 22, [-34, 18, 14], [0, -25, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Accents Color", cMetal, 0.9);
            _create3DFace(objComp, "Nose_Pad_Right", 12, 22, [34, 18, 14], [0, 25, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Accents Color", cMetal, 0.9);

            _create3DFace(objComp, "Left_Lens_Rim", 260, 180, [-160, 0, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Primary Frame Color", cFrame, 1.0);
            _create3DFace(objComp, "Left_Browline_Bar", 264, 30, [-160, -78, -1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Browline Accent Color", cAccent, 1.1);
            _create3DFace(objComp, "Left_Lens_Glass", 235, 155, [-160, 0, 1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Tint Color", cLens, 1.0);
            _create3DFace(objComp, "Left_Hinge_Pin", 14, 14, [-305, -78, -2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Accents Color", cMetal, 1.3);

            _create3DFace(objComp, "Right_Lens_Rim", 260, 180, [160, 0, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Primary Frame Color", cFrame, 1.0);
            _create3DFace(objComp, "Right_Browline_Bar", 264, 30, [160, -78, -1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Browline Accent Color", cAccent, 1.1);
            _create3DFace(objComp, "Right_Lens_Glass", 235, 155, [160, 0, 1], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Lens Tint Color", cLens, 1.0);
            _create3DFace(objComp, "Right_Hinge_Pin", 14, 14, [305, -78, -2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Accents Color", cMetal, 1.3);

            // Left Temple Hinge & Arm (Seamlessly connected to frame end-piece at X = -320)
            var leftTempleHinge = objComp.layers.addNull();
            leftTempleHinge.name = "Left_Temple_Hinge";
            leftTempleHinge.threeDLayer = true;
            leftTempleHinge.parent = controller;
            leftTempleHinge.position.setValue([-310, -78, 0]);
            leftTempleHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(leftTempleHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Left Temple Angle")("Angle"); } catch(e) {} a;');
            _create3DFace(objComp, "Left_Temple_Arm", gL, 20, [0, 0, gL / 2], [0, -90, 0], leftTempleHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Primary Frame Color", cFrame, 0.95);
            _create3DFace(objComp, "Left_Ear_Sock", 140, 24, [0, 0, gL - 70], [0, -90, 0], leftTempleHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Browline Accent Color", cAccent, 1.05);

            // Right Temple Hinge & Arm (Seamlessly connected to frame end-piece at X = 320)
            var rightTempleHinge = objComp.layers.addNull();
            rightTempleHinge.name = "Right_Temple_Hinge";
            rightTempleHinge.threeDLayer = true;
            rightTempleHinge.parent = controller;
            rightTempleHinge.position.setValue([310, -78, 0]);
            rightTempleHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(rightTempleHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Right Temple Angle")("Angle"); } catch(e) {} -a;');
            _create3DFace(objComp, "Right_Temple_Arm", gL, 20, [0, 0, gL / 2], [0, 90, 0], rightTempleHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Primary Frame Color", cFrame, 0.95);
            _create3DFace(objComp, "Right_Ear_Sock", 140, 24, [0, 0, gL - 70], [0, 90, 0], rightTempleHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Browline Accent Color", cAccent, 1.05);
        }
        else if (type === "WINDOW") {
            var cFrame = [0.42, 0.28, 0.18, 1.0];
            var cSash = [0.55, 0.38, 0.24, 1.0];
            var cMullion = [0.46, 0.31, 0.19, 1.0];
            var cSill = [0.50, 0.35, 0.22, 1.0];
            var cMetal = [0.86, 0.76, 0.45, 1.0];
            var cGlass = [0.65, 0.82, 0.92, 0.28];
            colorControlsList = [
                { name: "Frame Trim Color", val: cFrame },
                { name: "Sash Wood Color", val: cSash },
                { name: "Mullion Trim Color", val: cMullion },
                { name: "Window Sill Color", val: cSill },
                { name: "Handle Metal Color", val: cMetal },
                { name: "Glass Tint Color", val: cGlass }
            ];
            angleControlsList.push({ name: "Left Pane Angle", val: 0 });
            angleControlsList.push({ name: "Right Pane Angle", val: 0 });

            var wW = 760, wH = 920;
            var hwW = wW / 2, hwH = wH / 2;

            // ================= 1. OUTER ARCHITRAVE CASING (ZERO GAPS) =================
            // Top Header Architrave (spans full width 820)
            _create3DFace(objComp, "Architrave_Top", wW + 60, 30, [0, -hwH - 15, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 1.05);
            // Left & Right Side Architraves (flushed from header down to sill)
            _create3DFace(objComp, "Architrave_Left", 30, wH + 15, [-hwW - 15, 7.5, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 0.9);
            _create3DFace(objComp, "Architrave_Right", 30, wH + 15, [hwW + 15, 7.5, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 0.95);

            // ================= 2. ARCHITECTURAL 3D WINDOW SILL SLAB =================
            var sillW = wW + 80;
            _create3DFace(objComp, "Sill_Top", sillW, 44, [0, hwH + 8, -12], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Window Sill Color", cSill, 1.15);
            _create3DFace(objComp, "Sill_Front", sillW, 24, [0, hwH + 20, -34], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Window Sill Color", cSill, 1.0);
            _create3DFace(objComp, "Sill_Bottom", sillW, 44, [0, hwH + 32, -12], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Window Sill Color", cSill, 0.7);
            _create3DFace(objComp, "Sill_Left_Cap", 44, 24, [-sillW / 2, hwH + 20, -12], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Window Sill Color", cSill, 0.85);
            _create3DFace(objComp, "Sill_Right_Cap", 44, 24, [sillW / 2, hwH + 20, -12], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Window Sill Color", cSill, 0.95);

            var sW = wW / 2; // 380px each sash
            var sH = wH;     // 920px height
            var hsW = sW / 2; // 190px center of sash
            var railThick = 32;
            var sashD = 18;
            var innerH = sH - railThick * 2; // 856px

            // ================= 3. LEFT CASEMENT SASH =================
            var leftPaneHinge = objComp.layers.addNull();
            leftPaneHinge.name = "Left_Pane_Hinge";
            leftPaneHinge.threeDLayer = true;
            leftPaneHinge.parent = controller;
            leftPaneHinge.position.setValue([-hwW, 0, 0]);
            leftPaneHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(leftPaneHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Left Pane Angle")("Angle"); } catch(e) {} -a;');

            // A. Crystal Clear Glass Pane (with texture support)
            _create3DFace(objComp, "Left_Glass", sW - 20, sH - 20, [hsW, 0, 0], [0, 0, 0], leftPaneHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Glass Tint Color", cGlass, 1.0);

            // B. Front Wooden Perimeter Frame
            _create3DFace(objComp, "Left_Front_Top_Rail", sW, railThick, [hsW, -hwH + railThick / 2, -sashD / 2], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.05);
            _create3DFace(objComp, "Left_Front_Bottom_Rail", sW, railThick, [hsW, hwH - railThick / 2, -sashD / 2], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);
            _create3DFace(objComp, "Left_Front_Hinge_Stile", railThick, innerH, [railThick / 2, 0, -sashD / 2], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.95);
            _create3DFace(objComp, "Left_Front_Meeting_Stile", railThick, innerH, [sW - railThick / 2, 0, -sashD / 2], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.0);

            // C. Back Wooden Perimeter Frame
            _create3DFace(objComp, "Left_Back_Top_Rail", sW, railThick, [hsW, -hwH + railThick / 2, sashD / 2], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);
            _create3DFace(objComp, "Left_Back_Bottom_Rail", sW, railThick, [hsW, hwH - railThick / 2, sashD / 2], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.7);
            _create3DFace(objComp, "Left_Back_Hinge_Stile", railThick, innerH, [railThick / 2, 0, sashD / 2], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.9);
            _create3DFace(objComp, "Left_Back_Meeting_Stile", railThick, innerH, [sW - railThick / 2, 0, sashD / 2], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);

            // D. 3D Outer Edges of Sash
            _create3DFace(objComp, "Left_Sash_Meeting_Edge", sashD, sH, [sW, 0, 0], [0, 90, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.95);
            _create3DFace(objComp, "Left_Sash_Top_Edge", sW, sashD, [hsW, -hwH, 0], [-90, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.1);
            _create3DFace(objComp, "Left_Sash_Bottom_Edge", sW, sashD, [hsW, hwH, 0], [90, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.65);

            // E. French Window Cross Mullions on Glass
            _create3DFace(objComp, "Left_Mullion_H", sW - railThick * 2, 12, [hsW, 0, -sashD / 2 - 1], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Mullion Trim Color", cMullion, 0.92);
            _create3DFace(objComp, "Left_Mullion_V", 12, innerH, [hsW, 0, -sashD / 2 - 1], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Mullion Trim Color", cMullion, 0.92);

            // F. Brass Casement Fastener & Lever
            _create3DFace(objComp, "Left_Handle_Plate_Front", 16, 64, [sW - railThick / 2, 0, -sashD / 2 - 2], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.2);
            _create3DFace(objComp, "Left_Handle_Lever_Front", 32, 10, [sW - railThick / 2 + 8, -8, -sashD / 2 - 6], [0, 0, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.4);
            _create3DFace(objComp, "Left_Handle_Plate_Back", 16, 64, [sW - railThick / 2, 0, sashD / 2 + 2], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.2);
            _create3DFace(objComp, "Left_Handle_Lever_Back", 32, 10, [sW - railThick / 2 + 8, -8, sashD / 2 + 6], [0, 180, 0], leftPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.4);

            // ================= 4. RIGHT CASEMENT SASH =================
            var rightPaneHinge = objComp.layers.addNull();
            rightPaneHinge.name = "Right_Pane_Hinge";
            rightPaneHinge.threeDLayer = true;
            rightPaneHinge.parent = controller;
            rightPaneHinge.position.setValue([hwW, 0, 0]);
            rightPaneHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(rightPaneHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Right Pane Angle")("Angle"); } catch(e) {} a;');

            // A. Crystal Clear Glass Pane (with texture support)
            _create3DFace(objComp, "Right_Glass", sW - 20, sH - 20, [-hsW, 0, 0], [0, 0, 0], rightPaneHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Glass Tint Color", cGlass, 1.0);

            // B. Front Wooden Perimeter Frame
            _create3DFace(objComp, "Right_Front_Top_Rail", sW, railThick, [-hsW, -hwH + railThick / 2, -sashD / 2], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.05);
            _create3DFace(objComp, "Right_Front_Bottom_Rail", sW, railThick, [-hsW, hwH - railThick / 2, -sashD / 2], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);
            _create3DFace(objComp, "Right_Front_Hinge_Stile", railThick, innerH, [-railThick / 2, 0, -sashD / 2], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.95);
            _create3DFace(objComp, "Right_Front_Meeting_Stile", railThick, innerH, [-sW + railThick / 2, 0, -sashD / 2], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.0);

            // C. Back Wooden Perimeter Frame
            _create3DFace(objComp, "Right_Back_Top_Rail", sW, railThick, [-hsW, -hwH + railThick / 2, sashD / 2], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);
            _create3DFace(objComp, "Right_Back_Bottom_Rail", sW, railThick, [-hsW, hwH - railThick / 2, sashD / 2], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.7);
            _create3DFace(objComp, "Right_Back_Hinge_Stile", railThick, innerH, [-railThick / 2, 0, sashD / 2], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.9);
            _create3DFace(objComp, "Right_Back_Meeting_Stile", railThick, innerH, [-sW + railThick / 2, 0, sashD / 2], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.85);

            // D. 3D Outer Edges of Sash
            _create3DFace(objComp, "Right_Sash_Meeting_Edge", sashD, sH, [-sW, 0, 0], [0, -90, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.95);
            _create3DFace(objComp, "Right_Sash_Top_Edge", sW, sashD, [-hsW, -hwH, 0], [-90, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 1.1);
            _create3DFace(objComp, "Right_Sash_Bottom_Edge", sW, sashD, [-hsW, hwH, 0], [90, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Sash Wood Color", cSash, 0.65);

            // E. French Window Cross Mullions on Glass
            _create3DFace(objComp, "Right_Mullion_H", sW - railThick * 2, 12, [-hsW, 0, -sashD / 2 - 1], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Mullion Trim Color", cMullion, 0.92);
            _create3DFace(objComp, "Right_Mullion_V", 12, innerH, [-hsW, 0, -sashD / 2 - 1], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Mullion Trim Color", cMullion, 0.92);

            // F. Brass Casement Fastener & Lever
            _create3DFace(objComp, "Right_Handle_Plate_Front", 16, 64, [-sW + railThick / 2, 0, -sashD / 2 - 2], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.2);
            _create3DFace(objComp, "Right_Handle_Lever_Front", 32, 10, [-sW + railThick / 2 - 8, -8, -sashD / 2 - 6], [0, 0, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.4);
            _create3DFace(objComp, "Right_Handle_Plate_Back", 16, 64, [-sW + railThick / 2, 0, sashD / 2 + 2], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.2);
            _create3DFace(objComp, "Right_Handle_Lever_Back", 32, 10, [-sW + railThick / 2 - 8, -8, sashD / 2 + 6], [0, 180, 0], rightPaneHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cMetal, 1.4);
        }
        else if (type === "DOOR") {
            var cDoor = [0.55, 0.38, 0.24, 1.0];
            var cFrame = [0.42, 0.28, 0.18, 1.0];
            var cHandle = [0.86, 0.76, 0.45, 1.0];
            var cPanel = [0.46, 0.31, 0.19, 1.0];
            colorControlsList = [
                { name: "Door Wood Color", val: cDoor },
                { name: "Frame Trim Color", val: cFrame },
                { name: "Handle Metal Color", val: cHandle },
                { name: "Panels Inset Color", val: cPanel }
            ];
            angleControlsList.push({ name: "Door Open Angle", val: 0 });

            var dW = 560, dH = 1080, dD = 36;
            var hdW = dW / 2, hdH = dH / 2, hdD = dD / 2;

            // Outer Architrave Casing (Front-facing frame surrounding door)
            _create3DFace(objComp, "Architrave_Top", dW + 60, 30, [0, -hdH - 15, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 1.05);
            _create3DFace(objComp, "Architrave_Left", 30, dH, [-hdW - 15, 0, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 0.9);
            _create3DFace(objComp, "Architrave_Right", 30, dH, [hdW + 15, 0, 0], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Frame Trim Color", cFrame, 0.95);

            // Door Leaf Hinge Null
            var doorHinge = objComp.layers.addNull();
            doorHinge.name = "Door_Hinge";
            doorHinge.threeDLayer = true;
            doorHinge.parent = controller;
            doorHinge.position.setValue([-hdW + 4, 0, 0]);
            doorHinge.orientation.setValue([0, 0, 0]);
            _setYRotationExpr(doorHinge, 'var a = 0; try { a = thisComp.layer("' + baseName + '_Controller").effect("Door Open Angle")("Angle"); } catch(e) {} -a;');

            // Door Leaf Front & Back (parented to doorHinge)
            _create3DFace(objComp, "Door_Front", dW, dH, [hdW, 0, -hdD], [0, 0, 0], doorHinge, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Wood Color", cDoor, 1.05);
            _create3DFace(objComp, "Door_Back", dW, dH, [hdW, 0, hdD], [0, 180, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Wood Color", cDoor, 0.85);
            _create3DFace(objComp, "Door_Outer_Edge", dD, dH, [dW, 0, 0], [0, 90, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Wood Color", cDoor, 0.95);
            _create3DFace(objComp, "Door_Top_Edge", dW, dD, [hdW, -hdH, 0], [-90, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Door Wood Color", cDoor, 1.1);

            // 4 Decorative Inset Panels on Front
            var panW = dW * 0.36, panH = dH * 0.36;
            _create3DFace(objComp, "Panel_Top_Left", panW, panH, [hdW - panW / 2 - 18, -hdH + panH / 2 + 40, -hdD - 1], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Panels Inset Color", cPanel, 0.92);
            _create3DFace(objComp, "Panel_Top_Right", panW, panH, [hdW + panW / 2 + 18, -hdH + panH / 2 + 40, -hdD - 1], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Panels Inset Color", cPanel, 0.92);
            _create3DFace(objComp, "Panel_Bottom_Left", panW, panH, [hdW - panW / 2 - 18, hdH - panH / 2 - 40, -hdD - 1], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Panels Inset Color", cPanel, 0.92);
            _create3DFace(objComp, "Panel_Bottom_Right", panW, panH, [hdW + panW / 2 + 18, hdH - panH / 2 - 40, -hdD - 1], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Panels Inset Color", cPanel, 0.92);

            // Brass Door Lever & Plate on Front & Back
            _create3DFace(objComp, "Escutcheon_Plate_Front", 22, 90, [dW - 48, 10, -hdD - 2], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cHandle, 1.2);
            _create3DFace(objComp, "Handle_Lever_Front", 44, 12, [dW - 34, -14, -hdD - 6], [0, 0, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cHandle, 1.4);
            _create3DFace(objComp, "Escutcheon_Plate_Back", 22, 90, [dW - 48, 10, hdD + 2], [0, 180, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cHandle, 1.2);
            _create3DFace(objComp, "Handle_Lever_Back", 44, 12, [dW - 34, -14, hdD + 6], [0, 180, 0], doorHinge, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Handle Metal Color", cHandle, 1.4);
        }
        else if (type === "DESK") {
            var cTop = [0.55, 0.38, 0.24, 1.0];
            var cFrame = [0.20, 0.21, 0.24, 1.0];
            var cEdge = [0.46, 0.31, 0.19, 1.0];
            var cAccent = [0.86, 0.76, 0.45, 1.0];
            colorControlsList = [
                { name: "Desk Top Color", val: cTop },
                { name: "Metal Frame & Legs Color", val: cFrame },
                { name: "Edge Trim Color", val: cEdge },
                { name: "Grommet & Hardware Color", val: cAccent }
            ];

            var dW = 1100, dD = 580, dThick = 34, lH = 520;
            var hdW = dW / 2, hdD = dD / 2, hdThick = dThick / 2;

            // Thick Tabletop Slab (Mockup on top surface!)
            _create3DFace(objComp, "Desk_Top_Surface", dW, dD, [0, -hdThick, 0], [-90, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Desk Top Color", cTop, 1.15);
            _create3DFace(objComp, "Desk_Bottom_Surface", dW, dD, [0, hdThick, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Desk Top Color", cTop, 0.6);
            _create3DFace(objComp, "Desk_Front_Edge", dW, dThick, [0, 0, -hdD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cEdge, 1.0);
            _create3DFace(objComp, "Desk_Back_Edge", dW, dThick, [0, 0, hdD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cEdge, 0.75);
            _create3DFace(objComp, "Desk_Left_Edge", dD, dThick, [-hdW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cEdge, 0.85);
            _create3DFace(objComp, "Desk_Right_Edge", dD, dThick, [hdW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Edge Trim Color", cEdge, 0.95);

            // Dual Cable Pass-Through Grommets
            _create3DFace(objComp, "Grommet_Left", 38, 38, [-hdW + 120, -hdThick - 1, hdD - 70], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Grommet & Hardware Color", cAccent, 1.2);
            _create3DFace(objComp, "Grommet_Right", 38, 38, [hdW - 120, -hdThick - 1, hdD - 70], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Grommet & Hardware Color", cAccent, 1.2);

            // Sturdy Steel T-Leg Trestles (Left & Right)
            var legW = 48;
            _create3DFace(objComp, "Left_Leg_Front", legW, lH, [-hdW + 80, hdThick + lH / 2, -hdD + 80], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame & Legs Color", cFrame, 1.0);
            _create3DFace(objComp, "Left_Leg_Back", legW, lH, [-hdW + 80, hdThick + lH / 2, hdD - 80], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame & Legs Color", cFrame, 1.0);
            _create3DFace(objComp, "Right_Leg_Front", legW, lH, [hdW - 80, hdThick + lH / 2, -hdD + 80], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame & Legs Color", cFrame, 1.0);
            _create3DFace(objComp, "Right_Leg_Back", legW, lH, [hdW - 80, hdThick + lH / 2, hdD - 80], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame & Legs Color", cFrame, 1.0);

            // Rear Structural Modesty Panel
            _create3DFace(objComp, "Modesty_Panel", dW - 200, 220, [0, hdThick + 120, hdD - 70], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Metal Frame & Legs Color", cFrame, 0.85);
        }
        else if (type === "MONITOR") {
            var cScreen = [0.02, 0.02, 0.02, 1.0];
            var cStand = [0.78, 0.80, 0.84, 1.0];
            var cChassis = [0.18, 0.20, 0.23, 1.0];
            colorControlsList = [
                { name: "Screen Bezel Color", val: cScreen },
                { name: "Stand Aluminum Color", val: cStand },
                { name: "Chassis Rear Color", val: cChassis }
            ];

            var mW = 940, mH = 540, mD = 18;
            var hmW = mW / 2, hmH = mH / 2, hmD = mD / 2;

            // Display Screen (Mockup texture maps here!)
            _create3DFace(objComp, "Screen_Display", mW - 24, mH - 24, [0, 0, -hmD - 1], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cScreen, 0.05);
            _create3DFace(objComp, "Front_Bezel", mW, mH, [0, 0, -hmD], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Screen Bezel Color", cScreen, 1.0);
            _create3DFace(objComp, "Power_LED", 8, 8, [hmW - 30, hmH - 8, -hmD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Stand Aluminum Color", cStand, 1.5);

            // Back Enclosure
            _create3DFace(objComp, "Back_Cover", mW, mH, [0, 0, hmD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 1.0);
            _create3DFace(objComp, "Logo_Plate", 56, 56, [0, 0, hmD + 1], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Stand Aluminum Color", cStand, 1.4);

            // 4 Frame Edges
            _create3DFace(objComp, "Frame_Top", mW, mD, [0, -hmH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 1.1);
            _create3DFace(objComp, "Frame_Bottom", mW, mD, [0, hmH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 0.7);
            _create3DFace(objComp, "Frame_Left", mD, mH, [-hmW, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 0.85);
            _create3DFace(objComp, "Frame_Right", mD, mH, [hmW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 0.95);

            // Ergonomic Aluminum Stand (Arm + Base Plate)
            _create3DFace(objComp, "Stand_Arm", 70, 380, [0, hmH - 60, hmD + 40], [15, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Stand Aluminum Color", cStand, 1.0);
            _create3DFace(objComp, "Cable_Pass_Hole", 36, 36, [0, hmH + 40, hmD + 50], [15, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Rear Color", cChassis, 0.5);
            _create3DFace(objComp, "Desktop_Base_Plate", 340, 240, [0, hmH + 110, hmD + 10], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Stand Aluminum Color", cStand, 1.1);
        }
        else if (type === "PC") {
            var cChassis = [0.12, 0.13, 0.15, 1.0];
            var cGlass = [0.15, 0.18, 0.22, 0.40];
            var cRGB = [0.0, 0.85, 1.0, 1.0];
            var cHardware = [0.25, 0.27, 0.30, 1.0];
            colorControlsList = [
                { name: "Chassis Case Color", val: cChassis },
                { name: "Tempered Glass Tint", val: cGlass },
                { name: "RGB Neon Accent Color", val: cRGB },
                { name: "Interior Hardware Color", val: cHardware }
            ];

            var pW = 320, pH = 740, pD = 620;
            var hpW = pW / 2, hpH = pH / 2, hpD = pD / 2;

            // Front Mesh Panel & I/O
            _create3DFace(objComp, "Front_Panel", pW, pH, [0, 0, -hpD], [0, 0, 0], controller, layerSourceItem, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 1.0);
            _create3DFace(objComp, "Front_RGB_Strip_Left", 10, pH - 60, [-hpW + 30, 0, -hpD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "RGB Neon Accent Color", cRGB, 1.5);
            _create3DFace(objComp, "Front_RGB_Strip_Right", 10, pH - 60, [hpW - 30, 0, -hpD - 2], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "RGB Neon Accent Color", cRGB, 1.5);
            _create3DFace(objComp, "Power_Button", 22, 22, [0, -hpH + 40, -hpD - 3], [0, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "RGB Neon Accent Color", cRGB, 1.4);

            // Left Side Tempered Glass Panel (Semi-transparent!)
            _create3DFace(objComp, "Tempered_Glass_Panel", pD - 20, pH - 20, [-hpW - 1, 0, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Tempered Glass Tint", cGlass, 1.0);

            // Interior Components (GPU, Motherboard, RAM, Liquid Cooler)
            _create3DFace(objComp, "GPU_Graphics_Card", 340, 70, [-hpW + 70, 30, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Interior Hardware Color", cHardware, 1.2);
            _create3DFace(objComp, "RAM_Sticks_RGB", 60, 24, [-hpW + 70, -110, 40], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "RGB Neon Accent Color", cRGB, 1.5);
            _create3DFace(objComp, "CPU_Liquid_Cooler", 70, 70, [-hpW + 70, -90, -40], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "RGB Neon Accent Color", cRGB, 1.4);
            _create3DFace(objComp, "PSU_Shroud_Basement", pD - 20, 140, [-hpW + 70, hpH - 80, 0], [0, -90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 0.7);

            // Solid Steel Exterior Chassis (Top, Bottom, Right, Back)
            _create3DFace(objComp, "Right_Steel_Panel", pD, pH, [hpW, 0, 0], [0, 90, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 0.95);
            _create3DFace(objComp, "Top_Exhaust_Panel", pW, pD, [0, -hpH, 0], [-90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 1.1);
            _create3DFace(objComp, "Bottom_Chassis", pW, pD, [0, hpH, 0], [90, 0, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 0.65);
            _create3DFace(objComp, "Back_IO_Panel", pW, pH, [0, 0, hpD], [0, 180, 0], controller, null, targetStartTime, targetInPoint, targetDuration, mCompName, precompName, "Chassis Case Color", cChassis, 0.75);
        }

        // 1. Populate controls inside objComp (for 100% duplicate-safe internal linking)
        for (var c = 0; c < colorControlsList.length; c++) {
            _addCtrlColor(colorCtrlLayer, colorControlsList[c].name, colorControlsList[c].val);
        }
        for (var k = 0; k < angleControlsList.length; k++) {
            _addCtrlAngle(controller, angleControlsList[k].name, angleControlsList[k].val);
        }

        // 2. Move all Null controllers to the very top of the layer stack
        colorCtrlLayer.moveToBeginning();
        controller.moveToBeginning();

        // 3. Add precomp to active main composition
        var precompLayer = comp.layers.add(objComp);
        precompLayer.startTime = targetInPoint;
        precompLayer.inPoint = targetInPoint;
        precompLayer.outPoint = targetOutPoint;
        precompLayer.threeDLayer = true;
        try { precompLayer.collapseTransformation = true; } catch (e) {}
        precompLayer.motionBlur = true;
        comp.motionBlur = true;
        precompLayer.position.setValue([compW / 2, compH / 2, 0]);
        precompLayer.label = 11;

        // Outer precomp layer remains 100% clean with NO effect controls (all controls reside on internal Nulls)

        if (selLayer) {
            try {
                if (selLayer.containingComp) {
                    selLayer.remove();
                }
            } catch (e) {}
        }

        app.endUndoGroup();
        return '{"success":true,"message":"3D ' + baseName + ' created successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"3D Generation error: ' + e.toString().replace(/"/g, '\\"') + '"}';
    }
}

function _GEN_MC_3D() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select an active composition first!"}';
    }

    var selLayer = comp.selectedLayers.length > 0 ? comp.selectedLayers[0] : null;
    if (!selLayer || !selLayer.source || !(selLayer.source instanceof FootageItem || selLayer.source instanceof CompItem)) {
        return '{"error":true,"type":"warn","message":"Please select a Minecraft skin image layer first!"}';
    }

    var layerSourceItem = selLayer.source;
    app.beginUndoGroup("Generate 3D Minecraft Character");

    try {
        var targetInPoint = selLayer.inPoint;
        var targetOutPoint = selLayer.outPoint;
        var targetStartTime = selLayer.startTime;
        var targetDuration = Math.max(targetOutPoint - targetInPoint, comp.frameDuration);

        var compW = comp.width;
        var compH = comp.height;

        // Find unique precomp name
        var precompName = "MC_Character_Comp";
        var count = 1;
        while (true) {
            var found = false;
            for (var j = 1; j <= app.project.numItems; j++) {
                if (app.project.item(j) instanceof CompItem && app.project.item(j).name === precompName) {
                    found = true;
                    break;
                }
            }
            if (!found) break;
            count++;
            precompName = "MC_Character_Comp " + count;
        }

        var objComp = app.project.items.addComp(
            precompName,
            compW,
            compH,
            comp.pixelAspect,
            targetDuration,
            comp.frameRate
        );
        objComp.motionBlur = true;

        // Master Controller Null (Root)
        var masterCtrl = objComp.layers.addNull();
        masterCtrl.name = "MC_Character_Controller";
        masterCtrl.label = 1;
        masterCtrl.threeDLayer = true;
        masterCtrl.motionBlur = true;
        masterCtrl.inPoint = 0;
        masterCtrl.outPoint = targetDuration;
        masterCtrl.position.setValue([compW / 2, compH / 2, 0]);
        masterCtrl.scale.setValue([100, 100, 100]);

        // Character scale factor: 1 Minecraft unit = 25 pixels
        var S = 25;
        var tw = layerSourceItem.width || 64;
        var th = layerSourceItem.height || 64;
        var unit = tw / 64.0;
        var is64x64 = (th >= tw);

        function _createMCFace(name, u, v, w, h, localPos, localOri, parent, expandScale) {
            var x1 = u * unit;
            var y1 = v * unit;
            var x2 = (u + w) * unit;
            var y2 = (v + h) * unit;

            var faceLayer = objComp.layers.add(layerSourceItem);
            faceLayer.name = name;
            faceLayer.startTime = targetStartTime - targetInPoint;
            faceLayer.inPoint = 0;
            faceLayer.outPoint = targetDuration;
            faceLayer.threeDLayer = true;
            faceLayer.motionBlur = true;
            faceLayer.label = 5;
            try { faceLayer.quality = LayerQuality.DRAFT; } catch (e) {}

            var maskGroup = faceLayer.property("ADBE Mask Parade") || faceLayer.property("Masks");
            if (maskGroup) {
                var newMask = maskGroup.addProperty("ADBE Mask Atom");
                newMask.maskMode = MaskMode.ADD;
                var maskShape = newMask.property("ADBE Mask Shape");
                var myShape = maskShape.value;
                myShape.vertices = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
                myShape.closed = true;
                maskShape.setValue(myShape);
            }

            var centerX = (x1 + x2) / 2;
            var centerY = (y1 + y2) / 2;
            faceLayer.anchorPoint.setValue([centerX, centerY, 0]);

            var exp = (typeof expandScale === "number") ? expandScale : 1.0;
            var scaleVal = (S / unit) * 100 * exp;
            faceLayer.scale.setValue([scaleVal, scaleVal, 100]);

            faceLayer.parent = parent;
            faceLayer.position.setValue(localPos);
            faceLayer.orientation.setValue(localOri);

            return faceLayer;
        }

        function _createMCBox(boxName, u, v, bw, bh, bd, parent, offsetPos, expandScale) {
            var offX = offsetPos ? offsetPos[0] : 0;
            var offY = offsetPos ? offsetPos[1] : 0;
            var offZ = offsetPos ? offsetPos[2] : 0;

            var exp = (typeof expandScale === "number") ? expandScale : 1.0;
            var w = bw * S * exp;
            var h = bh * S * exp;
            var d = bd * S * exp;

            var hw = w / 2;
            var hh = h / 2;
            var hd = d / 2;

            _createMCFace(boxName + "_Top", u + bd, v, bw, bd, [offX, offY - hh, offZ], [-90, 0, 0], parent, exp);
            _createMCFace(boxName + "_Bottom", u + bd + bw, v, bw, bd, [offX, offY + hh, offZ], [90, 0, 0], parent, exp);
            _createMCFace(boxName + "_Right", u, v + bd, bd, bh, [offX - hw, offY, offZ], [0, -90, 0], parent, exp);
            _createMCFace(boxName + "_Front", u + bd, v + bd, bw, bh, [offX, offY, offZ - hd], [0, 0, 0], parent, exp);
            _createMCFace(boxName + "_Left", u + bd + bw, v + bd, bd, bh, [offX + hw, offY, offZ], [0, 90, 0], parent, exp);
            _createMCFace(boxName + "_Back", u + bd + bw + bd, v + bd, bw, bh, [offX, offY, offZ + hd], [0, 180, 0], parent, exp);
        }

        // ================= 1. TORSO (BODY) =================
        var torsoNull = objComp.layers.addNull();
        torsoNull.name = "Torso_Controller";
        torsoNull.threeDLayer = true;
        torsoNull.motionBlur = true;
        torsoNull.label = 9;
        torsoNull.parent = masterCtrl;
        torsoNull.position.setValue([0, 0, 0]);
        torsoNull.orientation.setValue([0, 0, 0]);

        _createMCBox("Torso", 16, 16, 8, 12, 4, torsoNull, [0, 0, 0], 1.0);
        if (is64x64) {
            _createMCBox("Jacket_Overlay", 16, 32, 8, 12, 4, torsoNull, [0, 0, 0], 1.06);
        }

        // ================= 2. HEAD =================
        var headHinge = objComp.layers.addNull();
        headHinge.name = "Head_Hinge";
        headHinge.threeDLayer = true;
        headHinge.motionBlur = true;
        headHinge.label = 9;
        headHinge.parent = torsoNull;
        headHinge.position.setValue([0, -6 * S, 0]);
        headHinge.orientation.setValue([0, 0, 0]);

        _setXRotationExpr(headHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Head Rotate X")("Angle"); } catch(e) {} a;');
        _setYRotationExpr(headHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Head Rotate Y")("Angle"); } catch(e) {} a;');
        _setZRotationExpr(headHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Head Rotate Z")("Angle"); } catch(e) {} a;');

        _createMCBox("Head", 0, 0, 8, 8, 8, headHinge, [0, -4 * S, 0], 1.0);
        _createMCBox("Hat_Overlay", 32, 0, 8, 8, 8, headHinge, [0, -4 * S, 0], 1.08);

        // ================= 3. RIGHT ARM =================
        var rArmHinge = objComp.layers.addNull();
        rArmHinge.name = "Right_Arm_Hinge";
        rArmHinge.threeDLayer = true;
        rArmHinge.motionBlur = true;
        rArmHinge.label = 9;
        rArmHinge.parent = torsoNull;
        rArmHinge.position.setValue([-6 * S, -5 * S, 0]);
        rArmHinge.orientation.setValue([0, 0, 0]);

        _setXRotationExpr(rArmHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Right Arm Swing X")("Angle"); } catch(e) {} a;');
        _setZRotationExpr(rArmHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Right Arm Spread Z")("Angle"); } catch(e) {} a;');

        _createMCBox("Right_Arm", 40, 16, 4, 12, 4, rArmHinge, [0, 6 * S, 0], 1.0);
        if (is64x64) {
            _createMCBox("Right_Sleeve_Overlay", 40, 32, 4, 12, 4, rArmHinge, [0, 6 * S, 0], 1.06);
        }

        // ================= 4. LEFT ARM =================
        var lArmHinge = objComp.layers.addNull();
        lArmHinge.name = "Left_Arm_Hinge";
        lArmHinge.threeDLayer = true;
        lArmHinge.motionBlur = true;
        lArmHinge.label = 9;
        lArmHinge.parent = torsoNull;
        lArmHinge.position.setValue([6 * S, -5 * S, 0]);
        lArmHinge.orientation.setValue([0, 0, 0]);

        _setXRotationExpr(lArmHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Left Arm Swing X")("Angle"); } catch(e) {} a;');
        _setZRotationExpr(lArmHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Left Arm Spread Z")("Angle"); } catch(e) {} a;');

        var lArmU = is64x64 ? 32 : 40;
        var lArmV = is64x64 ? 48 : 16;
        _createMCBox("Left_Arm", lArmU, lArmV, 4, 12, 4, lArmHinge, [0, 6 * S, 0], 1.0);
        if (is64x64) {
            _createMCBox("Left_Sleeve_Overlay", 48, 48, 4, 12, 4, lArmHinge, [0, 6 * S, 0], 1.06);
        }

        // ================= 5. RIGHT LEG =================
        var rLegHinge = objComp.layers.addNull();
        rLegHinge.name = "Right_Leg_Hinge";
        rLegHinge.threeDLayer = true;
        rLegHinge.motionBlur = true;
        rLegHinge.label = 9;
        rLegHinge.parent = torsoNull;
        rLegHinge.position.setValue([-2 * S, 6 * S, 0]);
        rLegHinge.orientation.setValue([0, 0, 0]);

        _setXRotationExpr(rLegHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Right Leg Swing X")("Angle"); } catch(e) {} a;');
        _setZRotationExpr(rLegHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Right Leg Spread Z")("Angle"); } catch(e) {} a;');

        _createMCBox("Right_Leg", 0, 16, 4, 12, 4, rLegHinge, [0, 6 * S, 0], 1.0);
        if (is64x64) {
            _createMCBox("Right_Pants_Overlay", 0, 32, 4, 12, 4, rLegHinge, [0, 6 * S, 0], 1.06);
        }

        // ================= 6. LEFT LEG =================
        var lLegHinge = objComp.layers.addNull();
        lLegHinge.name = "Left_Leg_Hinge";
        lLegHinge.threeDLayer = true;
        lLegHinge.motionBlur = true;
        lLegHinge.label = 9;
        lLegHinge.parent = torsoNull;
        lLegHinge.position.setValue([2 * S, 6 * S, 0]);
        lLegHinge.orientation.setValue([0, 0, 0]);

        _setXRotationExpr(lLegHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Left Leg Swing X")("Angle"); } catch(e) {} a;');
        _setZRotationExpr(lLegHinge, 'var a = 0; try { a = thisComp.layer("MC_Character_Controller").effect("Left Leg Spread Z")("Angle"); } catch(e) {} a;');

        var lLegU = is64x64 ? 16 : 0;
        var lLegV = is64x64 ? 48 : 16;
        _createMCBox("Left_Leg", lLegU, lLegV, 4, 12, 4, lLegHinge, [0, 6 * S, 0], 1.0);
        if (is64x64) {
            _createMCBox("Left_Pants_Overlay", 0, 48, 4, 12, 4, lLegHinge, [0, 6 * S, 0], 1.06);
        }

        // Angle Controls on internal Master Controller ONLY
        var angleControlsList = [
            { name: "Head Rotate X", val: 0 },
            { name: "Head Rotate Y", val: 0 },
            { name: "Head Rotate Z", val: 0 },
            { name: "Right Arm Swing X", val: 0 },
            { name: "Right Arm Spread Z", val: 0 },
            { name: "Left Arm Swing X", val: 0 },
            { name: "Left Arm Spread Z", val: 0 },
            { name: "Right Leg Swing X", val: 0 },
            { name: "Right Leg Spread Z", val: 0 },
            { name: "Left Leg Swing X", val: 0 },
            { name: "Left Leg Spread Z", val: 0 }
        ];

        for (var k = 0; k < angleControlsList.length; k++) {
            _addCtrlAngle(masterCtrl, angleControlsList[k].name, angleControlsList[k].val);
        }
        masterCtrl.moveToBeginning();

        // Add clean precomp to main composition with NO external effect controls
        var precompLayer = comp.layers.add(objComp);
        precompLayer.startTime = targetInPoint;
        precompLayer.inPoint = targetInPoint;
        precompLayer.outPoint = targetOutPoint;
        precompLayer.threeDLayer = true;
        try { precompLayer.collapseTransformation = true; } catch (e) {}
        precompLayer.motionBlur = true;
        comp.motionBlur = true;
        precompLayer.position.setValue([compW / 2, compH / 2, 0]);
        precompLayer.label = 11;

        if (selLayer) {
            try {
                if (selLayer.containingComp) {
                    selLayer.remove();
                }
            } catch (e) {}
        }

        app.endUndoGroup();
        return '{"success":true,"message":"3D Minecraft Character created successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"MC 3D Generation error: ' + e.toString().replace(/"/g, '\\"') + '"}';
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
        return "true";
    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

tools.BEATMARK = function () { return _addBeatMark(); };

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
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Overlap","type":"warn","message":"Please open a composition first."}';
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) return '{"error":true,"tool":"Overlap","type":"warn","message":"Please select a layer to apply Overlap. The layer must have at least 2 keyframes on Position, Scale, or Rotation."}';
    var layer = selectedLayers[0];

    var transform = layer.property("ADBE Transform Group");
    var propNames = ["ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Rotate X", "ADBE Rotate Y"];
    var hasKeyframes = false;
    for (var pi = 0; pi < propNames.length; pi++) {
        var p = transform.property(propNames[pi]);
        if (p && p.numKeys >= 2) { hasKeyframes = true; break; }
    }
    if (!hasKeyframes) return '{"error":true,"tool":"Overlap","type":"warn","message":"Overlap requires the selected layer to have at least 2 keyframes on Position, Scale, or Rotation."}';

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

function _autoBeatDetect(threshold, channel) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERROR:Please select a composition!";
    
    var selLayers = comp.selectedLayers;
    if (selLayers.length === 0) return "ERROR:Please select an audio layer!";
    
    var audioLayer = selLayers[0];
    if (!audioLayer.hasAudio) return "ERROR:Selected layer has no audio!";

    var thres = parseFloat(threshold) || 15;
    var chanName = channel || "Both Channels";

    app.beginUndoGroup("Auto Beat Detection");
    try {
        var commandId = app.findMenuCommandId("Convert Audio to Keyframes");
        if (commandId === 0) {
            commandId = 2507; 
        }
        
        app.executeCommand(commandId); 
        
        var ampLayer = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (l.name === "Audio Amplitude" && l.selected) {
                ampLayer = l;
                break;
            }
        }

        if (!ampLayer) {
            if (comp.layer(1).name === "Audio Amplitude") ampLayer = comp.layer(1);
        }

        if (!ampLayer) throw new Error("Could not find generated 'Audio Amplitude' layer.");

        var targetEffect = null;
        try {
            targetEffect = ampLayer.effect(chanName) || ampLayer.effect("Both Channels") || ampLayer.effect(3) || ampLayer.effect(1);
        } catch(e) {}

        if (!targetEffect) throw new Error("Could not find Audio Amplitude effect: " + chanName);
        
        var slider = targetEffect.property("Slider") || targetEffect.property(1);

        if (!slider) throw new Error("Could not find Slider property inside Audio Amplitude.");

        var markers = comp.markerProperty;
        var lastMarkTime = -1;
        var minInterval = 0.25; 

        for (var i = 1; i <= slider.numKeys; i++) {
            var val = slider.keyValue(i);
            var time = slider.keyTime(i);

            if (val > thres && (time - lastMarkTime) > minInterval) {
                markers.setValueAtTime(time, new MarkerValue(""));
                lastMarkTime = time;
            }
        }

        ampLayer.remove();
        app.endUndoGroup();
        return "SUCCESS";
    } catch (e) {
        if (app.isInUndoGroup) app.endUndoGroup();
        return "ERROR:" + e.toString();
    }
}

function _changeCompRatio(w, h) {
    var targetComps = [];
    
    var activeComp = app.project.activeItem;
    if (activeComp && activeComp instanceof CompItem) {
        targetComps.push(activeComp);
    }
    
    var selection = app.project.selection;
    if (selection) {
        for (var i = 0; i < selection.length; i++) {
            if (selection[i] instanceof CompItem) {
                var alreadyAdded = false;
                for (var j = 0; j < targetComps.length; j++) {
                    if (targetComps[j].id === selection[i].id) {
                        alreadyAdded = true;
                        break;
                    }
                }
                if (!alreadyAdded) {
                    targetComps.push(selection[i]);
                }
            }
        }
    }
    
    if (targetComps.length === 0) {
        return '{"error":true,"message":"Please select a composition first!"}';
    }
    
    app.beginUndoGroup("Change Composition Ratio");
    try {
        var wVal = parseInt(w, 10);
        var hVal = parseInt(h, 10);
        if (isNaN(wVal) || isNaN(hVal)) {
            throw new Error("Invalid width or height: " + w + "x" + h);
        }
        for (var i = 0; i < targetComps.length; i++) {
            targetComps[i].width = wVal;
            targetComps[i].height = hVal;
        }
        app.endUndoGroup();
        return '{"error":false,"message":"Composition ratio updated to ' + wVal + 'x' + hVal + '."}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"Failed to change ratio: ' + e.toString() + '"}';
    }
}

function _changeCompFPS(newFPS) {
    var targetComps = [];
    
    var activeComp = app.project.activeItem;
    if (activeComp && activeComp instanceof CompItem) {
        targetComps.push(activeComp);
    }
    
    var selection = app.project.selection;
    if (selection) {
        for (var i = 0; i < selection.length; i++) {
            if (selection[i] instanceof CompItem) {
                var alreadyAdded = false;
                for (var j = 0; j < targetComps.length; j++) {
                    if (targetComps[j].id === selection[i].id) {
                        alreadyAdded = true;
                        break;
                    }
                }
                if (!alreadyAdded) {
                    targetComps.push(selection[i]);
                }
            }
        }
    }
    
    if (targetComps.length === 0) {
        return '{"error":true,"message":"Please select a composition first!"}';
    }
    
    app.beginUndoGroup("Change Composition FPS");
    try {
        var fpsVal = parseFloat(newFPS);
        if (isNaN(fpsVal)) {
            throw new Error("Invalid FPS value: " + newFPS);
        }
        for (var i = 0; i < targetComps.length; i++) {
            var targetComp = targetComps[i];
            var oldDuration = targetComp.duration;
            var oldFrameRate = targetComp.frameRate;
            var oldFrameDist = 1.0 / oldFrameRate;
            
            var layersAtEnd = [];
            for (var j = 1; j <= targetComp.numLayers; j++) {
                var layer = targetComp.layer(j);
                if (Math.abs(layer.outPoint - oldDuration) < (oldFrameDist * 1.5)) {
                    layersAtEnd.push(layer);
                }
            }
            
            targetComp.frameRate = fpsVal;
            targetComp.duration = oldDuration;
            
            var newDuration = targetComp.duration;
            for (var k = 0; k < layersAtEnd.length; k++) {
                try {
                    layersAtEnd[k].outPoint = newDuration;
                } catch (e) {
                }
            }
        }
        app.endUndoGroup();
        return '{"error":false,"message":"Composition frame rate updated to ' + fpsVal + ' FPS."}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"Failed to change FPS: ' + e.toString() + '"}';
    }
}

function _GEN_3D_2SPLIT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select an active composition first!"}';
    }
    if (comp.selectedLayers.length === 0) {
        return '{"error":true,"message":"Please select a layer to split!"}';
    }

    app.beginUndoGroup("3D 2-Split");
    try {
        var baseLayer = comp.selectedLayers[0];
        var sz = _getLayerSize(baseLayer);
        var w = sz[0] || comp.width;
        var h = sz[1] || comp.height;
        var origPos = [comp.width / 2, comp.height / 2, 0];
        try {
            var pVal = baseLayer.position.value;
            if (pVal.length === 2) {
                origPos = [pVal[0], pVal[1], 0];
            } else {
                origPos = [pVal[0], pVal[1], pVal[2]];
            }
        } catch (e) {}

        var inPt = baseLayer.inPoint;
        var outPt = baseLayer.outPoint;
        var baseName = baseLayer.name;

        var masterNull = comp.layers.addNull();
        masterNull.name = baseName + " [2-Split Controller]";
        masterNull.threeDLayer = true;
        masterNull.position.setValue(origPos);
        masterNull.inPoint = inPt;
        masterNull.outPoint = outPt;
        masterNull.label = 1;

        var colW = w / 2;

        var leftLayer = baseLayer.duplicate();
        leftLayer.name = baseName + " - Left";
        leftLayer.threeDLayer = true;
        leftLayer.inPoint = inPt;
        leftLayer.outPoint = outPt;
        leftLayer.anchorPoint.setValue([colW / 2, h / 2, 0]);
        leftLayer.position.setValue([origPos[0] - colW / 2, origPos[1], origPos[2]]);
        var leftMaskGroup = leftLayer.property("ADBE Mask Parade") || leftLayer.property("Masks");
        var leftMask = leftMaskGroup.addProperty("ADBE Mask Atom");
        leftMask.name = "Split_Left";
        leftMask.maskMode = MaskMode.ADD;
        var leftShape = leftMask.property("ADBE Mask Shape").value;
        leftShape.vertices = [[0, 0], [colW, 0], [colW, h], [0, h]];
        leftShape.closed = true;
        leftMask.property("ADBE Mask Shape").setValue(leftShape);
        leftLayer.parent = masterNull;

        var rightLayer = baseLayer.duplicate();
        rightLayer.name = baseName + " - Right";
        rightLayer.threeDLayer = true;
        rightLayer.inPoint = inPt;
        rightLayer.outPoint = outPt;
        rightLayer.anchorPoint.setValue([colW + colW / 2, h / 2, 0]);
        rightLayer.position.setValue([origPos[0] + colW / 2, origPos[1], origPos[2]]);
        var rightMaskGroup = rightLayer.property("ADBE Mask Parade") || rightLayer.property("Masks");
        var rightMask = rightMaskGroup.addProperty("ADBE Mask Atom");
        rightMask.name = "Split_Right";
        rightMask.maskMode = MaskMode.ADD;
        var rightShape = rightMask.property("ADBE Mask Shape").value;
        rightShape.vertices = [[colW, 0], [w, 0], [w, h], [colW, h]];
        rightShape.closed = true;
        rightMask.property("ADBE Mask Shape").setValue(rightShape);
        rightLayer.parent = masterNull;

        baseLayer.enabled = false;

        app.endUndoGroup();
        return '{"error":false,"message":"3D 2-Split created successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"2-Split error: ' + e.toString().replace(/"/g, "'") + '"}';
    }
}

function _GEN_3D_3SPLIT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select an active composition first!"}';
    }
    if (comp.selectedLayers.length === 0) {
        return '{"error":true,"message":"Please select a layer to split!"}';
    }

    app.beginUndoGroup("3D 3-Split");
    try {
        var baseLayer = comp.selectedLayers[0];
        var sz = _getLayerSize(baseLayer);
        var w = sz[0] || comp.width;
        var h = sz[1] || comp.height;
        var origPos = [comp.width / 2, comp.height / 2, 0];
        try {
            var pVal = baseLayer.position.value;
            if (pVal.length === 2) {
                origPos = [pVal[0], pVal[1], 0];
            } else {
                origPos = [pVal[0], pVal[1], pVal[2]];
            }
        } catch (e) {}

        var inPt = baseLayer.inPoint;
        var outPt = baseLayer.outPoint;
        var baseName = baseLayer.name;

        var masterNull = comp.layers.addNull();
        masterNull.name = baseName + " [3-Split Controller]";
        masterNull.threeDLayer = true;
        masterNull.position.setValue(origPos);
        masterNull.inPoint = inPt;
        masterNull.outPoint = outPt;
        masterNull.label = 1;

        var colW = w / 3;

        var leftLayer = baseLayer.duplicate();
        leftLayer.name = baseName + " - Left";
        leftLayer.threeDLayer = true;
        leftLayer.inPoint = inPt;
        leftLayer.outPoint = outPt;
        leftLayer.anchorPoint.setValue([colW / 2, h / 2, 0]);
        leftLayer.position.setValue([origPos[0] - colW, origPos[1], origPos[2]]);
        var leftMaskGroup = leftLayer.property("ADBE Mask Parade") || leftLayer.property("Masks");
        var leftMask = leftMaskGroup.addProperty("ADBE Mask Atom");
        leftMask.name = "Split_Left";
        leftMask.maskMode = MaskMode.ADD;
        var leftShape = leftMask.property("ADBE Mask Shape").value;
        leftShape.vertices = [[0, 0], [colW, 0], [colW, h], [0, h]];
        leftShape.closed = true;
        leftMask.property("ADBE Mask Shape").setValue(leftShape);
        leftLayer.parent = masterNull;

        var centerLayer = baseLayer.duplicate();
        centerLayer.name = baseName + " - Center";
        centerLayer.threeDLayer = true;
        centerLayer.inPoint = inPt;
        centerLayer.outPoint = outPt;
        centerLayer.anchorPoint.setValue([w / 2, h / 2, 0]);
        centerLayer.position.setValue([origPos[0], origPos[1], origPos[2]]);
        var centerMaskGroup = centerLayer.property("ADBE Mask Parade") || centerLayer.property("Masks");
        var centerMask = centerMaskGroup.addProperty("ADBE Mask Atom");
        centerMask.name = "Split_Center";
        centerMask.maskMode = MaskMode.ADD;
        var centerShape = centerMask.property("ADBE Mask Shape").value;
        centerShape.vertices = [[colW, 0], [2 * colW, 0], [2 * colW, h], [colW, h]];
        centerShape.closed = true;
        centerMask.property("ADBE Mask Shape").setValue(centerShape);
        centerLayer.parent = masterNull;

        var rightLayer = baseLayer.duplicate();
        rightLayer.name = baseName + " - Right";
        rightLayer.threeDLayer = true;
        rightLayer.inPoint = inPt;
        rightLayer.outPoint = outPt;
        rightLayer.anchorPoint.setValue([w - colW / 2, h / 2, 0]);
        rightLayer.position.setValue([origPos[0] + colW, origPos[1], origPos[2]]);
        var rightMaskGroup = rightLayer.property("ADBE Mask Parade") || rightLayer.property("Masks");
        var rightMask = rightMaskGroup.addProperty("ADBE Mask Atom");
        rightMask.name = "Split_Right";
        rightMask.maskMode = MaskMode.ADD;
        var rightShape = rightMask.property("ADBE Mask Shape").value;
        rightShape.vertices = [[2 * colW, 0], [w, 0], [w, h], [2 * colW, h]];
        rightShape.closed = true;
        rightMask.property("ADBE Mask Shape").setValue(rightShape);
        rightLayer.parent = masterNull;

        baseLayer.enabled = false;

        app.endUndoGroup();
        return '{"error":false,"message":"3D 3-Split created successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"3-Split error: ' + e.toString().replace(/"/g, "'") + '"}';
    }
}

function _GEN_3D_TUNNEL() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select an active composition first!"}';
    }
    if (comp.selectedLayers.length === 0) {
        return '{"error":true,"message":"Please select a layer to create the 3D Tunnel!"}';
    }

    app.beginUndoGroup("Generate 3D Tunnel");
    try {
        var selLayer = comp.selectedLayers[0];
        var targetInPoint = selLayer.inPoint;
        var targetOutPoint = selLayer.outPoint;
        var targetStartTime = selLayer.startTime;
        var targetDuration = Math.max(targetOutPoint - targetInPoint, comp.frameDuration);

        var origPos = [comp.width / 2, comp.height / 2, 0];
        try {
            var pVal = selLayer.position.value;
            if (pVal.length === 2) {
                origPos = [pVal[0], pVal[1], 0];
            } else {
                origPos = [pVal[0], pVal[1], pVal[2]];
            }
        } catch (e) {}

        var origScale = [100, 100, 100];
        try {
            var sVal = selLayer.scale.value;
            origScale = [sVal[0], sVal[1], (sVal.length > 2 ? sVal[2] : 100)];
        } catch (e) {}

        var sourceItem = null;
        var layerW = 0;
        var layerH = 0;

        if (selLayer.source && (selLayer.source instanceof CompItem || selLayer.source instanceof FootageItem)) {
            sourceItem = selLayer.source;
            layerW = Math.round(sourceItem.width);
            layerH = Math.round(sourceItem.height);
        } else {
            var sz = _getLayerSize(selLayer);
            layerW = Math.round(sz[0] || comp.width);
            layerH = Math.round(sz[1] || comp.height);

            var srcName = "Tunnel_Source_" + selLayer.name;
            var scCount = 1;
            while (true) {
                var foundS = false;
                for (var j = 1; j <= app.project.numItems; j++) {
                    if (app.project.item(j) instanceof CompItem && app.project.item(j).name === srcName) {
                        foundS = true;
                        break;
                    }
                }
                if (!foundS) break;
                scCount++;
                srcName = "Tunnel_Source_" + selLayer.name + " " + scCount;
            }

            var sourceComp = app.project.items.addComp(
                srcName,
                layerW,
                layerH,
                comp.pixelAspect,
                targetDuration,
                comp.frameRate
            );
            var dupLayer = selLayer.duplicate();
            dupLayer.copyToComp(sourceComp);
            try { dupLayer.remove(); } catch(e) {}
            sourceItem = sourceComp;
        }

        if (layerW <= 0) layerW = comp.width;
        if (layerH <= 0) layerH = comp.height;

        var tilesCompName = "Tunnel_Tiles_Comp";
        var tCount = 1;
        while (true) {
            var foundT = false;
            for (var j = 1; j <= app.project.numItems; j++) {
                if (app.project.item(j) instanceof CompItem && app.project.item(j).name === tilesCompName) {
                    foundT = true;
                    break;
                }
            }
            if (!foundT) break;
            tCount++;
            tilesCompName = "Tunnel_Tiles_Comp " + tCount;
        }

        var tilesComp = app.project.items.addComp(
            tilesCompName,
            layerW,
            layerH,
            comp.pixelAspect,
            targetDuration,
            comp.frameRate
        );
        tilesComp.motionBlur = true;

        var tilePositions = [
            [layerW / 6, layerH / 6],
            [layerW / 2, layerH / 6],
            [layerW * 5 / 6, layerH / 6],
            [layerW / 6, layerH / 2],
            [layerW * 5 / 6, layerH / 2],
            [layerW / 6, layerH * 5 / 6],
            [layerW / 2, layerH * 5 / 6],
            [layerW * 5 / 6, layerH * 5 / 6]
        ];

        for (var i = 0; i < tilePositions.length; i++) {
            var tileLayer = tilesComp.layers.add(sourceItem);
            tileLayer.startTime = 0;
            tileLayer.inPoint = 0;
            tileLayer.outPoint = targetDuration;
            tileLayer.anchorPoint.setValue([layerW / 2, layerH / 2, 0]);
            tileLayer.position.setValue(tilePositions[i]);
            tileLayer.scale.setValue([100 / 3, 100 / 3, 100]);
        }

        var ringCompName = "Tunnel_Ring_Comp";
        var rCount = 1;
        while (true) {
            var foundR = false;
            for (var j = 1; j <= app.project.numItems; j++) {
                if (app.project.item(j) instanceof CompItem && app.project.item(j).name === ringCompName) {
                    foundR = true;
                    break;
                }
            }
            if (!foundR) break;
            rCount++;
            ringCompName = "Tunnel_Ring_Comp " + rCount;
        }

        var ringComp = app.project.items.addComp(
            ringCompName,
            layerW,
            layerH,
            comp.pixelAspect,
            targetDuration,
            comp.frameRate
        );
        ringComp.motionBlur = true;

        var ringLayer = ringComp.layers.add(tilesComp);
        ringLayer.startTime = 0;
        ringLayer.inPoint = 0;
        ringLayer.outPoint = targetDuration;
        ringLayer.position.setValue([layerW / 2, layerH / 2]);

        var ringMaskGroup = ringLayer.property("ADBE Mask Parade") || ringLayer.property("Masks");
        if (ringMaskGroup) {
            var centerMask = ringMaskGroup.addProperty("ADBE Mask Atom");
            centerMask.name = "Center_Hole";
            centerMask.maskMode = MaskMode.SUBTRACT;
            var maskShape = centerMask.property("ADBE Mask Shape");
            var shape = maskShape.value;
            var cw = layerW / 3;
            var ch = layerH / 3;
            shape.vertices = [
                [cw, ch],
                [2 * cw, ch],
                [2 * cw, 2 * ch],
                [cw, 2 * ch]
            ];
            shape.closed = true;
            maskShape.setValue(shape);
        }

        var masterNull = comp.layers.addNull();
        masterNull.name = "Tunnel_Controller";
        masterNull.threeDLayer = true;
        masterNull.position.setValue(origPos);
        masterNull.startTime = targetInPoint;
        masterNull.inPoint = targetInPoint;
        masterNull.outPoint = targetOutPoint;
        masterNull.label = 1;

        _addCtrlSlider(masterNull, "Z Spacing", 350);
        _addCtrlAngle(masterNull, "Global Rotation Z", 0);
        _addCtrlAngle(masterNull, "Twist Rotation", 15);
        _addCtrlCheckbox(masterNull, "Split Rotation", 0);
        _addCtrlAngle(masterNull, "Global Rotation X", 0);
        _addCtrlAngle(masterNull, "Global Rotation Y", 0);

        for (var k = 0; k < 10; k++) {
            var tLayer = comp.layers.add(ringComp);
            tLayer.name = "Tunnel_Ring_" + (k + 1);
            tLayer.threeDLayer = true;
            tLayer.motionBlur = true;
            tLayer.startTime = targetInPoint;
            tLayer.inPoint = targetInPoint;
            tLayer.outPoint = targetOutPoint;
            tLayer.anchorPoint.setValue([layerW / 2, layerH / 2, 0]);
            tLayer.position.setValue([origPos[0], origPos[1], -k * 350]);
            tLayer.scale.setValue(origScale);
            tLayer.parent = masterNull;

            var posExpr = 'var ctrl = parent;\n' +
                'var sp = 350;\n' +
                'try { sp = ctrl.effect("Z Spacing")("Slider"); } catch(e) {}\n' +
                '[value[0], value[1], -' + k + ' * sp];';
            try { tLayer.property("ADBE Transform Group").property("ADBE Position").expression = posExpr; } catch(e) {}

            var zRotExpr = 'var ctrl = parent;\n' +
                'var baseRot = 0;\n' +
                'var twist = 0;\n' +
                'var isSplit = 0;\n' +
                'try { baseRot = ctrl.effect("Global Rotation Z")("Angle"); } catch(e) {}\n' +
                'try { twist = ctrl.effect("Twist Rotation")("Angle"); } catch(e) {}\n' +
                'try { isSplit = ctrl.effect("Split Rotation")("Checkbox"); } catch(e) {}\n' +
                'var k = ' + k + ';\n' +
                'if (isSplit == 1) {\n' +
                '    var dir = (k % 2 == 0) ? 1 : -1;\n' +
                '    baseRot + dir * (k * twist);\n' +
                '} else {\n' +
                '    baseRot + (k * twist);\n' +
                '}';
            _setZRotationExpr(tLayer, zRotExpr);

            var xRotExpr = 'var ctrl = parent;\n' +
                'var rotX = 0;\n' +
                'try { rotX = ctrl.effect("Global Rotation X")("Angle"); } catch(e) {}\n' +
                'rotX;';
            _setXRotationExpr(tLayer, xRotExpr);

            var yRotExpr = 'var ctrl = parent;\n' +
                'var rotY = 0;\n' +
                'try { rotY = ctrl.effect("Global Rotation Y")("Angle"); } catch(e) {}\n' +
                'rotY;';
            _setYRotationExpr(tLayer, yRotExpr);

            try {
                var effectGroup = tLayer.property("ADBE Effect Parade") || tLayer.property("ADBE Effect Group") || tLayer.property("Effects");
                if (effectGroup) {
                    var dsEffect = effectGroup.addProperty("ADBE Drop Shadow");
                    if (dsEffect) {
                        var opacityProp = dsEffect.property("ADBE Drop Shadow-0002") || dsEffect.property("Shadow Opacity") || dsEffect.property(2);
                        var directionProp = dsEffect.property("ADBE Drop Shadow-0003") || dsEffect.property("Direction") || dsEffect.property(3);
                        var distanceProp = dsEffect.property("ADBE Drop Shadow-0004") || dsEffect.property("Distance") || dsEffect.property(4);
                        var softnessProp = dsEffect.property("ADBE Drop Shadow-0005") || dsEffect.property("Softness") || dsEffect.property(5);

                        if (opacityProp) opacityProp.setValue(225);
                        if (directionProp) directionProp.setValue(0);
                        if (distanceProp) distanceProp.setValue(0);
                        if (softnessProp) softnessProp.setValue(60);
                    }
                }
            } catch(e) {}
        }

        selLayer.enabled = false;

        app.endUndoGroup();
        return '{"error":false,"message":"3D Depth Tunnel generated successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"Tunnel error: ' + e.toString().replace(/"/g, "'") + '"}';
    }
}

tools.PNG = function () { return _PNG(); };
tools.CUBE = function (w, h, d, useLayer) { return _CUBE(w, h, d, useLayer); };
tools.GEN_3D_2SPLIT = function () { return _GEN_3D_2SPLIT(); };
tools.GEN_3D_3SPLIT = function () { return _GEN_3D_3SPLIT(); };
tools.GEN_3D_TUNNEL = function () { return _GEN_3D_TUNNEL(); };
tools.GEN_3D_BOX = function () { return _GEN_3D("BOX"); };
tools.GEN_3D_CABINET = function () { return _GEN_3D("CABINET"); };
tools.GEN_3D_TABLE = function () { return _GEN_3D("TABLE"); };
tools.GEN_3D_PHONE = function () { return _GEN_3D("PHONE"); };
tools.GEN_3D_LAPTOP = function () { return _GEN_3D("LAPTOP"); };
tools.GEN_3D_ROOM = function () { return _GEN_3D("ROOM"); };
tools.GEN_3D_CRT = function () { return _GEN_3D("CRT"); };
tools.GEN_3D_ZFLIP = function () { return _GEN_3D("ZFLIP"); };
tools.GEN_3D_ZFOLD = function () { return _GEN_3D("ZFOLD"); };
tools.GEN_3D_BOOK = function () { return _GEN_3D("BOOK"); };
tools.GEN_3D_BINDER = function () { return _GEN_3D("BINDER"); };
tools.GEN_3D_TABLET = function () { return _GEN_3D("TABLET"); };
tools.GEN_3D_GLASSES = function () { return _GEN_3D("GLASSES"); };
tools.GEN_3D_WINDOW = function () { return _GEN_3D("WINDOW"); };
tools.GEN_3D_DOOR = function () { return _GEN_3D("DOOR"); };
tools.GEN_3D_DESK = function () { return _GEN_3D("DESK"); };
tools.GEN_3D_MONITOR = function () { return _GEN_3D("MONITOR"); };
tools.GEN_3D_PC = function () { return _GEN_3D("PC"); };
tools.GEN_3D_MC = function () { return _GEN_MC_3D(); };
tools.PURGE = function (target) { return _PURGE(target); };
tools.BEATMARK = function () { return _addBeatMark(); };
tools.CLEARBEATS = function () { return _clearBeatMarks(); };
tools.BEAT_AUTO = function (threshold, channel) { return _autoBeatDetect(threshold, channel); };
tools.DEBUG_ALL = function () { return _DEBUG_ALL(); };
tools.OVERLAP = function () { return _OVERLAP(); };
tools.changeCompRatio = function (w, h) { return _changeCompRatio(w, h); };
tools.changeCompFPS = function (fps) { return _changeCompFPS(fps); };

function _CLEAN_TTS_CACHE(cacheDirPath) {
    try {
        var folder = new Folder(cacheDirPath);
        if (folder.exists) {
            var files = folder.getFiles();
            for (var i = 0; i < files.length; i++) {
                try {
                    files[i].remove();
                } catch (err) {}
            }
            folder.remove();
            return 'OK';
        }
        return 'ERROR:Cache folder not found';
    } catch (e) {
        return 'ERROR:' + e.toString();
    }
}

function _IMPORT_TTS(filePath, textContent, addTextLayer, animateText, animDirection, animBasedOn) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return '{"error":true,"message":"Please select a composition first!"}';
    }

    var dir = animDirection || 'bottom_to_top';
    var basedOn = animBasedOn || 'lines';

    app.beginUndoGroup("Import TTS Speech");
    try {
        var file = new File(filePath);
        if (!file.exists) {
            throw new Error("Generated audio file does not exist on disk.");
        }

        var importOptions = new ImportOptions(file);
        var importItem = app.project.importFile(importOptions);
        var audioLayer = comp.layers.add(importItem);
        audioLayer.name = "TTS_Audio";
        audioLayer.startTime = comp.time;

        if (addTextLayer) {
            var compRatio = comp.width / comp.height;
            var shortSide = Math.min(comp.width, comp.height);

            var sizeRatio = 0.039;
            if (compRatio >= 1.7) {
                sizeRatio = 0.035;
            } else if (compRatio >= 0.9) {
                sizeRatio = 0.037;
            }
            var fontSize = Math.round(shortSide * sizeRatio);
            fontSize = Math.max(16, Math.min(fontSize, 80));

            var maxChars = 38;
            if (compRatio >= 1.7) {
                maxChars = 80;
            } else if (compRatio >= 0.9) {
                maxChars = 55;
            }

            var cleanText = textContent.replace(/[\r\n]+/g, ' ');
            var words = cleanText.split(' ');
            var lines = [];
            var currentLine = "";
            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                var testLine = currentLine ? (currentLine + " " + word) : word;
                var testLineClean = testLine.replace(/^\s+|\s+$/g, '');
                if (testLineClean.length > maxChars) {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            var wrappedText = lines.join('\n');

            var textLayer = comp.layers.addText(wrappedText);
            textLayer.name = "TTS_Caption";
            textLayer.startTime = comp.time;
            textLayer.outPoint = audioLayer.outPoint;

            var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
            var textDoc = textProp.value;
            textDoc.text = wrappedText;
            textDoc.fontSize = fontSize;
            textDoc.fillColor = [1, 1, 1];
            textDoc.applyStroke = false;
            textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;

            var leadingRatio = 1.3;
            textDoc.autoLeading = false;
            textDoc.leading = Math.round(fontSize * leadingRatio);

            textProp.setValue(textDoc);

            var dsEffect = textLayer.Effects.addProperty("ADBE Drop Shadow");
            if (dsEffect) {
                var opacityProp = dsEffect.property("ADBE Drop Shadow-0002") || dsEffect.property("Shadow Opacity") || dsEffect.property(2);
                var directionProp = dsEffect.property("ADBE Drop Shadow-0003") || dsEffect.property("Direction") || dsEffect.property(3);
                var distanceProp = dsEffect.property("ADBE Drop Shadow-0004") || dsEffect.property("Distance") || dsEffect.property(4);
                var softnessProp = dsEffect.property("ADBE Drop Shadow-0005") || dsEffect.property("Softness") || dsEffect.property(5);

                if (opacityProp) opacityProp.setValue(255);
                if (directionProp) directionProp.setValue(135);
                if (distanceProp) distanceProp.setValue(Math.max(2, Math.round(fontSize * 0.08)));
                if (softnessProp) softnessProp.setValue(0);
            }

            var rect = textLayer.sourceRectAtTime(comp.time, false);
            var apProp = textLayer.property("ADBE Transform Group").property("ADBE Anchor Point");
            if (apProp) {
                apProp.setValue([rect.left + rect.width / 2, rect.top + rect.height / 2, 0]);
            }

            var posY = comp.height * 0.86;
            if (compRatio >= 1.7) {
                posY = comp.height * 0.90;
            } else if (compRatio >= 0.9) {
                posY = comp.height * 0.88;
            }

            var posProp = textLayer.property("ADBE Transform Group").property("ADBE Position");
            posProp.setValue([comp.width / 2, posY]);

            if (animateText) {
                var textProps = textLayer.property("ADBE Text Properties");
                var animators = textProps.property("ADBE Text Animators");
                var animator = animators.addProperty("ADBE Text Animator");
                animator.name = "TTS Appear";

                var selectors = animator.property("ADBE Text Selectors");
                var rangeSel = selectors.addProperty("ADBE Text Selector");

                var rangeStart = rangeSel.property("ADBE Text Percent Start");
                var rangeEnd = rangeSel.property("ADBE Text Percent End");
                var layerInTime = textLayer.inPoint;
                var animDuration = textLayer.outPoint - textLayer.inPoint;

                rangeStart.setValueAtTime(layerInTime, 0);
                rangeStart.setValueAtTime(layerInTime + animDuration, 100);
                rangeEnd.setValue(100);

                var basedOnMap = {
                    'characters': 1,
                    'characters_excl_spaces': 2,
                    'words': 3,
                    'lines': 4
                };
                var basedOnVal = basedOnMap[basedOn] || 4;
                try {
                    var advProp = rangeSel.property("ADBE Text Range Advanced");
                    if (advProp) {
                        var rangeTypeProp = advProp.property("ADBE Text Range Type2") || advProp.property("Based On");
                        if (rangeTypeProp) rangeTypeProp.setValue(basedOnVal);
                        
                        var easeHighProp = advProp.property("ADBE Text Ease High") || advProp.property("Ease High");
                        if (easeHighProp) easeHighProp.setValue(50);
                        
                        var easeLowProp = advProp.property("ADBE Text Ease Low") || advProp.property("Ease Low");
                        if (easeLowProp) easeLowProp.setValue(50);
                    }
                } catch(e) {}

                var animPropGroup = animator.property("ADBE Text Animator Properties");
                
                var offsetProp = null;
                try { offsetProp = animPropGroup.addProperty("ADBE Text Position"); } catch (e) {
                    try { offsetProp = animPropGroup.addProperty("Position"); } catch (e2) {
                        try { offsetProp = animPropGroup.addProperty("ADBE Text Position 3D"); } catch (e3) {}
                    }
                }

                var opacityProp = null;
                try { opacityProp = animPropGroup.addProperty("ADBE Text Opacity"); } catch (e) {
                    try { opacityProp = animPropGroup.addProperty("Opacity"); } catch (e2) {}
                }

                var offsetAmt = Math.round(fontSize * 1.2);
                var offsetVec = [0, 0, 0];

                if (dir === 'bottom_to_top') {
                    offsetVec = [0, offsetAmt, 0];
                } else if (dir === 'top_to_bottom') {
                    offsetVec = [0, -offsetAmt, 0];
                } else if (dir === 'left_to_right') {
                    offsetVec = [-offsetAmt, 0, 0];
                } else if (dir === 'right_to_left') {
                    offsetVec = [offsetAmt, 0, 0];
                }

                if (offsetProp) {
                    try { offsetProp.setValue(offsetVec); } catch(e) {}
                }
                if (opacityProp) {
                    try { opacityProp.setValue(0); } catch(e) {}
                }
            }
        }

        app.endUndoGroup();
        return '{"error":false,"message":"TTS imported successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true,"message":"TTS Import Error: ' + e.toString() + ' (Line ' + e.line + ')"}';
    }
}

tools.CLEAN_TTS_CACHE = function (filePath) {
    return _CLEAN_TTS_CACHE(filePath);
};

tools.IMPORT_TTS = function (filePath, textContent, addTextLayer, animateText, animDirection, animBasedOn) {
    return _IMPORT_TTS(filePath, textContent, addTextLayer, animateText, animDirection, animBasedOn);
};
