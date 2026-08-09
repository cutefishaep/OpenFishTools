function _HUE() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Hue/Saturation","type":"warn","message":"Please open a composition first."}';
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length == 0) return '{"error":true,"tool":"Hue/Saturation","type":"warn","message":"Please select at least one layer to add Hue/Saturation."}';
    app.beginUndoGroup("Add Hue/Saturation");
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var effects = layer.property("ADBE Effect Parade") || layer.Effects;
        if (effects) effects.addProperty("ADBE HUE SATURATION");
    }
    app.endUndoGroup();
    return true;
}

function _FILL() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Fill","type":"warn","message":"Please open a composition first."}';
    var sel = comp.selectedLayers;
    if (sel.length == 0) return '{"error":true,"tool":"Fill","type":"warn","message":"Please select at least one layer to add a Fill effect."}';
    app.beginUndoGroup("Add Fill Effect");
    for (var i = 0; i < sel.length; i++) {
        var effects = sel[i].property("ADBE Effect Parade") || sel[i].Effects;
        if (effects) effects.addProperty("ADBE Fill");
    }
    app.endUndoGroup();
    return true;
}

function _TINT() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Tint","type":"warn","message":"Please open a composition first."}';
    var sel = comp.selectedLayers;
    if (sel.length == 0) return '{"error":true,"tool":"Tint","type":"warn","message":"Please select at least one layer to add a Tint effect."}';
    app.beginUndoGroup("Add Tint Effect");
    for (var i = 0; i < sel.length; i++) {
        var effects = sel[i].property("ADBE Effect Parade") || sel[i].Effects;
        if (effects) effects.addProperty("ADBE Tint");
    }
    app.endUndoGroup();
    return true;
}

function _BLUR(alter) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Blur","type":"warn","message":"Please open a composition first."}';
    var sel = comp.selectedLayers;
    if (sel.length == 0) return '{"error":true,"tool":"Blur","type":"warn","message":"Please select at least one layer to add a Blur effect."}';
    app.beginUndoGroup("Add Blur");
    for (var i = 0; i < sel.length; i++) {
        var effects = sel[i].property("ADBE Effect Parade") || sel[i].Effects;
        if (effects) effects.addProperty(alter ? "ADBE Camera Lens Blur" : "ADBE Gaussian Blur 2");
    }
    app.endUndoGroup();
    return true;
}

function _LUM() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Lumetri","type":"warn","message":"Please open a composition first."}';
    var sel = comp.selectedLayers;
    if (sel.length == 0) return '{"error":true,"tool":"Lumetri","type":"warn","message":"Please select at least one layer to add Lumetri Color."}';
    app.beginUndoGroup("Add Lumetri Color");
    for (var i = 0; i < sel.length; i++) {
        var effects = sel[i].property("ADBE Effect Parade") || sel[i].Effects;
        if (effects) effects.addProperty("ADBE Lumetri");
    }
    app.endUndoGroup();
    return true;
}

function _CURV() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return '{"error":true,"tool":"Curves","type":"warn","message":"Please open a composition first."}';
    var sel = comp.selectedLayers;
    if (sel.length == 0) return '{"error":true,"tool":"Curves","type":"warn","message":"Please select at least one layer to add a Curves effect."}';
    app.beginUndoGroup("Add Curves");
    for (var i = 0; i < sel.length; i++) {
        var effects = sel[i].property("ADBE Effect Parade") || sel[i].Effects;
        if (effects) effects.addProperty("ADBE CurvesCustom");
    }
    app.endUndoGroup();
    return true;
}


tools.HUE = function () { return _HUE(); };
tools.FILL = function () { return _FILL(); };
tools.TINT = function () { return _TINT(); };
tools.BLUR = function (alter) { return _BLUR(alter); };
tools.LUM = function () { return _LUM(); };
tools.CURV = function () { return _CURV(); };
