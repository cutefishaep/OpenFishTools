function _BUBBLETEXT(text, radius, isSender) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem))
        return '{"error":true,"message":"Please select a composition first!"}';

    if (!text || text === "")
        return '{"error":true,"type":"warn","message":"Please enter some text for the bubble."}';

    var cornerRadius = parseFloat(radius) || 18;
    var sender = (isSender === true || isSender === "true");

    var senderColor = [24 / 255, 136 / 255, 254 / 255];
    var receiverColor = [59 / 255, 59 / 255, 61 / 255];
    var bubbleColor = sender ? senderColor : receiverColor;

    app.beginUndoGroup("Create Bubble Text");
    try {
        var bubbleLayer = comp.layers.addShape();
        bubbleLayer.name = "Bubble_Shape";

        var fontSize = 32;
        var textLayer = comp.layers.addText(text);
        textLayer.name = "Bubble_Text";

        var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var textDoc = textProp.value;
        textDoc.fontSize = fontSize;
        textDoc.fillColor = [1, 1, 1];
        textDoc.strokeColor = [1, 1, 1];
        textDoc.applyFill = true;
        textDoc.applyStroke = false;
        textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;

        try { textDoc.font = "SFProText-Regular"; } catch (e1) {
            try { textDoc.font = "HelveticaNeue"; } catch (e2) {
                try { textDoc.font = "Arial"; } catch (e3) { }
            }
        }
        textProp.setValue(textDoc);

        var textRect = textLayer.sourceRectAtTime(comp.time, false);
        var textW = textRect.width;
        var textH = textRect.height;

        var padH = 24;
        var padV = 16;
        var bubbleW = textW + (padH * 2);
        var bubbleH = textH + (padV * 2);

        var maxR = Math.min(bubbleW, bubbleH) / 2;
        if (cornerRadius > maxR) cornerRadius = maxR;
        var R = cornerRadius;
        var hW = bubbleW / 2;
        var hH = bubbleH / 2;

        var k = R * 0.5522847498;

        var verts, inT, outT;

        if (sender) {
            verts = [
                [-hW, -hH + R],
                [-hW + R, -hH],
                [hW - R, -hH],
                [hW, -hH + R],
                [hW, hH],
                [-hW + R, hH],
                [-hW, hH - R]
            ];
            inT = [
                [0, 0], [-k, 0], [0, 0], [0, -k],
                [0, 0], [0, 0], [0, k]
            ];
            outT = [
                [0, -k], [0, 0], [k, 0], [0, 0],
                [0, 0], [-k, 0], [0, 0]
            ];
        } else {
            verts = [
                [-hW, -hH + R],
                [-hW + R, -hH],
                [hW - R, -hH],
                [hW, -hH + R],
                [hW, hH - R],
                [hW - R, hH],
                [-hW, hH]
            ];
            inT = [
                [0, 0], [-k, 0], [0, 0], [0, -k],
                [0, 0], [k, 0], [0, 0]
            ];
            outT = [
                [0, -k], [0, 0], [k, 0], [0, 0],
                [0, k], [0, 0], [0, 0]
            ];
        }

        var rootVectors = bubbleLayer.property("ADBE Root Vectors Group");
        var bodyGroup = rootVectors.addProperty("ADBE Vector Group");
        bodyGroup.name = "Bubble";
        var bodyVectors = bodyGroup.property("ADBE Vectors Group");

        var pathProp = bodyVectors.addProperty("ADBE Vector Shape - Group");
        var shape = new Shape();
        shape.vertices = verts;
        shape.inTangents = inT;
        shape.outTangents = outT;
        shape.closed = true;
        pathProp.property("ADBE Vector Shape").setValue(shape);

        var fill = bodyVectors.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(bubbleColor);

        var centerX = comp.width / 2;
        var centerY = comp.height / 2;

        bubbleLayer.property("ADBE Transform Group").property("ADBE Position").setValue([centerX, centerY]);

        var textAnchorX = textRect.left + textW / 2;
        var textAnchorY = textRect.top + textH / 2;
        textLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([textAnchorX, textAnchorY]);
        textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([centerX, centerY]);

        var previewText = text.length > 15 ? text.substring(0, 15) + "..." : text;
        var precompName = "Bubble_" + previewText;

        var layerIndices = [textLayer.index, bubbleLayer.index];
        layerIndices.sort(function (a, b) { return a - b; });

        var preComp = comp.layers.precompose(layerIndices, precompName, true);

        var margin = 10;
        preComp.width = Math.ceil(bubbleW + margin * 2);
        preComp.height = Math.ceil(bubbleH + margin * 2);

        var pcCenterX = preComp.width / 2;
        var pcCenterY = preComp.height / 2;

        for (var i = 1; i <= preComp.numLayers; i++) {
            var lyr = preComp.layer(i);
            lyr.property("ADBE Transform Group").property("ADBE Position").setValue([pcCenterX, pcCenterY]);
            lyr.motionBlur = true;
        }

        for (var j = 1; j <= comp.numLayers; j++) {
            var cl = comp.layer(j);
            if (cl.source instanceof CompItem && cl.source.id === preComp.id) {
                if (sender) {
                    cl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([
                        pcCenterX + hW,
                        pcCenterY + hH
                    ]);
                    cl.property("ADBE Transform Group").property("ADBE Position").setValue([
                        centerX + hW,
                        centerY + hH
                    ]);
                } else {
                    cl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([
                        pcCenterX - hW,
                        pcCenterY + hH
                    ]);
                    cl.property("ADBE Transform Group").property("ADBE Position").setValue([
                        centerX - hW,
                        centerY + hH
                    ]);
                }
                cl.collapseTransformation = true;
                cl.motionBlur = true;
                break;
            }
        }

        app.endUndoGroup();
        return '{"error":false, "message":"Bubble text created successfully!"}';
    } catch (e) {
        app.endUndoGroup();
        return '{"error":true, "message":"Bubble text error: ' + e.toString().replace(/"/g, "'") + ' (Line ' + e.line + ')"}';
    }
}

tools.BUBBLETEXT = function (text, radius, isSender) { return _BUBBLETEXT(text, radius, isSender); };
