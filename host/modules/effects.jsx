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

// Tool registration
tools.HUE = function () { return _HUE(); };
tools.FILL = function () { return _FILL(); };
tools.TINT = function () { return _TINT(); };
tools.BLUR = function (alter) { return _BLUR(alter); };
tools.LUM = function () { return _LUM(); };
tools.CURV = function () { return _CURV(); };
