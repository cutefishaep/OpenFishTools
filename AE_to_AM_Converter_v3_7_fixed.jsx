(function() {
    // 1. Validasi Komposisi Aktif
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Peringatan:\nSilakan buka dan pilih Composition yang ingin di-convert terlebih dahulu!");
        return;
    }

    // ================= PROGRESS UI (ScriptUI palette, non-modal) =================
    // Biar gak was-was pas nunggu (proses bake expression & generate XML bisa
    // makan waktu beberapa menit tanpa info apa-apa), tampilkan window kecil
    // berisi status text + progress bar (tanpa log, biar ringan & simpel).
    var progWin = new Window("palette", "AE -> AM Converter - Progress", undefined);
    progWin.orientation = "column";
    progWin.alignChildren = ["fill", "top"];
    progWin.spacing = 8;
    progWin.margins = 16;

    var progStatus = progWin.add("statictext", undefined, "Mempersiapkan...");
    progStatus.preferredSize.width = 420;

    var progBarRow = progWin.add("group");
    progBarRow.orientation = "row";
    progBarRow.alignChildren = ["fill", "center"];
    var progBar = progBarRow.add("progressbar", undefined, 0, 100);
    progBar.preferredSize.width = 360;
    var progPercentText = progBarRow.add("statictext", undefined, "0%");
    progPercentText.preferredSize.width = 40;

    try { progWin.center(); } catch (eCenter) {}
    try { progWin.show(); } catch (eShow) {}

    function setProgress(percent, status) {
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        try { progBar.value = percent; } catch (e1) {}
        try { progPercentText.text = Math.round(percent) + "%"; } catch (e2) {}
        if (status) { try { progStatus.text = status; } catch (e3) {} }
        try { progWin.update(); } catch (e4) {}
    }

    // Log window dihapus sesuai permintaan -- fungsi ini dibiarkan ada
    // (jadi no-op/gak ngapa-ngapain) biar semua pemanggilan logMsg(...) yang
    // udah ada di seluruh script gak perlu dihapus satu-satu satu per satu.
    function logMsg(msg) {}

    logMsg("Comp aktif: \"" + comp.name + "\" (" + comp.width + "x" + comp.height + ")");

    // 2. BAKE semua expression jadi keyframe dulu (rekursif ke semua precomp
    // yang bakal ke-export juga), SEBELUM kita baca keyframe apapun.
    // Soalnya kalau ada property yang digerakkan expression (bukan keyframe
    // manual), script convert ini gak akan lihat animasinya sama sekali --
    // baca .numKeys/.value doang gak akan nangkep hasil expression.
    //
    // PENTING: TIDAK dibungkus satu app.beginUndoGroup() raksasa buat SEMUA
    // properti (bisa 200+ di project besar) -- itu bikin AE numpuk histori
    // undo jadi satu transaksi gede banget, ujung-ujungnya AE freeze/macet
    // di tengah proses (pernah kejadian macet di sekitar properti #108).
    // Sebagai gantinya, undo group dipecah per-batch kecil (~15 properti)
    // di dalam bakeExpressionsInComp, plus purge cache berkala.
    setProgress(0, "Menghitung jumlah expression yang perlu di-bake...");
    var gBakeProgress = { done: 0, total: 0 };
    // Nyimpen daftar properti yang KEYFRAME-nya hasil bake dari expression
    // (bukan keyframe manual asli dari user). Properti yang udah di-bake
    // HARUS pakai interpolasi linear polos pas di-export ke AM -- gak boleh
    // ada easing/graph curve, soalnya baking itu cuma nyampling value per
    // frame dari hasil expression, kurva easing bezier yang AE kasih
    // otomatis pas convert gak merepresentasikan gerakan yang sebenarnya
    // dan bikin bug/gerakan aneh kalau tetep dipertahankan di AM.
    var gBakedPropKeys = {};
    function markPropAsBaked(layer, prop) {
        try {
            var key = layer.containingComp.id + "|" + layer.index + "|" + prop.name;
            gBakedPropKeys[key] = true;
        } catch (eMark) {}
    }
    function isBakedProp(layer, prop) {
        try {
            var key = layer.containingComp.id + "|" + layer.index + "|" + prop.name;
            return !!gBakedPropKeys[key];
        } catch (eCheck) { return false; }
    }
    try {
        gBakeProgress.total = countExpressionPropsRecursive(comp, 0);
    } catch (eCount) { gBakeProgress.total = 0; }
    logMsg("Ditemukan " + gBakeProgress.total + " properti dengan expression yang perlu di-bake.");

    var totalBaked = 0;
    try {
        totalBaked = bakeAllCompsRecursive(comp, 0);
    } catch (eBakeAll) {
        alert("Peringatan: proses bake expression gagal sebagian.\n" + eBakeAll.toString());
    }
    // pastikan fokus balik ke comp utama setelah baking (baking pindah2 viewer
    // ke tiap precomp yang diproses)
    try { comp.openInViewer(); } catch (eFocus) {}

    logMsg("Selesai bake expression: " + totalBaked + " properti berhasil di-bake.");
    setProgress(70, "Menyimpan file XML...");

    // 3. Dialog Menyimpan File XML
    var xmlFile = File.saveDialog("Simpan Project Alight Motion", "Alight Motion XML (*.xml):*.xml");
    if (!xmlFile) { try { progWin.close(); } catch (eClose0) {} return; }

    // ID unik global, supaya precomp yang dipakai berkali-kali / nested tetap
    // dapat id yang beda-beda dan gak collide sama layer di scene lain.
    var idCounter = 1000000;
    function nextId() { return idCounter++; }

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

    // 3. Konversi Beatmarks (Composition Markers) — cuma di scene paling luar
    var markerProp = comp.markerProperty;
    if (markerProp) {
        for (var i = 1; i <= markerProp.numKeys; i++) {
            var tMs = Math.round(markerProp.keyTime(i) * 1000);
            xml += '  <bookmark t="' + tMs + '" />\n';
        }
    }

    // 4. Render semua layer comp aktif (bisa rekursif kalau ada precomp)
    setProgress(75, "Generating XML...");
    logMsg("Mulai generate XML dari layer-layer comp...");
    xml += renderCompLayers(comp, "  ");

    xml += '</scene>\n';

    setProgress(95, "Menulis file XML ke disk...");
    xmlFile.open("w");
    xmlFile.encoding = "UTF-8";
    xmlFile.write(xml);
    xmlFile.close();

    setProgress(100, "Selesai!");
    logMsg("Selesai. File disimpan ke: " + xmlFile.fsName);
    try { $.sleep(400); } catch (eSleepEnd) {}
    try { progWin.close(); } catch (eCloseEnd) {}

    alert("Berhasil!\nExpression di-bake: " + totalBaked + " properti.\nWarna solid & foto/video sudah disamakan (sampling pixel), precompose sudah jadi Group.");

    // ================= BAKE EXPRESSION -> KEYFRAME =================
    // Diadaptasi dari baked.jsx: cari semua property yang punya expression
    // aktif, convert ke keyframe pakai command internal AE, kompres
    // keyframe yang mubazir (diam/lurus), lalu hapus teks expression-nya.
    // Dibuat REKURSIF supaya precomp yang bakal ke-export via <embedScene>
    // juga ke-bake expression-nya, gak cuma comp utama.

    // Hitung total properti berexpression secara REKURSIF (tanpa bake
    // apapun, cuma traversal baca doang -- makanya cepat), dipakai buat
    // dapetin angka total yang akurat sebelum proses bake beneran mulai
    // (biar progress bar persentasenya bener, bukan cuma tebak-tebakan).
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
            try { count += findExpr(lyr); } catch (eF) {}
            try {
                if (lyr.source && (lyr.source instanceof CompItem)) {
                    count += countExpressionPropsRecursive(lyr.source, depth + 1);
                }
            } catch (eN) {}
        }
        return count;
    }

    function bakeAllCompsRecursive(topComp, depth) {
        if (depth > 20) return 0; // jaga2 kalau ada circular precomp (jarang)
        var count = 0;
        try {
            count += bakeExpressionsInComp(topComp);
        } catch (eBakeOne) {}
        for (var i = 1; i <= topComp.numLayers; i++) {
            try {
                var lyr = topComp.layer(i);
                if (lyr.source && (lyr.source instanceof CompItem)) {
                    count += bakeAllCompsRecursive(lyr.source, depth + 1);
                }
            } catch (eNested) {}
        }
        return count;
    }

    function bakeExpressionsInComp(targetComp) {
        try { targetComp.openInViewer(); } catch (eOpen) {}

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
            try { findExpressions(layersToProcess[l], layersToProcess[l]); } catch (eFind) {}
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

        // Undo group dipecah per BATCH_SIZE properti (bukan satu grup raksasa
        // buat semuanya) -- ini kunci fix freeze-nya. Kalau dibungkus satu
        // undo group gede buat 200+ properti, AE numpuk histori undo jadi
        // satu transaksi raksasa dan lama-lama macet total. Dengan batch
        // kecil + purge cache berkala, memori & undo history-nya kejaga.
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
                try { markPropAsBaked(parentLayer, currentProp); } catch (eMarkCall) {}
            } catch (errBake) {
                // dilompati kalau properti tertentu error/terkunci
            }

            currentProp.selected = false;

            // Progress bar di-update TIAP bake (bukan di-throttle lagi) --
            // sekarang aman karena cuma progressbar + statictext doang yang
            // di-redraw (log edittext yang berat udah dihapus), jadi update
            // tiap 1 properti gak nambah beban berarti.
            try {
                if (typeof gBakeProgress !== "undefined") {
                    gBakeProgress.done++;
                    var pct = gBakeProgress.total > 0 ? (gBakeProgress.done / gBakeProgress.total) * 70 : 0;
                    setProgress(pct, "Bake expression: " + gBakeProgress.done + " / " + gBakeProgress.total);
                }
            } catch (eProg) {}

            // Tutup batch undo group tiap BATCH_SIZE properti, purge cache,
            // lalu buka undo group baru buat batch selanjutnya.
            if ((p + 1) % BATCH_SIZE === 0 && p < targetProperties.length - 1) {
                app.endUndoGroup();
                undoGroupOpen = false;
                try { app.purge(PurgeTarget.ALL_CACHES); } catch (ePurge) {}

                batchCounter++;
                // Save project berkala (tiap 3 batch = ~45 properti). Ini
                // BUKAN cuma buat backup -- save project ke disk ternyata
                // "flush" histori/cache internal AE yang numpuk di background
                // walau undo group-nya udah dipecah kecil-kecil. Tanpa ini,
                // makin banyak properti yang udah di-bake dalam satu sesi,
                // makin LAMBAT tiap operasi baru (gejala umum automasi AE
                // dalam jumlah besar) -- keliatan jelas kalau nomor batch-nya
                // makin gede makin lama prosesnya.
                if (batchCounter % 3 === 0) {
                    try {
                        if (app.project.file) {
                            app.project.save();
                            try { logMsg("[Save] Project di-save (flush histori AE)."); } catch (eLogSave) {}
                        }
                    } catch (eSaveProj) {}
                }

                try { $.sleep(30); } catch (eSleep) {} // kasih AE napas dikit
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

    // ================= HELPER FUNCTIONS LAINNYA =================

    // Render seluruh layer dari sebuah CompItem (bisa comp aktif ATAU
    // comp yang jadi source precomp layer) jadi string XML.
    // indent = spasi indentasi biar rapi (opsional, kosmetik doang).
    function renderCompLayers(sourceComp, indent) {
        // id-map LOKAL untuk comp ini doang, key-nya cuma layer.index (Number)
        // — properti paling basic yang pasti ada di semua versi AE, gak perlu
        // comp.name/comp.id/containingComp yang ternyata bikin masalah di CC2017.
        var localIdMap = {};

        // PASS 1: assign id ke semua layer yang akan di-export di comp ini,
        // SEBELUM generate string XML apapun (biar parent="..." selalu benar
        // gak peduli urutan proses di PASS 2).
        try {
            for (var p = 1; p <= sourceComp.layers.length; p++) {
                var pLayer = sourceComp.layers[p];
                if (pLayer.guideLayer || (!pLayer.hasVideo && !pLayer.nullLayer)) continue;
                if (!pLayer.enabled) continue;
                if (pLayer.adjustmentLayer) continue;
                localIdMap[pLayer.index] = nextId();
            }
        } catch (errPass1) {
            alert("GAGAL di PASS 1 (register ID), comp: \"" + sourceComp.name + "\"\nPesan: " + errPass1.toString() + "\nBaris: " + (errPass1.line || "?"));
            throw errPass1;
        }

        function idFor(lyr) {
            if (lyr && localIdMap[lyr.index] !== undefined) return localIdMap[lyr.index];
            return null; // parent di luar comp ini / gak ke-export
        }

        var out = "";
        // PASS 2: generate XML, urutan dibalik (bawah->atas) supaya
        // urutan visual di AM sama dengan urutan layer panel di AE
        for (var l = sourceComp.layers.length; l >= 1; l--) {
            var layer = sourceComp.layers[l];

            if (layer.guideLayer || (!layer.hasVideo && !layer.nullLayer)) continue;

            // Layer yang di-disable (ikon mata dimatikan) di AE -- jangan
            // ikut dikonversi, skip total. Layer ini gak dirender/gak
            // keliatan sama sekali di AE, jadi harus konsisten gak keliatan
            // juga hasilnya di AM (ignore, bukan tetap diekspor).
            if (!layer.enabled) continue;

            // Adjustment Layer di AE itu INVISIBLE secara visual -- dia cuma
            // numpang lewat buat nge-apply effect (Wave Warp, Hue/Sat, dll)
            // ke layer di bawahnya, bukan sesuatu yang dirender langsung.
            // Kalau tetap diekspor, dia jadi kotak SOLID FULL-SCREEN yang
            // keliatan & opaque di AM (nutupin semua footage di bawahnya).
            // Efek AE-nya sendiri juga gak ada yang 1:1 portable ke AM,
            // jadi paling aman: skip total, jangan pernah dijadikan shape.
            if (layer.adjustmentLayer) continue;

            try {
                out += renderSingleLayer(sourceComp, layer, indent, idFor);
                try {
                    if (typeof gXmlLogCounter === "undefined") { gXmlLogCounter = 0; }
                    gXmlLogCounter++;
                    if (gXmlLogCounter % 5 === 0) {
                        logMsg("[XML] " + sourceComp.name + " :: " + layer.name);
                    }
                } catch (eLogL) {}
            } catch (errLayer) {
                alert("GAGAL di layer: \"" + layer.name + "\" (comp: \"" + sourceComp.name +
                      "\")\nPesan: " + errLayer.toString() +
                      "\nBaris asli dalam kode: " + (errLayer.line || "?"));
                throw errLayer;
            }
        }
        return out;
    }

    // Deteksi efek "Motion Tile" (matchName resmi AE: "ADBE Tile") di layer,
    // dan convert jadi efek com.alightcreative.effects.tile di AM.
    // "mirror" WAJIB selalu true kalau Motion Tile terdeteksi (sesuai
    // permintaan), scale/phase diambil dari parameter asli AE-nya.
    function getMotionTileEffectXML(layer, indent) {
        var out = "";
        try {
            var fx = layer.Effects;
            if (!fx) return out;
            for (var e = 1; e <= fx.numProperties; e++) {
                var eff = fx.property(e);
                if (!eff || !eff.enabled) continue;
                var matchName = "";
                try { matchName = eff.matchName; } catch (eMn) {}
                if (matchName !== "ADBE Tile") continue;

                // Param resmi Motion Tile (urutan tetap di AE):
                // 1 Tile Center, 2 Tile Width, 3 Tile Height,
                // 4 Output Width, 5 Output Height, 6 Mirror Edges,
                // 7 Phase, 8 Horizontal Phase Shift
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
                // WAJIB true, terlepas dari status checkbox "Mirror Edges" di AE
                out += indent + '  <property name="mirror" type="bool" value="true" />\n';
                out += indent + '  <property name="vertoffs" type="bool" value="false" />\n';
                out += indent + '  <property name="angle" type="float" value="0.000000" />\n';
                out += indent + '</effect>\n';
            }
        } catch (eAll) {}
        return out;
    }

    // Deteksi Motion Blur AE. Di AE, motion blur cuma keliatan/aktif
    // kalau DUA switch nyala bareng: switch Motion Blur per-layer (ikon
    // di panel Layer) DAN switch "Enable Motion Blur" di level komposisi
    // (ikon toggle global di atas timeline). Kalau salah satu mati,
    // secara efektif blur-nya gak dirender AE -- jadi dua-duanya wajib
    // dicek. Setting efeknya WAJIB sama persis kayak contoh yang diminta:
    // tune=0.8, usePos/useScale/useAngle semuanya true.
    function getMotionBlurEffectXML(layer, comp, indent) {
        var out = "";
        try {
            var layerMB = false;
            try { layerMB = layer.motionBlur; } catch (eLmb) {}
            var compMB = false;
            try { compMB = comp.motionBlur; } catch (eCmb) {}

            if (layerMB && compMB) {
                out += indent + '<effect id="com.alightcreative.effects.motionblur4" locallyApplied="true">\n';
                out += indent + '  <property name="tune" type="float" value="0.800000" />\n';
                out += indent + '  <property name="usePos" type="bool" value="true" />\n';
                out += indent + '  <property name="useScale" type="bool" value="true" />\n';
                out += indent + '  <property name="useAngle" type="bool" value="true" />\n';
                out += indent + '</effect>\n';
            }
        } catch (eAll) {}
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
            try {
                isPrecomp = (layer.source && (layer.source instanceof CompItem));
            } catch (eSrc) {
                isPrecomp = false;
            }

            var out = "";

            if (isPrecomp) {
                // --- PRECOMPOSE -> <embedScene> (Group) ---
                var srcComp = layer.source;
                var precompTotalMs = Math.round(srcComp.duration * 1000);

                out += indent + '<embedScene id="' + layerId + '" label="' + label + '" startTime="' + startTime + '" endTime="' + endTime + '" fillType="intrinsic" outTime="' + precompTotalMs + '"' + parentStr + ' mediaFillMode="fill">\n';
                out += indent + '  <transform>\n';
                out += getTransformXML(layer);
                out += indent + '  </transform>\n';
                out += getMotionTileEffectXML(layer, indent + "  ");
                out += getMotionBlurEffectXML(layer, sourceComp, indent + "  ");
                out += indent + '  <scene title="' + escapeXml(srcComp.name) + '" width="' + srcComp.width + '" height="' + srcComp.height + '" exportWidth="' + srcComp.width + '" exportHeight="' + srcComp.height + '" precompose="dynamicResolution" bgcolor="#00000000" totalTime="' + precompTotalMs + '" fps="' + srcComp.frameRate + '" modifiedTime="0" amver="1002592" ffver="106" am="com.alightcreative.motion/5.0.275" amplatform="android" retime="off" retimeAdaptFPS="false">\n';
                // rekursif: render isi precomp-nya, layer-layer di dalamnya
                // pakai koordinat/waktu RELATIF ke precomp itu sendiri
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

                // Cek apakah ada mask aktif menggunakan ADBE Mask Parade (nama internal AE resmi)
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
                } catch(e) {}

                var sizeW = layerW / 2;
                var sizeH = layerH / 2;

                // Cek apakah ini footage ASLI (foto/video ###.jpg, ###.png, dst),
                // BUKAN Solid biasa. Kalau iya -> ekspor sebagai fillType="media"
                // (pakai placeholder foto bawaan AM yang bisa langsung di-tap
                // ganti sama foto/video asli di app), bukan kotak warna solid.
                var isRealMedia = false;
                try {
                    if (layer.source && layer.source.mainSource &&
                        !(layer.source.mainSource instanceof SolidSource)) {
                        isRealMedia = true;
                    }
                } catch (eMediaChk) {}

                var fillColorHex = isRealMedia ? "" : getLayerFillColor(sourceComp, layer);

                if (isRealMedia) {
                    // Ambil nama file SOURCE asli (bukan nama layer yang bisa
                    // aja udah di-rename manual di panel Layer AE), biar label
                    // & placeholder exact match sama file aslinya di project AE.
                    var sourceFileName = layer.name;
                    try {
                        if (layer.source && layer.source.name) sourceFileName = layer.source.name;
                    } catch (eSrcName) {}
                    var mediaLabel = escapeXml(sourceFileName);
                    // Token aman buat query string: buang ekstensi, ganti karakter
                    // non alfanumerik jadi underscore (spasi, titik, dsb).
                    var sampleToken = String(sourceFileName)
                        .replace(/\.[a-zA-Z0-9]+$/, '')
                        .replace(/[^a-zA-Z0-9_-]+/g, '_');
                    if (!sampleToken) sampleToken = 'photo';

                    out += indent + '<shape id="' + layerId + '" label="' + mediaLabel + '" startTime="' + startTime + '" endTime="' + endTime + '"' + parentStr + ' fillType="media" fillImage="sample:' + sampleToken + '?w=' + Math.round(layerW) + '&amp;h=' + Math.round(layerH) + '" mediaFillMode="fill" s=".rect">\n';
                } else {
                    out += indent + '<shape id="' + layerId + '" label="' + label + '" startTime="' + startTime + '" endTime="' + endTime + '"' + parentStr + ' fillType="color" mediaFillMode="fill" s=".rect">\n';
                }


                if (hasMask && firstMask) {
                    var t = 0; // Waktu static sample
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

                    // Anchor point
                    var anchor = [layerW / 2, layerH / 2];
                    try { anchor = layer.property("Anchor Point").valueAtTime(t, false); } catch (e) {}

                    // Wipe values
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
                    // Ambil nilai scale untuk mengompensasi pergeseran visual pivot di AM (visual_offset = pivot * scale)
                    var scaleX = 1.0;
                    var scaleY = 1.0;
                    try {
                        var sVal = layer.property("Scale").valueAtTime(t, false);
                        scaleX = sVal[0] / 100;
                        scaleY = sVal[1] / 100;
                    } catch(e) {}

                    // Transform block dengan pivot, scale, dan opacity
                    out += indent + '  <transform>\n';
                    try { out += getPositionXML(layer); } catch(e) {}
                    if (Math.abs(pivotAM_X) > 0.5 || Math.abs(pivotAM_Y) > 0.5) {
                        out += indent + '    <pivot value="' + pivotAM_X.toFixed(6) + ',' + pivotAM_Y.toFixed(6) + '" />\n';
                    }
                    try { out += getScaleXML(layer); } catch(e) {}
                    var rot = 0;
                    try { rot = layer.property("Rotation").valueAtTime(t, false); } catch (e) {}
                    if (rot !== 0) {
                        out += indent + '    <rotation value="' + rot.toFixed(6) + '" />\n';
                    }
                    try { out += getOpacityXML(layer); } catch(e) {}
                    out += indent + '  </transform>\n';
                    if (!isRealMedia) {
                        out += indent + '  <fillColor value="' + fillColorHex + '" />\n';
                    }
                    out += getMotionTileEffectXML(layer, indent + "  ");
                    out += getMotionBlurEffectXML(layer, sourceComp, indent + "  ");

                    // Tambahkan Wipe Effect 1 & 2
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
                    // Normal behavior tanpa mask
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

    // ================= AMBIL WARNA ASLI LAYER =================
    // Kalau Solid biasa -> ambil warna sebenarnya dari Source Settings.
    // Kalau footage/foto/video asli (bukan solid) -> "colek" pixel di
    // titik tengah layer itu pakai expression sampleImage() bawaan AE
    // (PURE ExtendScript, gak butuh proses eksternal/PowerShell apapun,
    // jalan di Windows & Mac).
    // Kalau semua gagal -> fallback abu-abu seperti sebelumnya.
    function toHex2(v) {
        var val = Math.round(Math.max(0, Math.min(1, v)) * 255);
        var h = val.toString(16).toUpperCase();
        return (h.length < 2 ? "0" : "") + h;
    }

    function getLayerFillColor(comp, layer) {
        var FALLBACK = "#ff888888";
        try {
            if (layer.source && layer.source.mainSource &&
                (layer.source.mainSource instanceof SolidSource)) {
                // Solid asli -> ambil warna sebenarnya, bukan gray
                var col = layer.source.mainSource.color; // [r,g,b] 0..1
                return "#ff" + toHex2(col[0]) + toHex2(col[1]) + toHex2(col[2]);
            }
        } catch (eSolid) {}

        // Bukan solid (foto/video) -> coba sampling pixel titik tengah
        try {
            var sampled = samplePixelColorAtCenter(comp, layer);
            if (sampled) return sampled;
        } catch (eSample) {}

        return FALLBACK;
    }

    function samplePixelColorAtCenter(comp, layer) {
        // Teknik ini PURE ExtendScript, TANPA proses eksternal apapun
        // (nggak butuh PowerShell/system.callSystem, jalan di Windows & Mac):
        //
        // Tempel sementara effect "Color Control" (effect bawaan AE, cuma
        // nampung 1 nilai Color) ke layer target, isi property Color-nya
        // dengan expression sampleImage() -- fungsi expression AE resmi
        // buat mengambil warna pixel dari sebuah layer di titik & waktu
        // tertentu. Baca hasil expression itu lewat ExtendScript
        // (valueAtTime), lalu buang lagi effect sementara itu.

        var t = (layer.inPoint + layer.outPoint) / 2;
        if (t < 0) t = 0;
        var maxT = comp.duration - (1 / comp.frameRate);
        if (t > maxT) t = maxT;

        // titik tengah bounding box, DALAM KOORDINAT LAYER SENDIRI --
        // sampleImage() minta point dalam ruang koordinat layer itu sendiri
        // (bukan koordinat comp), jadi gak perlu konversi posisi/anchor.
        var rect = layer.sourceRectAtTime(t, false);
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var fx = null;
        try {
            fx = layer.Effects.addProperty("ADBE Color Control");
        } catch (eAdd) {
            return null; // effect gak ketemu / gagal ditambah (jarang terjadi)
        }

        var result = null;
        try {
            var colorProp = fx.property(1); // param pertama & satu2nya = Color
            colorProp.expression =
                'sampleImage([' + cx.toFixed(3) + ',' + cy.toFixed(3) + '], [1,1], true, ' + t.toFixed(6) + ');';
            // valueAtTime(t, false) -> false = ambil hasil SETELAH expression dievaluasi
            var val = colorProp.valueAtTime(t, false); // [r,g,b,a] masing2 0..1
            if (val && val.length >= 3) result = val;
        } catch (eExpr) {
            result = null;
        }

        // buang effect sementara ini, apapun hasilnya
        try { fx.remove(); } catch (eRemove) {}

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

    // PENTING: hasil percobaan empiris di Alight Motion menunjukkan
    // rumus render-nya adalah:  ukuran_akhir = size * scale * 2
    // (size disimpan sebagai "setengah" ukuran akhir / semacam radius
    // dari titik tengah, bukan lebar/tinggi penuh).
    // Makanya di sini kita BAGI 2 dulu ukuran fisik layer, supaya nanti
    // dikali scale*2 oleh AM, hasilnya balik ke ukuran yang benar.
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
            } catch (err) {}
        }
        if (size.w <= 0) size.w = 100;
        if (size.h <= 0) size.h = 100;

        // Bagi 2 sesuai temuan formula size*scale*2 di Alight Motion
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

    // AE ngebolehin keyframe ditaruh di LUAR rentang aktif layer (sebelum
    // inPoint / sesudah outPoint), sedangkan AM gak punya konsep ini --
    // waktu kf di AM cuma bisa 0.0-1.0 relatif ke rentang aktif layer.
    // Sesuai permintaan: keyframe yang di luar rentang aktif layer DIBUANG
    // total, gak usah dikonversi/disisipkan sama sekali -- cuma keyframe
    // yang beneran ada di dalam rentang [inPoint, outPoint] yang dipakai.
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

        // Kalau ternyata SEMUA keyframe ada di luar rentang (kasus ekstrem),
        // minimal tetap kasih 1 titik biar tag animasi gak kosong/error --
        // dipakai value di titik inPoint.
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

            // dukung value scalar (rotation/opacity) MAUPUN array (position/scale)
            var v0raw = prop.keyValue(keyIndex - 1);
            var v1raw = prop.keyValue(keyIndex);
            var v0 = (v0raw instanceof Array) ? v0raw[0] : v0raw;
            var v1 = (v1raw instanceof Array) ? v1raw[0] : v1raw;
            var dv = v1 - v0;

            var outEase = prop.keyOutTemporalEase(keyIndex - 1)[0];
            var inEase = prop.keyInTemporalEase(keyIndex)[0];

            var x1, y1, x2, y2;
            if (dv === 0 || dt === 0) {
                // value gak berubah -> gak ada cara ukur speed jadi overshoot,
                // pakai kurva ease standar yang aman (gak overshoot)
                x1 = 0.333; y1 = 0.333; x2 = 0.667; y2 = 0.667;
            } else {
                // Rumus konversi influence+speed (AE) -> titik kontrol cubic
                // Bezier (Alight Motion). PENTING: y1/y2 SENGAJA GAK di-clamp
                // ke 0..1 -- justru kalau speed-nya besar, y1/y2 akan lewat
                // dari 0..1, dan itu PERSIS yang menciptakan efek overshoot /
                // anticipation di kurva. Clamp di sini = matiin overshoot.
                x1 = outEase.influence / 100;
                y1 = (outEase.speed * dt) / (3 * dv);
                x2 = 1 - (inEase.influence / 100);
                y2 = 1 - ((inEase.speed * dt) / (3 * dv));
            }

            // x1/x2 (sumbu waktu) WAJIB tetap 0..1, itu syarat valid cubic
            // bezier buat parameter waktu -- ini beda dari y1/y2 di atas.
            x1 = Math.max(0, Math.min(1, x1));
            x2 = Math.max(0, Math.min(1, x2));

            return ' e="cubicBezier ' + x1.toFixed(4) + ' ' + y1.toFixed(4) + ' ' + x2.toFixed(4) + ' ' + y2.toFixed(4) + '"';
        } catch (e) {
            return "";
        }
    }

    // Cari nomor keyframe (1-based) di properti `prop` yang waktunya == t
    function findKeyIndexAtTime(prop, t) {
        for (var k = 1; k <= prop.numKeys; k++) {
            if (Math.abs(prop.keyTime(k) - t) < 0.001) return k;
        }
        return -1;
    }

    // Kalau keyOutInterpolationType keyframe ini == HOLD (di AE ini yang
    // bentuknya KOTAK di timeline -- value nahan/gak interpolasi sampai
    // keyframe berikutnya, baru lompat instan), AM gak punya konsep hold
    // asli. Disimulasikan: sisipkan SATU keyframe tambahan (value SAMA
    // dengan keyframe saat ini) tepat 1 FRAME sebelum keyframe berikutnya.
    // Hasilnya: value flat/nahan dari keyframe ini sampai 1 frame sebelum
    // keyframe selanjutnya, terus di frame terakhir itu baru lompat ke
    // value baru -- persis efek "kotak" hold di AE, cuma dibungkus jadi
    // 2 titik interpolasi linear yang rapat.
    function getHoldPlateauXML(prop, keyIndex, currentValueStr, nextTimeNorm, currentTimeNorm, layer) {
        if (keyIndex === -1) return "";
        try {
            if (prop.keyOutInterpolationType(keyIndex) !== KeyframeInterpolationType.HOLD) return "";
        } catch (e) {
            return "";
        }

        // 1 frame asli (dalam detik) dikonversi ke fraksi normalisasi
        // relatif ke durasi aktif layer (sama seperti getNormalizedTime).
        var oneFrameNorm = 0.0005; // fallback kalau frameRate/duration gak ke-baca
        try {
            var fps = layer.containingComp.frameRate;
            var layerDurationSec = layer.outPoint - layer.inPoint;
            if (fps > 0 && layerDurationSec > 0) {
                oneFrameNorm = (1 / fps) / layerDurationSec;
            }
        } catch (eFps) {}

        var plateauT = nextTimeNorm - oneFrameNorm;
        if (plateauT < currentTimeNorm) plateauT = currentTimeNorm;
        return '        <kf t="' + plateauT.toFixed(6) + '" v="' + currentValueStr + '" />\n';
    }

    function getTransformXML(layer) {
        var tXml = "";
        try {
            tXml += getPositionXML(layer);
        } catch (e1) {
            throw new Error("Gagal di getPositionXML untuk layer \"" + layer.name + "\": " + e1.toString() + " (baris " + e1.line + ")");
        }

        // Tulis pivot HANYA jika Anchor Point asli di AE digeser dari tengah.
        // PENTING: mask TIDAK menentukan pivot/titik rotasi di AE -- itu murni
        // fungsi dari Anchor Point. Mask cuma crop tampilan, jadi kalau pivot
        // ikut dipindah ke tengah mask, rotasi/oscillate jadi berputar di
        // titik yang salah dan makin lama makin melenceng posisinya.
        try {
            var layerW = 100, layerH = 100;
            if (layer.width !== undefined && layer.height !== undefined) {
                layerW = layer.width;
                layerH = layer.height;
            } else if (layer.source && layer.source.width) {
                layerW = layer.source.width;
                layerH = layer.source.height;
            }

            var anchor = [layerW / 2, layerH / 2];
            try { anchor = layer.property("Anchor Point").valueAtTime(0, false); } catch(e) {}

            var hasCustomAnchor = (Math.abs(anchor[0] - layerW / 2) > 0.5 || Math.abs(anchor[1] - layerH / 2) > 0.5);

            if (!layer.nullLayer && hasCustomAnchor) {
                var pivotAM_X = anchor[0] - layerW / 2;
                var pivotAM_Y = anchor[1] - layerH / 2;
                if (Math.abs(pivotAM_X) > 0.5 || Math.abs(pivotAM_Y) > 0.5) {
                    tXml += '      <pivot value="' + pivotAM_X.toFixed(6) + ',' + pivotAM_Y.toFixed(6) + '" />\n';
                }
            }
        } catch(ePivot) {}

        try {
            tXml += getScaleXML(layer);
        } catch (e2) {
            throw new Error("Gagal di getScaleXML untuk layer \"" + layer.name + "\": " + e2.toString() + " (baris " + e2.line + ")");
        }
        try {
            tXml += getRotationXML(layer);
        } catch (e3) {
            throw new Error("Gagal di getRotationXML untuk layer \"" + layer.name + "\": " + e3.toString() + " (baris " + e3.line + ")");
        }
        try {
            tXml += getOpacityXML(layer);
        } catch (e4) {
            throw new Error("Gagal di getOpacityXML untuk layer \"" + layer.name + "\": " + e4.toString() + " (baris " + e4.line + ")");
        }
        return tXml;
    }

    function getPositionXML(layer) {
        var posProp = layer.transform.position;
        var isSeparated = posProp.dimensionsSeparated;
        var isAnimated = isSeparated ? (layer.transform.xPosition.numKeys > 0 || layer.transform.yPosition.numKeys > 0) : (posProp.numKeys > 0);

        var hasParent = (layer.parent !== null);
        var isNull = (layer.nullLayer === true);

        // Dimensi layer
        var layerW = 100, layerH = 100;
        if (layer.width !== undefined && layer.height !== undefined) {
            layerW = layer.width;
            layerH = layer.height;
        } else if (layer.source && layer.source.width) {
            layerW = layer.source.width;
            layerH = layer.source.height;
        }

        var anchor = [layerW / 2, layerH / 2];
        try { anchor = layer.property("Anchor Point").valueAtTime(0, false); } catch(e) {}

        // Null layer sengaja TIDAK pernah dapat <pivot> tertulis (lihat
        // getTransformXML) -- jadi Anchor Point custom-nya (kalau ada) harus
        // diabaikan total di sini juga. Kalau tidak, posisi Null bakal
        // tetap kegeser tanpa ada <pivot> yang menahan/mengompensasi
        // (bug yang pernah bikin Null kegeser +50,+50 dari posisi aslinya).
        if (isNull) { anchor = [layerW / 2, layerH / 2]; }

        // Pivot HANYA dari Anchor Point asli -- mask tidak pernah menentukan
        // titik pivot/rotasi (lihat catatan di getTransformXML).
        var hasCustomAnchor = (Math.abs(anchor[0] - layerW / 2) > 0.5 || Math.abs(anchor[1] - layerH / 2) > 0.5);
        var usePivot = hasCustomAnchor;

        var targetCenterX = hasCustomAnchor ? anchor[0] : layerW / 2;
        var targetCenterY = hasCustomAnchor ? anchor[1] : layerH / 2;

        var processPosition = function(val, t) {
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
            return '      <location value="' + processPosition(val, 0) + '" />\n';
        } else {
            var xml = '      <location>\n';
            var keyTimes = [];
            if (isSeparated) {
                var xProp = layer.transform.xPosition;
                var yProp = layer.transform.yPosition;
                var timesMap = {};
                for (var k = 1; k <= xProp.numKeys; k++) timesMap[xProp.keyTime(k).toFixed(4)] = xProp.keyTime(k);
                for (var k = 1; k <= yProp.numKeys; k++) timesMap[yProp.keyTime(k).toFixed(4)] = yProp.keyTime(k);
                for (var key in timesMap) keyTimes.push(timesMap[key]);
                keyTimes.sort(function(a, b){ return a - b; });
            } else {
                for (var k = 1; k <= posProp.numKeys; k++) {
                    keyTimes.push(posProp.keyTime(k));
                }
            }

            keyTimes = clampKeyTimesToLayerRange(keyTimes, layer);

            for (var i = 0; i < keyTimes.length; i++) {
                var t = keyTimes[i];
                var xVal = isSeparated ? layer.transform.xPosition.valueAtTime(t, true) : posProp.valueAtTime(t, true)[0];
                var yVal = isSeparated ? layer.transform.yPosition.valueAtTime(t, true) : posProp.valueAtTime(t, true)[1];
                var processed = processPosition([xVal, yVal], t);
                var normTimeNum = getNormalizedTime(t, layer);
                var normTime = normTimeNum.toFixed(6);
                var easeStr = "";

                if (i > 0) {
                    if (isSeparated) {
                        if (isBakedProp(layer, layer.transform.xPosition) || isBakedProp(layer, layer.transform.yPosition)) {
                            easeStr = ""; // baked -> linear polos, jangan pakai graph/easing
                        } else {
                            var easeX = "", easeY = "";
                            var kx = findKeyIndexAtTime(layer.transform.xPosition, t);
                            var ky = findKeyIndexAtTime(layer.transform.yPosition, t);
                            if (kx !== -1) easeX = getEaseString(layer.transform.xPosition, kx);
                            if (ky !== -1) easeY = getEaseString(layer.transform.yPosition, ky);
                            easeStr = easeX || easeY || ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                        }
                    } else if (isBakedProp(layer, posProp)) {
                        easeStr = ""; // baked -> linear polos, jangan pakai graph/easing
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
    }




    function getScaleXML(layer) {
        var scaleProp = layer.transform.scale;
        var isSeparated = false;
        try { isSeparated = scaleProp.dimensionsSeparated; } catch (eSep) {}

        var xProp = null, yProp = null;
        if (isSeparated) {
            try {
                // Setelah "Separate Dimensions" di-klik di AE, Scale gabungan
                // ilang dari tree, diganti "X Scale"/"Y Scale" langsung di
                // bawah Transform group -- diakses lewat nama property-nya.
                xProp = layer.transform.property("X Scale");
                yProp = layer.transform.property("Y Scale");
                if (!xProp || !yProp) isSeparated = false;
            } catch (eXY) {
                isSeparated = false; // fallback aman kalau nama beda (locale dll)
            }
        }

        var processScale = function(xv, yv) {
            return (xv / 100).toFixed(6) + ',' + (yv / 100).toFixed(6);
        };

        var isAnimated = isSeparated
            ? ((xProp.numKeys > 0) || (yProp.numKeys > 0))
            : (scaleProp.numKeys > 0);

        if (!isAnimated) {
            var xv, yv;
            if (isSeparated) {
                xv = xProp.value; yv = yProp.value;
            } else {
                var val = scaleProp.value;
                xv = val[0]; yv = val[1];
            }
            return '      <scale value="' + processScale(xv, yv) + '" />\n';
        }

        var xml = '      <scale>\n';
        var keyTimes = [];
        if (isSeparated) {
            var timesMap = {};
            for (var k = 1; k <= xProp.numKeys; k++) timesMap[xProp.keyTime(k).toFixed(4)] = xProp.keyTime(k);
            for (var k2 = 1; k2 <= yProp.numKeys; k2++) timesMap[yProp.keyTime(k2).toFixed(4)] = yProp.keyTime(k2);
            for (var key in timesMap) keyTimes.push(timesMap[key]);
            keyTimes.sort(function (a, b) { return a - b; });
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
                        easeStr = ""; // baked -> linear polos, jangan pakai graph/easing
                    } else {
                        var easeX = "", easeY = "";
                        var kx = findKeyIndexAtTime(xProp, t);
                        var ky = findKeyIndexAtTime(yProp, t);
                        if (kx !== -1) easeX = getEaseString(xProp, kx);
                        if (ky !== -1) easeY = getEaseString(yProp, ky);
                        easeStr = easeX || easeY || ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                    }
                } else if (isBakedProp(layer, scaleProp)) {
                    easeStr = ""; // baked -> linear polos, jangan pakai graph/easing
                } else {
                    var keyIndex = findKeyIndexAtTime(scaleProp, t);
                    easeStr = (keyIndex !== -1) ? getEaseString(scaleProp, keyIndex) : ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                }
            }
            xml += '        <kf t="' + normTime + '" v="' + processed + '"' + easeStr + ' />\n';

            // FIX Hold Keyframe untuk Scale non-separated (sama seperti Position)
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
        var processRotation = function(val) {
            return val.toFixed(6);
        };
        return exportPropertyToXML(rotProp, 'rotation', isAnimated, processRotation, layer);
    }

    function getOpacityXML(layer) {
        var opProp = layer.transform.opacity;
        var isAnimated = opProp.numKeys > 0;
        var processOpacity = function(val) {
            return (val/100).toFixed(6);
        };
        return exportPropertyToXML(opProp, 'opacity', isAnimated, processOpacity, layer);
    }

    function exportPropertyToXML(prop, name, isAnimated, processValueFn, layer) {
        if (!isAnimated) {
            var val = prop.value;
            var processed = processValueFn(val);
            return '      <' + name + ' value="' + processed + '" />\n';
        } else {
            var xml = '      <' + name + '>\n';
            var keyTimes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                keyTimes.push(prop.keyTime(k));
            }
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
                        easeStr = ""; // baked -> linear polos, jangan pakai graph/easing
                    } else {
                        easeStr = (keyIndex !== -1) ? getEaseString(prop, keyIndex) : ' e="cubicBezier 0.333 0.0 0.666 1.0"';
                    }
                }
                xml += '        <kf t="' + normTime + '" v="' + processed + '"' + easeStr + ' />\n';

                // --- FIX Hold Keyframe (scale / rotation / opacity) ---
                if (i < keyTimes.length - 1) {
                    var nextNorm = getNormalizedTime(keyTimes[i + 1], layer);
                    xml += getHoldPlateauXML(prop, keyIndex, processed, nextNorm, normTimeNum, layer);
                }
            }
            xml += '      </' + name + '>\n';
            return xml;
        }
    }
})();
