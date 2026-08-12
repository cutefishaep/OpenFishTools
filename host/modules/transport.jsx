

var _transportPlaying = false;

function _findAECommand(names, defaultId) {
    for (var i = 0; i < names.length; i++) {
        try {
            var id = app.findMenuCommandId(names[i]);
            if (id && id > 0) return id;
        } catch (e) {}
    }
    return defaultId;
}

function _transportPlayPause() {
    try {
        _transportPlaying = !_transportPlaying;

        var playNames = ["Play Current Preview", "Preview", "RAM Preview"];
        var cmdId = _findAECommand(playNames, 201);

        var script =
            "(function(){" +
            "  try { if (app.activeViewer) app.activeViewer.setActive(); } catch(e) {}" +
            "  try { app.executeCommand(" + cmdId + "); } catch(e) {}" +
            "})()";
        app.scheduleTask(script, 100, false);
        return _transportPlaying ? "true" : "false";
    } catch (e) {
        return "err:" + e.message;
    }
}

function _transportGetPlayState() {
    return _transportPlaying ? "true" : "false";
}

function _markerTimes() {
    var comp = app.project ? app.project.activeItem : null;
    if (!comp || !(comp instanceof CompItem)) return null;
    var times = [];
    var collect = function (marker) {
        if (!marker) return;
        try {
            for (var i = 1; i <= marker.numKeys; i++) {
                times.push(Number(marker.keyTime(i)));
            }
        } catch (e) {}
    };
    var marker = null;
    if (comp.selectedLayers && comp.selectedLayers.length > 0) {
        marker = comp.selectedLayers[0].marker;
    }
    if (marker && marker.numKeys > 0) {
        collect(marker);
    } else {
        try { collect(comp.markerProperty); } catch (e) {}
    }
    times.sort(function (a, b) { return a - b; });
    return times;
}

function _transportPrevMarker() {
    try {
        var comp = app.project ? app.project.activeItem : null;
        if (!comp || !(comp instanceof CompItem)) return "err:No composition";
        var times = _markerTimes();
        if (!times || !times.length) return "false";
        var current = Number(comp.time) - 0.0001;
        var target = null;
        for (var i = times.length - 1; i >= 0; i--) {
            if (times[i] < current) { target = times[i]; break; }
        }
        if (target === null) target = times[times.length - 1];
        comp.time = target;
        return "true";
    } catch (e) {
        return "err:" + e.message;
    }
}

function _transportNextMarker() {
    try {
        var comp = app.project ? app.project.activeItem : null;
        if (!comp || !(comp instanceof CompItem)) return "err:No composition";
        var times = _markerTimes();
        if (!times || !times.length) return "false";
        var current = Number(comp.time) + 0.0001;
        var target = null;
        for (var i = 0; i < times.length; i++) {
            if (times[i] > current) { target = times[i]; break; }
        }
        if (target === null) target = times[0];
        comp.time = target;
        return "true";
    } catch (e) {
        return "err:" + e.message;
    }
}
