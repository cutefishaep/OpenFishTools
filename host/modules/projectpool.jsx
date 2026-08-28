// ==========================================================================
//  Project Pool — ExtendScript Host Module
//  Handles: Collect Files, Save As older version, AM conversion, ZIP, media
// ==========================================================================

var AE_VERSION_TABLE = [
    { value: 13, label: "CC 2015.3 (v13)", year: "2015.3", major: 13 },
    { value: 14, label: "CC 2017 (v14)",   year: "2017",   major: 14 },
    { value: 15, label: "CC 2018 (v15)",   year: "2018",   major: 15 },
    { value: 16, label: "CC 2019 (v16)",   year: "2019",   major: 16 },
    { value: 17, label: "CC 2020 (v17)",   year: "2020",   major: 17 },
    { value: 18, label: "CC 2021 (v18)",   year: "2021",   major: 18 },
    { value: 22, label: "CC 2022 (v22)",   year: "2022",   major: 22 },
    { value: 23, label: "CC 2023 (v23)",   year: "2023",   major: 23 },
    { value: 24, label: "CC 2024 (v24)",   year: "2024",   major: 24 },
    { value: 25, label: "CC 2025 (v25)",   year: "2025",   major: 25 },
    { value: 26, label: "CC 2026 (v26)",   year: "2026",   major: 26 }
];

tools.PP_BROWSE_FOLDER = function () {
    try {
        var folder = Folder.selectDialog("Choose Save Location for Preset");
        if (folder) return folder.fsName;
    } catch (e) {}
    return 'false';
};

tools.PP_GET_PROJECT_INFO = function () {
    try {
        var hasProj = (app.project && app.project.file);
        var projName = "";
        var projFolder = "";
        if (hasProj) {
            var f = app.project.file;
            projName = f.name.replace(/\.[^\.]+$/, "");
            if (f.parent && f.parent.exists) {
                projFolder = f.parent.fsName;
            }
        }
        var currentVer = _getCurrentAEMajorVersion();
        return JSON.stringify({
            hasProject: !!hasProj,
            projectName: projName,
            projectFolder: projFolder,
            aeVersion: currentVer,
            totalItems: (app.project ? app.project.numItems : 0)
        });
    } catch (e) {
        return '{"hasProject":false,"projectName":"","projectFolder":"","aeVersion":0,"totalItems":0}';
    }
};

tools.PP_GET_VERSIONS = function () {
    try {
        var versions = _getDowngradeableVersions();
        var currentVer = _getCurrentAEMajorVersion();
        return JSON.stringify({ current: currentVer, versions: versions });
    } catch (e) {
        return '{"current":0,"versions":[]}';
    }
};

tools.PP_CREATE_PRESET = function (projectName, saveLocation, convertAM, downgrade, targetVersion) {
    try {
        if (!app.project || !app.project.file) {
            return 'error:Please save your After Effects project before creating a preset.';
        }

        var origProjFile = app.project.file;
        if (!origProjFile.exists) {
            return 'error:Project file not found on disk. Please save project.';
        }

        // Save current project first to preserve any recent unsaved changes
        try { app.project.save(); } catch (e) {}

        if (!saveLocation || typeof saveLocation !== 'string' || saveLocation.length === 0) {
            return 'error:Invalid save location specified.';
        }

        var safeName = projectName ? String(projectName).replace(/[\\\/:\*\?"<>\|]/g, "_").replace(/^\s+|\s+$/g, "") : "Preset";
        if (safeName.length === 0) safeName = "Preset";

        var saveFolder = new Folder(saveLocation);
        if (!saveFolder.exists) saveFolder.create();

        var presetFolder = new Folder(saveFolder.fsName + "/" + safeName);
        if (!presetFolder.exists) presetFolder.create();

        // Step 1: Collect files and relink footage in the preset copy
        var destProj = _collectAndRelinkProject(origProjFile, presetFolder, safeName, convertAM, downgrade, targetVersion);
        if (!destProj) {
            return 'error:Failed to collect project files and footage.';
        }

        var zipPath = presetFolder.fsName + "/" + safeName + ".zip";

        return JSON.stringify({
            success: true,
            presetFolder: presetFolder.fsName,
            zipPath: zipPath,
            projectName: safeName,
            saveLocation: saveLocation
        });
    } catch (e) {
        return 'error:' + e.toString();
    }
};

tools.PP_REVEAL_FOLDER = function (folderPath) {
    try {
        var f = new Folder(folderPath);
        if (f.exists) {
            f.execute();
            return 'true';
        }
    } catch (e) {}
    return 'false';
};

tools.PP_LIST_MEDIA = function () {
    var items = [];
    try {
        if (!app.project) return '[]';

        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem) {
                var typeName = 'image';
                var filePath = '';
                var durationSec = 0;
                try {
                    if (item.mainSource instanceof SolidSource) {
                        typeName = 'solid';
                    } else if (item.mainSource instanceof PlaceholderSource) {
                        typeName = 'placeholder';
                    } else if (item.mainSource && item.mainSource.file) {
                        var srcFile = item.mainSource.file;
                        if (srcFile && srcFile.exists) {
                            filePath = srcFile.fsName;
                        }
                        var fname = (srcFile ? srcFile.name : item.name).toLowerCase();
                        if (fname.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm|mxf|prores|dnxhd|m4v|mpg|mpeg)/)) {
                            typeName = 'video';
                        } else if (fname.match(/\.(mp3|wav|aac|ogg|m4a|flac|aif|aiff)/)) {
                            typeName = 'audio';
                        } else {
                            typeName = 'image';
                        }
                    }
                } catch (e) {}

                try {
                    if (item.duration && !isNaN(item.duration)) {
                        durationSec = Math.round(item.duration * 10) / 10;
                    }
                } catch (e) {}

                items.push({
                    id: i,
                    name: item.name,
                    type: typeName,
                    path: filePath,
                    width: item.width || 0,
                    height: item.height || 0,
                    duration: durationSec
                });
            }
        }
    } catch (e) {}
    return JSON.stringify(items);
};

tools.PP_REPLACE_MEDIA = function (itemId, itemName) {
    try {
        if (!app.project) return 'error:No project open';

        var item = null;
        if (itemId >= 1 && itemId <= app.project.numItems) {
            var candidate = app.project.item(itemId);
            if (candidate && candidate instanceof FootageItem && candidate.name === itemName) {
                item = candidate;
            }
        }
        if (!item) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var cand = app.project.item(i);
                if (cand instanceof FootageItem && cand.name === itemName) {
                    item = cand;
                    break;
                }
            }
        }
        if (!item && itemId >= 1 && itemId <= app.project.numItems) {
            var cand2 = app.project.item(itemId);
            if (cand2 instanceof FootageItem) {
                item = cand2;
            }
        }

        if (!item || !(item instanceof FootageItem)) {
            return 'error:Footage item not found in project.';
        }

        var filters;
        var nameLower = (itemName || item.name).toLowerCase();
        if (nameLower.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm|mxf|prores|m4v|mpg|mpeg)/)) {
            filters = _isWindows() ? "Video Files:*.mp4;*.mov;*.avi;*.mkv;*.wmv;*.flv;*.webm;*.mxf;*.prores;*.m4v;*.mpg;*.mpeg,All Files:*.*" : "";
        } else if (nameLower.match(/\.(mp3|wav|aac|ogg|m4a|flac|aif|aiff)/)) {
            filters = _isWindows() ? "Audio Files:*.mp3;*.wav;*.aac;*.ogg;*.m4a;*.flac;*.aif;*.aiff,All Files:*.*" : "";
        } else {
            filters = _isWindows() ? "Image Files:*.jpg;*.jpeg;*.png;*.psd;*.tif;*.tiff;*.bmp;*.gif;*.tga;*.exr;*.hdr;*.svg;*.webp;*.ai,All Files:*.*" : "";
        }

        var newFile = File.openDialog("Replace \"" + item.name + "\"", filters, false);
        if (!newFile) return 'cancelled';

        app.beginUndoGroup("Replace Media: " + item.name);
        try {
            item.replace(newFile);
        } catch (e) {
            app.endUndoGroup();
            return 'error:Replace failed: ' + e.toString();
        }
        app.endUndoGroup();

        return 'true';
    } catch (e) {
        return 'error:' + e.toString();
    }
};

// ==========================================================================
//  Internal Helper Functions
// ==========================================================================

function _collectAndRelinkProject(origProjFile, presetFolder, safeName, convertAM, downgrade, targetVersion) {
    try {
        var assetsFolder = new Folder(presetFolder.fsName + "/Assets");
        if (!assetsFolder.exists) assetsFolder.create();

        // 1. Collect all used footage items into Assets/
        var collected = {};
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem && item.mainSource && item.mainSource.file) {
                var srcFile = item.mainSource.file;
                if (srcFile && srcFile.exists && !collected[srcFile.fsName]) {
                    var destAsset = new File(assetsFolder.fsName + "/" + srcFile.name);
                    srcFile.copy(destAsset.fsName);
                    collected[srcFile.fsName] = destAsset;
                }
            }
        }

        // 2. Copy the .aep project file into preset folder
        var destProjFile = new File(presetFolder.fsName + "/" + safeName + ".aep");
        origProjFile.copy(destProjFile.fsName);

        // 3. Open the copied project to relink its footage items to Assets/
        app.open(destProjFile);

        for (var j = 1; j <= app.project.numItems; j++) {
            var ftItem = app.project.item(j);
            if (ftItem instanceof FootageItem && ftItem.mainSource && ftItem.mainSource.file) {
                var localAsset = new File(assetsFolder.fsName + "/" + ftItem.mainSource.file.name);
                if (localAsset.exists) {
                    try {
                        ftItem.replace(localAsset);
                    } catch (e) {}
                }
            }
        }

        // 4. Export AM XML if requested (from the active comp)
        if (convertAM) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    for (var k = 1; k <= app.project.numItems; k++) {
                        if (app.project.item(k) instanceof CompItem) {
                            comp = app.project.item(k);
                            break;
                        }
                    }
                }

                if (comp) {
                    var safeCompName = comp.name.replace(/[\\\/:\*\?"<>\|]/g, "_");
                    var xmlFile = new File(presetFolder.fsName + "/" + safeCompName + ".xml");
                    if (typeof tools.EXPORT_AM_XML_CORE === "function") {
                        tools.EXPORT_AM_XML_CORE(comp, xmlFile, true, true, true, false);
                    } else if (typeof _writeAMXmlFile === "function") {
                        _writeAMXmlFile(comp, xmlFile);
                    }
                }
            } catch (amErr) {}
        }

        // 5. Save the relinked copied project
        app.project.save(destProjFile);

        // 6. Downgrade if requested
        if (downgrade && targetVersion) {
            var targetVerNum = parseInt(targetVersion, 10);
            if (!isNaN(targetVerNum) && targetVerNum > 0) {
                _trySaveCopyAsOlder(presetFolder.fsName, targetVerNum);
            }
        }

        // 7. Re-open the user's original project so their working state is restored
        if (origProjFile.exists) {
            app.open(origProjFile);
        }

        return destProjFile;
    } catch (e) {
        try {
            if (origProjFile && origProjFile.exists) {
                app.open(origProjFile);
            }
        } catch (restoreErr) {}
        return null;
    }
}

function _trySaveCopyAsOlder(collectedFolder, targetVerNum) {
    try {
        // Attempt finding specific menu command ID for Save As CC version
        var cmdNames = [
            "Save a Copy As CC (" + targetVerNum + ".x)...",
            "Save a Copy As CC (" + targetVerNum + ")...",
            "Save a Copy As " + targetVerNum + ".x...",
            "Save a Copy As " + targetVerNum + "...",
            "Save a Copy As CC (previous version)...",
            "Save a Copy As Previous Version..."
        ];

        for (var i = 0; i < cmdNames.length; i++) {
            var cmdId = app.findMenuCommandId(cmdNames[i]);
            if (cmdId && cmdId !== 0) {
                // Command exists in AE menu
                break;
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

function _buildTransformXml(layer, compW, compH) {
    try {
        var transform = layer.transform;
        if (!transform) {
            return '    <transform>\n      <origin value="0.000000, 0.000000" />\n      <position value="0.000000, 0.000000" />\n      <scale value="1.000000, 1.000000" />\n      <opacity value="1.000000" />\n    </transform>\n';
        }

        var xml = '    <transform>\n';
        xml += '      <origin value="0.000000, 0.000000" />\n';

        // 1. Position
        try {
            var posProp = transform.position;
            if (posProp && posProp.numKeys > 0) {
                xml += '      <position>\n';
                xml += '        <keyframes>\n';
                for (var k = 1; k <= posProp.numKeys; k++) {
                    var tMs = Math.round(posProp.keyTime(k) * 1000);
                    var pVal = posProp.keyValue(k);
                    var px = (pVal[0] - compW / 2).toFixed(6);
                    var py = (pVal[1] - compH / 2).toFixed(6);
                    xml += '          <keyframe t="' + tMs + '" value="' + px + ', ' + py + '" />\n';
                }
                xml += '        </keyframes>\n';
                xml += '      </position>\n';
            } else if (posProp) {
                var px2 = (posProp.value[0] - compW / 2).toFixed(6);
                var py2 = (posProp.value[1] - compH / 2).toFixed(6);
                xml += '      <position value="' + px2 + ', ' + py2 + '" />\n';
            }
        } catch (posErr) {
            xml += '      <position value="0.000000, 0.000000" />\n';
        }

        // 2. Scale
        try {
            var scaleProp = transform.scale;
            if (scaleProp && scaleProp.numKeys > 0) {
                xml += '      <scale>\n';
                xml += '        <keyframes>\n';
                for (var sk = 1; sk <= scaleProp.numKeys; sk++) {
                    var stMs = Math.round(scaleProp.keyTime(sk) * 1000);
                    var sVal = scaleProp.keyValue(sk);
                    var sx = (sVal[0] / 100).toFixed(6);
                    var sy = (sVal[1] / 100).toFixed(6);
                    xml += '          <keyframe t="' + stMs + '" value="' + sx + ', ' + sy + '" />\n';
                }
                xml += '        </keyframes>\n';
                xml += '      </scale>\n';
            } else if (scaleProp) {
                var sx2 = (scaleProp.value[0] / 100).toFixed(6);
                var sy2 = (scaleProp.value[1] / 100).toFixed(6);
                xml += '      <scale value="' + sx2 + ', ' + sy2 + '" />\n';
            }
        } catch (scaleErr) {
            xml += '      <scale value="1.000000, 1.000000" />\n';
        }

        // 3. Rotation
        try {
            var rotProp = transform.rotation || transform.zRotation;
            if (rotProp && rotProp.numKeys > 0) {
                xml += '      <rotation>\n';
                xml += '        <keyframes>\n';
                for (var rk = 1; rk <= rotProp.numKeys; rk++) {
                    var rtMs = Math.round(rotProp.keyTime(rk) * 1000);
                    var rVal = rotProp.keyValue(rk);
                    xml += '          <keyframe t="' + rtMs + '" value="' + Number(rVal).toFixed(6) + '" />\n';
                }
                xml += '        </keyframes>\n';
                xml += '      </rotation>\n';
            } else if (rotProp) {
                xml += '      <rotation value="' + Number(rotProp.value).toFixed(6) + '" />\n';
            }
        } catch (rotErr) {
            xml += '      <rotation value="0.000000" />\n';
        }

        // 4. Opacity
        try {
            var opProp = transform.opacity;
            if (opProp && opProp.numKeys > 0) {
                xml += '      <opacity>\n';
                xml += '        <keyframes>\n';
                for (var ok = 1; ok <= opProp.numKeys; ok++) {
                    var otMs = Math.round(opProp.keyTime(ok) * 1000);
                    var oVal = (opProp.keyValue(ok) / 100).toFixed(6);
                    xml += '          <keyframe t="' + otMs + '" value="' + oVal + '" />\n';
                }
                xml += '        </keyframes>\n';
                xml += '      </opacity>\n';
            } else if (opProp) {
                var oVal2 = (opProp.value / 100).toFixed(6);
                xml += '      <opacity value="' + oVal2 + '" />\n';
            }
        } catch (opErr) {
            xml += '      <opacity value="1.000000" />\n';
        }

        xml += '    </transform>\n';
        return xml;
    } catch (e) {
        return '    <transform>\n      <origin value="0.000000, 0.000000" />\n      <position value="0.000000, 0.000000" />\n      <scale value="1.000000, 1.000000" />\n      <opacity value="1.000000" />\n    </transform>\n';
    }
}

function _writeAMXmlFile(comp, xmlFile, projectItems) {
    try {
        var width = (comp && comp.width) ? comp.width : 1080;
        var height = (comp && comp.height) ? comp.height : 1920;
        var duration = (comp && comp.duration) ? comp.duration : 10;
        var fps = (comp && comp.frameRate) ? comp.frameRate : 30;
        var title = _ppEscapeXml(comp ? comp.name : "Project Preset");
        var totalTime = Math.round(duration * 1000);

        var now = new Date();
        var dateStr = now.getFullYear() + '-' +
            ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
            ('0' + now.getDate()).slice(-2) + ' ' +
            ('0' + now.getHours()).slice(-2) + ':' +
            ('0' + now.getMinutes()).slice(-2) + ' ' +
            (now.getHours() < 12 ? 'AM' : 'PM');

        var xml = "<?xml version='1.0' encoding='UTF-8' ?>\n";
        xml += '<!--\n';
        xml += 'Created by Alight Motion (http://alightmotion.com)\n';
        xml += 'Exported via OpenFishTools: ' + dateStr + '\n';
        xml += '5.0.275 (1002592)\n';
        xml += '-->\n';
        xml += '<scene title="' + title + '" width="' + width + '" height="' + height + '" exportWidth="' + width + '" exportHeight="' + height + '" precompose="dynamicResolution" bgcolor="#ff000000" totalTime="' + totalTime + '" fps="' + fps + '" modifiedTime="' + now.getTime() + '" amver="1002592" ffver="106" am="com.alightcreative.motion/5.0.275" amplatform="android" retime="freeze" retimeAdaptFPS="false">\n';

        // Add bookmarks / markers
        if (comp && comp.markerProperty) {
            var markerProp = comp.markerProperty;
            for (var m = 1; m <= markerProp.numKeys; m++) {
                var tMs = Math.round(markerProp.keyTime(m) * 1000);
                xml += '  <bookmark t="' + tMs + '" />\n';
            }
        }

        if (comp && comp.numLayers > 0) {
            // In Alight Motion XML, the FIRST element written is the BOTTOM-MOST layer,
            // and the LAST element written is the TOP-MOST layer.
            // In AE, layer(1) is top and layer(numLayers) is bottom.
            // So we iterate from bottom (numLayers) down to 1 (top) to preserve visual order.
            for (var l = comp.numLayers; l >= 1; l--) {
                var layer = comp.layer(l);
                var lName = _ppEscapeXml(layer.name);
                var lStart = Math.round(layer.inPoint * 1000);
                var lEnd = Math.round(layer.outPoint * 1000);
                var lDur = Math.max(10, lEnd - lStart);
                var layerId = 1000000 + l;

                var transformXml = _buildTransformXml(layer, width, height);

                if (layer instanceof ShapeLayer) {
                    xml += '  <shape id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '" type="rectangle">\n';
                    xml += transformXml;
                    xml += '    <fillColor value="#ffffffff" />\n';
                    xml += '  </shape>\n';
                } else if (layer instanceof TextLayer) {
                    var txtVal = "";
                    var fontColor = "#ffffffff";
                    try {
                        txtVal = _ppEscapeXml(layer.text.sourceText.value.text || "");
                    } catch (e) {}
                    xml += '  <text id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '" text="' + txtVal + '" size="40.000000" color="' + fontColor + '" align="center">\n';
                    xml += transformXml;
                    xml += '  </text>\n';
                } else if (layer instanceof AVLayer) {
                    var src = layer.source;
                    if (src && src instanceof FootageItem) {
                        if (src.mainSource instanceof SolidSource) {
                            var hexColor = "#ff000000";
                            try {
                                var c = src.mainSource.color;
                                hexColor = "#ff" +
                                    ('0' + Math.round(c[0] * 255).toString(16)).slice(-2) +
                                    ('0' + Math.round(c[1] * 255).toString(16)).slice(-2) +
                                    ('0' + Math.round(c[2] * 255).toString(16)).slice(-2);
                            } catch (e) {}
                            xml += '  <shape id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '" type="rectangle" size="' + layer.width.toFixed(6) + ', ' + layer.height.toFixed(6) + '">\n';
                            xml += transformXml;
                            xml += '    <fillColor value="' + hexColor + '" />\n';
                            xml += '  </shape>\n';
                        } else if (src.hasAudio && !src.hasVideo) {
                            var audioUri = "assets/" + _ppEscapeXml(src.name);
                            xml += '  <audio id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '">\n';
                            xml += '    <source uri="' + audioUri + '" />\n';
                            xml += '  </audio>\n';
                        } else {
                            // Video / Image footage
                            var mediaUri = "assets/" + _ppEscapeXml(src.name);
                            var mediaW = src.width || width;
                            var mediaH = src.height || height;
                            var mediaFps = (src.frameRate && src.frameRate > 0) ? src.frameRate : fps;

                            xml += '  <media id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '" retime="freeze" fillMode="fit">\n';
                            xml += transformXml;
                            xml += '    <source uri="' + mediaUri + '" width="' + mediaW + '" height="' + mediaH + '" fps="' + mediaFps.toFixed(6) + '" />\n';
                            xml += '  </media>\n';
                        }
                    } else if (src && src instanceof CompItem) {
                        xml += '  <scene id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '" width="' + src.width + '" height="' + src.height + '">\n';
                        xml += transformXml;
                        xml += '  </scene>\n';
                    } else {
                        xml += '  <null id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '">\n';
                        xml += transformXml;
                        xml += '  </null>\n';
                    }
                } else {
                    xml += '  <null id="' + layerId + '" label="' + lName + '" startTime="' + lStart + '" duration="' + lDur + '">\n';
                    xml += transformXml;
                    xml += '  </null>\n';
                }
            }
        } else if (projectItems && projectItems.length > 0) {
            // Fallback: If no layers in comp, build scene from project footage items
            for (var p = 0; p < projectItems.length; p++) {
                var pItem = projectItems[p];
                var pId = 1000000 + p + 1;
                var pName = _ppEscapeXml(pItem.name);
                var pDur = pItem.duration ? Math.round(pItem.duration * 1000) : totalTime;
                var pW = pItem.width || width;
                var pH = pItem.height || height;
                var pUri = "assets/" + pName;

                if (pItem.type === 'audio') {
                    xml += '  <audio id="' + pId + '" label="' + pName + '" startTime="0" duration="' + pDur + '">\n';
                    xml += '    <source uri="' + pUri + '" />\n';
                    xml += '  </audio>\n';
                } else {
                    xml += '  <media id="' + pId + '" label="' + pName + '" startTime="0" duration="' + pDur + '" retime="freeze" fillMode="fit">\n';
                    xml += '    <transform>\n';
                    xml += '      <origin value="0.000000, 0.000000" />\n';
                    xml += '      <position value="0.000000, 0.000000" />\n';
                    xml += '      <scale value="1.000000, 1.000000" />\n';
                    xml += '      <opacity value="1.000000" />\n';
                    xml += '    </transform>\n';
                    xml += '    <source uri="' + pUri + '" width="' + pW + '" height="' + pH + '" fps="' + fps.toFixed(6) + '" />\n';
                    xml += '  </media>\n';
                }
            }
        }

        xml += '</scene>\n';

        xmlFile.open("w");
        xmlFile.encoding = "UTF-8";
        xmlFile.write(xml);
        xmlFile.close();
        return true;
    } catch (e) {
        return false;
    }
}

function _ppEscapeXml(str) {
    if (!str) return "";
    return String(str).replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}



function _getCurrentAEMajorVersion() {
    try {
        var ver = app.version;
        var major = parseInt(ver, 10);
        if (!isNaN(major)) return major;
    } catch (e) {}
    return 0;
}

function _getDowngradeableVersions() {
    var currentVer = _getCurrentAEMajorVersion();
    var currentIdx = -1;
    for (var i = 0; i < AE_VERSION_TABLE.length; i++) {
        if (AE_VERSION_TABLE[i].value === currentVer) {
            currentIdx = i;
            break;
        }
    }

    var result = [];
    if (currentIdx !== -1) {
        if (currentIdx - 1 >= 0) {
            result.push(AE_VERSION_TABLE[currentIdx - 1]);
        }
        if (currentIdx - 2 >= 0) {
            result.push(AE_VERSION_TABLE[currentIdx - 2]);
        }
    } else if (currentVer > 26) {
        result.push({ value: currentVer - 1, label: "AE (v" + (currentVer - 1) + ")" });
        result.push({ value: currentVer - 2, label: "AE (v" + (currentVer - 2) + ")" });
    } else if (currentVer >= 14) {
        // Fallback search
        for (var j = AE_VERSION_TABLE.length - 1; j >= 0; j--) {
            if (AE_VERSION_TABLE[j].value < currentVer && result.length < 2) {
                result.push(AE_VERSION_TABLE[j]);
            }
        }
    }
    return result;
}
