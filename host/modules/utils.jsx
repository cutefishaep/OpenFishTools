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

function _getLayerSize(layer) {
    if (layer instanceof TextLayer || layer instanceof ShapeLayer) {
        var rect = layer.sourceRectAtTime(layer.containingComp.time, false);
        return [rect.width, rect.height];
    }
    return [layer.width, layer.height];
}

function _getSimplePath(prop) {
    var path = "";
    var curr = prop;
    while (curr && curr.matchName !== "ADBE Layer Built In Props" && curr.parentProperty) {
        path = '("' + curr.matchName + '")' + path;
        curr = curr.parentProperty;
    }
    return path;
}
