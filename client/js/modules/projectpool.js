'use strict';

window.ProjectPoolModule = (function () {
    var _convertAM = false;
    var _downgrade = false;
    var _targetVersion = '';
    var _saveLocation = '';
    var _projectName = '';
    var _mediaItems = [];
    var _currentFilter = 'all';
    var _searchQuery = '';

    function _loadSettings() {
        if (!window.FileStore) return;
        var saved = FileStore.get('projectpool');
        if (!saved) return;
        if (typeof saved.convertAM !== 'undefined') _convertAM = !!saved.convertAM;
        if (typeof saved.downgrade !== 'undefined') _downgrade = !!saved.downgrade;
        if (typeof saved.targetVersion !== 'undefined') _targetVersion = String(saved.targetVersion);
        if (typeof saved.saveLocation !== 'undefined') _saveLocation = saved.saveLocation;
        if (typeof saved.projectName !== 'undefined') _projectName = saved.projectName;
    }

    function _saveSettings() {
        if (!window.FileStore) return;
        FileStore.set('projectpool', {
            convertAM: _convertAM,
            downgrade: _downgrade,
            targetVersion: _targetVersion,
            saveLocation: _saveLocation,
            projectName: _projectName
        });
    }

    function _applyUI() {
        var convertEl = document.getElementById('pp-convert-am');
        var downgradeEl = document.getElementById('pp-downgrade');
        var locEl = document.getElementById('pp-save-location');
        var nameEl = document.getElementById('pp-project-name');
        var downgradeOpts = document.getElementById('pp-downgrade-options');

        if (convertEl) convertEl.checked = _convertAM;
        if (downgradeEl) downgradeEl.checked = _downgrade;
        if (locEl && _saveLocation) locEl.value = _saveLocation;
        if (nameEl && _projectName) nameEl.value = _projectName;
        if (downgradeOpts) downgradeOpts.style.display = _downgrade ? 'block' : 'none';
    }

    function _esExec(script, callback) {
        if (!window.csInterface) {
            if (callback) callback(null);
            return;
        }
        try {
            csInterface.evalScript(script, function (res) {
                if (callback) callback(res);
            });
        } catch (e) {
            console.error("ProjectPool evalScript error:", e);
            if (callback) callback(null);
        }
    }

    function _fetchProjectInfo() {
        _esExec('FishTools.PP_GET_PROJECT_INFO()', function (result) {
            if (!result) return;
            try {
                var info = JSON.parse(result);
                if (info && info.hasProject) {
                    var nameEl = document.getElementById('pp-project-name');
                    var locEl = document.getElementById('pp-save-location');
                    if (nameEl && (!nameEl.value || !nameEl.value.trim())) {
                        nameEl.value = info.projectName || 'My Project';
                        _projectName = nameEl.value;
                    }
                    if (locEl && (!locEl.value || !locEl.value.trim()) && info.projectFolder) {
                        locEl.value = info.projectFolder;
                        _saveLocation = info.projectFolder;
                    }
                    _saveSettings();
                }
            } catch (e) {}
        });
    }

    function _syncCustomSelect(id) {
        var el = document.getElementById(id);
        if (!el) return;
        try {
            el.dispatchEvent(new Event('refresh'));
        } catch (e) {}

        var container = document.getElementById('container-' + id) ||
            (el.parentElement && el.parentElement.classList.contains('custom-select-container') ? el.parentElement : null);
        if (!container) return;

        var trigger = container.querySelector('.custom-select-trigger span');
        if (trigger) {
            var _idx = el.selectedIndex;
            trigger.textContent = (_idx >= 0 && el.options[_idx]) ? el.options[_idx].text : (el.value || 'Select...');
        }

        var allOpts = container.querySelectorAll('.custom-select-option');
        var currentVal = el.value;
        var optEls = Array.from(el.options);
        allOpts.forEach(function (optEl, i) {
            var nativeOpt = optEls[i];
            optEl.classList.toggle('selected', !!(nativeOpt && nativeOpt.value === currentVal));
        });
    }

    function _loadVersions() {
        var versionEl = document.getElementById('pp-target-version');
        if (!versionEl) return;

        versionEl.innerHTML = '<option value="">Loading versions...</option>';
        _syncCustomSelect('pp-target-version');

        _esExec('FishTools.PP_GET_VERSIONS()', function (result) {
            var data;
            try {
                data = JSON.parse(result);
            } catch (e) {
                console.error("ProjectPool: PP_GET_VERSIONS parse error:", e, "raw:", result);
                data = null;
            }

            if (!data || !data.versions) {
                versionEl.innerHTML = '<option value="">Failed to detect versions</option>';
                _syncCustomSelect('pp-target-version');
                return;
            }

            var versions = data.versions;
            versionEl.innerHTML = '';

            if (versions.length === 0) {
                var opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No downgrade available (AE v' + (data.current || '?') + ')';
                versionEl.appendChild(opt);
                _targetVersion = '';
                _syncCustomSelect('pp-target-version');
                return;
            }

            var matchedIndex = -1;
            for (var i = 0; i < versions.length; i++) {
                var o = document.createElement('option');
                var valStr = String(versions[i].value);
                o.value = valStr;
                o.textContent = versions[i].label;
                if (_targetVersion && valStr === _targetVersion) {
                    matchedIndex = i;
                }
                versionEl.appendChild(o);
            }

            if (matchedIndex !== -1) {
                versionEl.selectedIndex = matchedIndex;
            } else {
                versionEl.selectedIndex = 0;
                _targetVersion = versionEl.value;
            }
            _syncCustomSelect('pp-target-version');
            _saveSettings();
        });
    }

    function _browseFolder() {
        _esExec('FishTools.PP_BROWSE_FOLDER()', function (result) {
            if (result && result !== 'undefined' && result !== 'null' && result !== 'false') {
                _saveLocation = result;
                var locEl = document.getElementById('pp-save-location');
                if (locEl) locEl.value = result;
                _saveSettings();
            }
        });
    }

    function _zipFolderWithJSZip(folderPath, zipPath, progress, callback) {
        if (!window.JSZip) {
            if (callback) callback(false, "JSZip library not available.");
            return;
        }

        var zip = new JSZip();

        function normalizePath(p) {
            return p.replace(/\\/g, '/');
        }

        function addDir(currentDir, currentZipFolder) {
            var normalized = normalizePath(currentDir);

            if (window.cep && window.cep.fs) {
                var readdirRes = window.cep.fs.readdir(normalized);
                if (readdirRes.err === 0 && Array.isArray(readdirRes.data)) {
                    for (var i = 0; i < readdirRes.data.length; i++) {
                        var entryName = readdirRes.data[i];
                        if (!entryName || entryName === '.' || entryName === '..') continue;
                        if (entryName.toLowerCase().slice(-4) === '.zip') continue; // Don't zip zip files into itself

                        var fullItemPath = normalized + '/' + entryName;
                        var statRes = window.cep.fs.stat(fullItemPath);
                        if (statRes.err === 0 && statRes.data) {
                            if (statRes.data.isDirectory()) {
                                if (progress) progress.log('Adding directory: ' + entryName + '/');
                                var subFolder = currentZipFolder.folder(entryName);
                                addDir(fullItemPath, subFolder);
                            } else if (statRes.data.isFile()) {
                                if (progress) progress.log('Packing file: ' + entryName);
                                var fileRes = window.cep.fs.readFile(fullItemPath, window.cep.encoding.Base64);
                                if (fileRes.err === 0 && typeof fileRes.data === 'string') {
                                    currentZipFolder.file(entryName, fileRes.data, { base64: true });
                                }
                            }
                        }
                    }
                }
            } else if (typeof require !== 'undefined') {
                try {
                    var fs = require('fs');
                    var path = require('path');
                    var entries = fs.readdirSync(normalized);
                    for (var j = 0; j < entries.length; j++) {
                        var eName = entries[j];
                        if (eName.toLowerCase().slice(-4) === '.zip') continue;
                        var fPath = path.join(normalized, eName);
                        var st = fs.statSync(fPath);
                        if (st.isDirectory()) {
                            if (progress) progress.log('Adding directory: ' + eName + '/');
                            var sub = currentZipFolder.folder(eName);
                            addDir(fPath, sub);
                        } else if (st.isFile()) {
                            if (progress) progress.log('Packing file: ' + eName);
                            var buf = fs.readFileSync(fPath);
                            currentZipFolder.file(eName, buf);
                        }
                    }
                } catch (err) {}
            }
        }

        try {
            if (progress) progress.log('Scanning preset folder structure...');
            addDir(folderPath, zip);

            if (progress) {
                progress.setStatus('Compressing files with DEFLATE (Level 6)...');
                progress.log('Compressing files into ZIP archive...');
            }

            zip.generateAsync({
                type: "base64",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            }).then(function (base64Content) {
                var wrote = false;
                var outNorm = normalizePath(zipPath);

                if (window.cep && window.cep.fs) {
                    var writeRes = window.cep.fs.writeFile(outNorm, base64Content, window.cep.encoding.Base64);
                    if (writeRes.err === 0) {
                        wrote = true;
                    }
                }

                if (!wrote && typeof require !== 'undefined') {
                    try {
                        var fs = require('fs');
                        var buf = Buffer.from(base64Content, 'base64');
                        fs.writeFileSync(outNorm, buf);
                        wrote = true;
                    } catch (fsWriteErr) {}
                }

                if (wrote) {
                    if (callback) callback(true);
                } else {
                    if (callback) callback(false, "Failed to write ZIP file to disk.");
                }
            }).catch(function (err) {
                if (callback) callback(false, err ? err.toString() : "JSZip compression error");
            });
        } catch (e) {
            if (callback) callback(false, e.toString());
        }
    }

    function _createPreset() {
        var nameEl = document.getElementById('pp-project-name');
        var projectName = (nameEl && nameEl.value.trim()) || _projectName || 'My Project';
        _projectName = projectName;

        var locEl = document.getElementById('pp-save-location');
        var saveLoc = (locEl && locEl.value.trim()) || _saveLocation || '';

        var convertEl = document.getElementById('pp-convert-am');
        if (convertEl) _convertAM = convertEl.checked;

        var downgradeEl = document.getElementById('pp-downgrade');
        if (downgradeEl) _downgrade = downgradeEl.checked;

        var verEl = document.getElementById('pp-target-version');
        if (verEl) _targetVersion = verEl.value;

        if (!saveLoc) {
            if (window.ModalModule) {
                ModalModule.warn('Please choose a save location for your preset archive.', 'Save Location Required');
            } else {
                alert('Please choose a save location for your preset archive.');
            }
            _browseFolder();
            return;
        }

        var btn = document.getElementById('btn-pp-create');
        var origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.classList.add('tool-btn--active');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-icons rotating" style="font-size:14px; margin-right:4px;">sync</span><span style="font-size:10px;">CREATING PRESET...</span>';
        }

        var progress = null;
        if (window.ModalModule && typeof ModalModule.showProgress === 'function') {
            progress = ModalModule.showProgress('Packaging Preset');
            progress.setStatus('Collecting project footage & dependencies...');
            progress.log('Preset Name: ' + projectName);
            progress.log('Save Destination: ' + saveLoc);
            progress.log('AM XML Conversion: ' + (_convertAM ? 'Enabled' : 'Disabled'));
            progress.log('Downgrade Version: ' + (_downgrade && _targetVersion ? 'Target AE v' + _targetVersion : 'Disabled'));
            progress.log('Collecting all active footage files into Assets/ directory...');
        }

        var safeProjectName = JSON.stringify(projectName);
        var safeSaveLoc = JSON.stringify(saveLoc.replace(/\\/g, '/'));
        var safeTargetVer = JSON.stringify(_targetVersion || '');

        var script = 'FishTools.PP_CREATE_PRESET(' +
            safeProjectName + ', ' +
            safeSaveLoc + ', ' +
            (_convertAM ? 'true' : 'false') + ', ' +
            (_downgrade ? 'true' : 'false') + ', ' +
            safeTargetVer + ')';

        _esExec(script, function (result) {
            if (!result || result === 'false' || result === 'cancelled') {
                if (btn) {
                    btn.classList.remove('tool-btn--active');
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
                if (progress) progress.close();
                if (window.ModalModule) {
                    ModalModule.warn('Preset creation was cancelled or incomplete.', 'Cancelled');
                }
                return;
            }

            if (result.indexOf('error:') === 0) {
                if (btn) {
                    btn.classList.remove('tool-btn--active');
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
                if (progress) progress.close();
                if (window.ModalModule) {
                    ModalModule.error('Create Preset failed:\n' + result.substring(6), 'Preset Error');
                } else {
                    alert('Create Preset failed:\n' + result.substring(6));
                }
                return;
            }

            var resData;
            try {
                resData = JSON.parse(result);
            } catch (e) {
                resData = null;
            }

            if (!resData || !resData.presetFolder) {
                if (btn) {
                    btn.classList.remove('tool-btn--active');
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
                if (progress) progress.close();
                if (window.ModalModule) {
                    ModalModule.alert('Preset files collected successfully!', 'Done', 'info');
                }
                return;
            }

            if (progress) {
                progress.log('Footage items copied to Assets/ and project relinked.');
                progress.setStatus('Generating ZIP package with JSZip...');
                progress.log('Preset Directory: ' + resData.presetFolder);
                progress.log('Target ZIP: ' + resData.zipPath);
            }

            // Create ZIP archive via JSZip
            _zipFolderWithJSZip(resData.presetFolder, resData.zipPath, progress, function (zipSuccess, zipErr) {
                if (btn) {
                    btn.classList.remove('tool-btn--active');
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }

                // Reveal folder in Explorer/Finder
                _esExec('FishTools.PP_REVEAL_FOLDER(' + JSON.stringify(resData.presetFolder) + ')');

                if (zipSuccess) {
                    if (progress) {
                        progress.log('ZIP archive generated successfully!');
                        progress.log('All preset assets packaged successfully.');
                        progress.setStatus('Complete!');
                    }
                    setTimeout(function () {
                        if (progress) progress.close();
                        if (window.ModalModule) {
                            ModalModule.alert('Preset folder and ZIP package created successfully!\n\nLocation:\n' + resData.zipPath, 'Preset Created', 'info');
                        } else {
                            alert('Preset created successfully!');
                        }
                    }, 500);
                } else {
                    if (progress) progress.close();
                    if (window.ModalModule) {
                        ModalModule.alert('Preset files collected, but ZIP packaging reported:\n' + (zipErr || 'Unknown error') + '\n\nFiles are in:\n' + resData.presetFolder, 'Preset Created (Uncompressed)', 'info');
                    }
                }
            });
        });
    }

    function _loadMedia() {
        var grid = document.getElementById('pp-media-grid');
        var emptyMsg = document.getElementById('pp-media-empty');
        var filterBar = document.getElementById('pp-media-filter-bar');
        var countBadge = document.getElementById('pp-media-count-badge');
        var reloadBtn = document.getElementById('btn-pp-load-media');
        var filterSelect = document.getElementById('pp-media-type-filter');

        if (reloadBtn) {
            reloadBtn.classList.add('rotating');
        }

        if (grid) {
            grid.style.display = 'block';
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:16px 8px; color:var(--text-mut); font-size:10px;"><span class="material-icons rotating" style="font-size:16px; display:block; margin-bottom:4px;">sync</span>Scanning project footage...</div>';
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        _esExec('FishTools.PP_LIST_MEDIA()', function (result) {
            if (reloadBtn) {
                reloadBtn.classList.remove('rotating');
            }

            try {
                _mediaItems = JSON.parse(result || '[]');
            } catch (e) {
                _mediaItems = [];
            }

            if (countBadge) {
                countBadge.textContent = _mediaItems.length;
                countBadge.style.display = _mediaItems.length > 0 ? 'inline-block' : 'none';
            }

            if (filterBar) {
                filterBar.style.display = _mediaItems.length > 0 ? 'flex' : 'none';
            }

            // Dynamically populate category filter dropdown with ONLY present types
            if (filterSelect) {
                var counts = { image: 0, video: 0, audio: 0, solid: 0 };
                _mediaItems.forEach(function (item) {
                    if (counts[item.type] !== undefined) {
                        counts[item.type]++;
                    } else if (item.type === 'placeholder' || item.type === 'comp') {
                        counts.image++;
                    }
                });

                filterSelect.innerHTML = '';
                var optAll = document.createElement('option');
                optAll.value = 'all';
                optAll.textContent = 'All (' + _mediaItems.length + ')';
                filterSelect.appendChild(optAll);

                if (counts.image > 0) {
                    var optImg = document.createElement('option');
                    optImg.value = 'image';
                    optImg.textContent = 'Photo (' + counts.image + ')';
                    filterSelect.appendChild(optImg);
                }
                if (counts.video > 0) {
                    var optVid = document.createElement('option');
                    optVid.value = 'video';
                    optVid.textContent = 'Video (' + counts.video + ')';
                    filterSelect.appendChild(optVid);
                }
                if (counts.audio > 0) {
                    var optAud = document.createElement('option');
                    optAud.value = 'audio';
                    optAud.textContent = 'Audio (' + counts.audio + ')';
                    filterSelect.appendChild(optAud);
                }
                if (counts.solid > 0) {
                    var optSol = document.createElement('option');
                    optSol.value = 'solid';
                    optSol.textContent = 'Solid (' + counts.solid + ')';
                    filterSelect.appendChild(optSol);
                }

                // Check if current filter is still valid
                var validFilter = Array.from(filterSelect.options).some(function (o) { return o.value === _currentFilter; });
                if (!validFilter) _currentFilter = 'all';
                filterSelect.value = _currentFilter;

                _syncCustomSelect('pp-media-type-filter');
            }

            if (_mediaItems.length === 0) {
                if (grid) {
                    grid.innerHTML = '';
                    grid.style.display = 'none';
                }
                if (emptyMsg) {
                    emptyMsg.style.display = 'block';
                    emptyMsg.innerHTML = '<span class="material-icons" style="font-size:24px; display:block; margin-bottom:4px; opacity:0.4;">photo_library</span>No footage found in project';
                }
                return;
            }

            if (emptyMsg) emptyMsg.style.display = 'none';
            if (grid) grid.style.display = 'grid';
            _renderMediaGrid();
        });
    }

    function _getFilteredMedia() {
        var query = (_searchQuery || '').trim().toLowerCase();
        return _mediaItems.filter(function (item) {
            if (_currentFilter !== 'all' && item.type !== _currentFilter) {
                return false;
            }
            if (query.length > 0) {
                return item.name.toLowerCase().indexOf(query) !== -1;
            }
            return true;
        });
    }

    function _formatFootageName(name) {
        if (!name || typeof name !== 'string') return '';
        if (name.length <= 15) return name;

        var lastDot = name.lastIndexOf('.');
        if (lastDot > 0 && lastDot > name.length - 6) {
            var ext = name.substring(lastDot); // e.g. ".mp4"
            var base = name.substring(0, lastDot);
            var maxBaseLen = 8;
            if (base.length > maxBaseLen) {
                var truncatedBase = base.substring(0, maxBaseLen).replace(/[\s\(_\-\.]+$/, '');
                return truncatedBase + '..' + ext;
            }
            return name;
        }

        return name.substring(0, 11).replace(/[\s\(_\-\.]+$/, '') + '...';
    }

    function _renderMediaGrid() {
        var grid = document.getElementById('pp-media-grid');
        if (!grid) return;
        grid.innerHTML = '';

        var items = _getFilteredMedia();
        if (items.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:16px; color:var(--text-mut); font-size:10px;">No matching footage items</div>';
            return;
        }

        items.forEach(function (item) {
            var el = document.createElement('div');
            el.className = 'pp-media-item';
            el.setAttribute('data-id', item.id);
            el.setAttribute('data-replace-id', item.id);
            el.setAttribute('data-replace-name', item.name);

            var icon = 'image';
            if (item.type === 'video') icon = 'videocam';
            else if (item.type === 'audio') icon = 'audiotrack';
            else if (item.type === 'comp') icon = 'movie';
            else if (item.type === 'solid') icon = 'crop_square';
            else if (item.type === 'placeholder') icon = 'insert_drive_file';

            var hasPath = (item.path && item.path.length > 0);
            var previewHtml = '';

            if (hasPath && item.type === 'video') {
                var safeUrl = 'file:///' + item.path.replace(/\\/g, '/');
                previewHtml =
                    '<video src="' + safeUrl + '#t=0.01" preload="metadata" muted playsinline ' +
                    'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';"></video>' +
                    '<span class="material-icons" style="display:none;">' + icon + '</span>';
            } else if (hasPath && item.type === 'image') {
                var safeUrl = 'file:///' + item.path.replace(/\\/g, '/');
                previewHtml =
                    '<img src="' + safeUrl + '" alt="' + item.name + '" ' +
                    'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" />' +
                    '<span class="material-icons" style="display:none;">' + icon + '</span>';
            } else {
                previewHtml = '<span class="material-icons">' + icon + '</span>';
            }

            var metaText = item.type.toUpperCase();
            if (item.width && item.height) {
                metaText = item.width + '×' + item.height;
            } else if (item.duration) {
                metaText = item.duration + 's';
            }

            el.innerHTML =
                '<div class="pp-media-thumb">' +
                    previewHtml +
                    '<span class="pp-media-res-badge">' + metaText + '</span>' +
                    '<div class="pp-media-overlay">' +
                        '<span class="material-icons">swap_horiz</span>' +
                        '<span class="pp-media-overlay-text">Replace</span>' +
                    '</div>' +
                '</div>' +
                '<span class="pp-media-name" title="' + item.name + '">' + _formatFootageName(item.name) + '</span>';

            grid.appendChild(el);
        });

        // Clicking anywhere on the item or the replace button opens replace dialog
        grid.querySelectorAll('.pp-media-item').forEach(function (card) {
            card.addEventListener('click', function (e) {
                var id = parseInt(this.getAttribute('data-replace-id'), 10);
                var name = this.getAttribute('data-replace-name');
                if (!isNaN(id)) {
                    _replaceMedia(id, name);
                }
            });
        });
    }

    function _replaceMedia(itemId, itemName) {
        var script = 'FishTools.PP_REPLACE_MEDIA(' + itemId + ', ' + JSON.stringify(itemName || '') + ')';
        _esExec(script, function (result) {
            if (result === 'true') {
                if (window.ModalModule) {
                    ModalModule.alert('Footage "' + itemName + '" replaced successfully.', 'Replaced', 'info');
                }
                // Auto reload grid to show updated asset
                _loadMedia();
            } else if (result && result.indexOf('error:') === 0) {
                if (window.ModalModule) {
                    ModalModule.error('Replace failed:\n' + result.substring(6), 'Replace Error');
                } else {
                    alert('Replace failed:\n' + result.substring(6));
                }
            }
        });
    }

    function init() {
        _loadSettings();
        _applyUI();
        _fetchProjectInfo();

        var convertEl = document.getElementById('pp-convert-am');
        var downgradeEl = document.getElementById('pp-downgrade');
        var versionEl = document.getElementById('pp-target-version');
        var nameEl = document.getElementById('pp-project-name');
        var locEl = document.getElementById('pp-save-location');
        var browseBtn = document.getElementById('pp-browse-btn');
        var createBtn = document.getElementById('btn-pp-create');
        var loadMediaBtn = document.getElementById('btn-pp-load-media');
        var searchInput = document.getElementById('pp-media-search');
        var typeFilter = document.getElementById('pp-media-type-filter');

        if (_downgrade) {
            setTimeout(function () { _loadVersions(); }, 150);
        }

        if (convertEl) {
            convertEl.addEventListener('change', function () {
                _convertAM = this.checked;
                _saveSettings();
            });
        }

        if (downgradeEl) {
            downgradeEl.addEventListener('change', function () {
                _downgrade = this.checked;
                var downgradeOpts = document.getElementById('pp-downgrade-options');
                if (downgradeOpts) downgradeOpts.style.display = _downgrade ? 'block' : 'none';
                if (_downgrade) _loadVersions();
                _saveSettings();
            });
        }

        if (versionEl) {
            versionEl.addEventListener('change', function () {
                _targetVersion = this.value;
                _saveSettings();
            });
        }

        if (nameEl) {
            nameEl.addEventListener('input', function () {
                _projectName = this.value;
                _saveSettings();
            });
        }

        if (locEl) {
            locEl.addEventListener('click', _browseFolder);
        }

        if (browseBtn) browseBtn.addEventListener('click', _browseFolder);
        if (createBtn) createBtn.addEventListener('click', _createPreset);
        if (loadMediaBtn) loadMediaBtn.addEventListener('click', _loadMedia);

        if (searchInput) {
            searchInput.addEventListener('input', function () {
                _searchQuery = this.value;
                _renderMediaGrid();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', function () {
                _currentFilter = this.value;
                _renderMediaGrid();
            });
        }
    }

    return {
        init: init,
        loadMedia: _loadMedia,
        createPreset: _createPreset,
        browseFolder: _browseFolder
    };
})();

