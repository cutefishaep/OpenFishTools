'use strict';

window.AutoSaveModule = (function () {

    var _enabled       = false;
    var _intervalSec   = 10;
    var _progressTimer = null;
    var _progressStart = 0;
    var _isSaving      = false;
    var _pollTimer     = null;
    var _isDirty       = false;

    var POLL_MS  = 4000;
    var MIN_SEC  = 5;
    var MAX_SEC  = 60;
    var STEP_SEC = 5;

    var STATE = {
        DISABLED:  'disabled',
        ACTIVE:    'active',
        CLEAN:     'clean',
        NO_FILE:   'no_file',
        RENDERING: 'rendering',
        SAVING:    'saving',
        SAVED:     'saved',
        ERROR:     'error'
    };

    var _state = STATE.DISABLED;

    var _els = {
        toggle:          null,
        intervalInput:   null,
        intervalDisplay: null,
        progressBar:     null,
        progressTrack:   null,
        statusText:      null,
        lastSavedText:   null,
        warning:         null,
        warningText:     null
    };

    function _getEl() {
        _els.toggle          = document.getElementById('autosave-toggle');
        _els.intervalInput   = document.getElementById('autosave-interval');
        _els.intervalDisplay = document.getElementById('autosave-interval-display');
        _els.progressBar     = document.getElementById('autosave-progress-bar');
        _els.progressTrack   = document.getElementById('autosave-progress-track');
        _els.statusText      = document.getElementById('autosave-status');
        _els.lastSavedText   = document.getElementById('autosave-last-saved');
        _els.warning         = document.getElementById('autosave-warning');
        _els.warningText     = document.getElementById('autosave-warning-text');
    }

    function _clampInterval(val) {
        val = parseInt(val, 10);
        if (isNaN(val)) return MIN_SEC;
        val = Math.round(val / STEP_SEC) * STEP_SEC;
        return Math.max(MIN_SEC, Math.min(MAX_SEC, val));
    }

    function _loadSettings() {
        if (!window.FileStore) return;
        var saved = window.FileStore.get('autosave');
        if (!saved) return;
        if (typeof saved.enabled !== 'undefined') _enabled = saved.enabled;
        if (typeof saved.interval !== 'undefined') {
            _intervalSec = _clampInterval(saved.interval);
        }
        if (saved.lastSaved && _els.lastSavedText) {
            _els.lastSavedText.textContent = 'Last saved: ' + saved.lastSaved;
        }
    }

    function _saveSettings() {
        if (!window.FileStore) return;
        var current = window.FileStore.get('autosave') || {};
        window.FileStore.set('autosave', {
            enabled:   _enabled,
            interval:  _intervalSec,
            lastSaved: current.lastSaved || null
        });
    }

    function _persistLastSaved(text) {
        if (!window.FileStore) return;
        var current = window.FileStore.get('autosave') || {};
        current.lastSaved = text;
        window.FileStore.set('autosave', current);
    }

    function _formatTime(date) {
        if (!date) return '\u2014';
        var h  = date.getHours();
        var m  = String(date.getMinutes()).padStart(2, '0');
        var s  = String(date.getSeconds()).padStart(2, '0');
        var ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return h + ':' + m + ':' + s + ' ' + ap;
    }

    function _setState(state, warningMsg) {
        _state = state;

        var statusMap = {
            disabled:  { label: 'Disabled',     cls: '' },
            active:    { label: 'Active',        cls: 'ok' },
            clean:     { label: 'No Changes',    cls: 'clean' },
            no_file:   { label: 'Waiting',       cls: 'warn' },
            rendering: { label: 'Rendering',     cls: 'warn' },
            saving:    { label: 'Saving\u2026',  cls: 'saving' },
            saved:     { label: 'Saved',         cls: 'ok' },
            error:     { label: 'Error',         cls: 'error' }
        };

        var info = statusMap[state] || statusMap.disabled;

        if (_els.statusText) {
            _els.statusText.textContent = info.label;
            _els.statusText.className   = 'autosave-status-text';
            if (info.cls) _els.statusText.classList.add(info.cls);
        }

        var showWarn = (state === STATE.NO_FILE || state === STATE.RENDERING);
        if (_els.warning) _els.warning.style.display = showWarn ? 'flex' : 'none';
        if (_els.warningText && warningMsg) _els.warningText.textContent = warningMsg;

        var card = document.getElementById('card-autosave');
        if (card) {
            card.setAttribute('data-state', state);
            card.setAttribute('data-enabled', _enabled ? 'true' : 'false');
        }

        var trackActive = _enabled &&
            state !== STATE.NO_FILE &&
            state !== STATE.RENDERING &&
            state !== STATE.DISABLED;
        if (_els.progressTrack) _els.progressTrack.style.opacity = trackActive ? '1' : '0.25';
    }

    function _animateProgress() {
        if (!_els.progressBar || !_enabled || !_isDirty) return;

        var now     = Date.now();
        var elapsed = now - _progressStart;
        var dur     = _intervalSec * 1000;
        var pct     = Math.min(elapsed / dur, 1);

        _els.progressBar.style.width = (pct * 100) + '%';

        if (pct < 1) {
            _progressTimer = requestAnimationFrame(_animateProgress);
        } else {
            _progressTimer = null;
            _doSave();
        }
    }

    function _startProgressBar() {
        if (_progressTimer) {
            cancelAnimationFrame(_progressTimer);
            _progressTimer = null;
        }
        _progressStart = Date.now();
        if (_els.progressBar) _els.progressBar.style.width = '0%';
        _progressTimer = requestAnimationFrame(_animateProgress);
    }

    function _pauseProgressBar() {
        if (_progressTimer) {
            cancelAnimationFrame(_progressTimer);
            _progressTimer = null;
        }
        if (_els.progressBar) _els.progressBar.style.width = '0%';
    }

    function _stopProgressBar() {
        _pauseProgressBar();
    }

    function _checkProjectState(callback) {
        if (!window.csInterface) { callback({ status: 'ok', dirty: true }); return; }

        var script = [
            '(function(){',
            '  try {',
            '    if (!app.project || !app.project.file) { return "no_file"; }',
            '    var rendering = false;',
            '    try {',
            '      if (typeof app.isRenderEngineRunning === "function") {',
            '        rendering = app.isRenderEngineRunning();',
            '      }',
            '    } catch(re) {}',
            '    if (rendering) { return "rendering"; }',
            '    var dirty = true;',
            '    try { dirty = !!app.project.dirty; } catch(de) {}',
            '    return "ok:" + (dirty ? "1" : "0");',
            '  } catch(e) { return "err:" + e.message; }',
            '})()'
        ].join('');

        window.csInterface.evalScript(script, function (res) {
            if (!res || res === 'no_file') {
                callback({ status: 'no_file', dirty: false });
            } else if (res === 'rendering') {
                callback({ status: 'rendering', dirty: false });
            } else if (res.indexOf('ok:') === 0) {
                callback({ status: 'ok', dirty: res.split(':')[1] === '1' });
            } else {
                console.warn('[AutoSave] Unexpected check result:', res);
                callback({ status: 'ok', dirty: true });
            }
        });
    }

    function _doSave() {
        if (_isSaving || !_enabled) return;

        _checkProjectState(function (check) {
            if (!_enabled) return;

            if (check.status === 'no_file') {
                _isDirty = false;
                _setState(STATE.NO_FILE, 'Please save your project first to use Auto Save.');
                _stopProgressBar();
                return;
            }

            if (check.status === 'rendering') {
                _isDirty = false;
                _setState(STATE.RENDERING, 'Auto Save is paused while After Effects is rendering.');
                _stopProgressBar();
                return;
            }

            if (!check.dirty) {
                _isDirty = false;
                _setState(STATE.CLEAN);
                _pauseProgressBar();
                return;
            }

            _isDirty = true;
            _isSaving = true;
            _setState(STATE.SAVING);

            var saveScript = [
                '(function(){',
                '  try {',
                '    if (!app.project || !app.project.file) { return "no_file"; }',
                '    var rendering = false;',
                '    try {',
                '      if (typeof app.isRenderEngineRunning === "function") {',
                '        rendering = app.isRenderEngineRunning();',
                '      }',
                '    } catch(re) {}',
                '    if (rendering) { return "rendering"; }',
                '    var dirty = true;',
                '    try { dirty = !!app.project.dirty; } catch(de) {}',
                '    if (!dirty) { return "clean"; }',
                '    var saved = false;',
                '    try {',
                '      var cmdId = 0;',
                '      try { cmdId = app.findMenuCommandId("Save"); } catch(fe) {}',
                '      if (cmdId > 0) {',
                '        app.executeCommand(cmdId);',
                '        saved = true;',
                '      }',
                '    } catch(ce) {}',
                '    if (!saved) { app.project.save(); }',
                '    return "ok";',
                '  } catch(e) { return "err:" + e.message; }',
                '})()'
            ].join('');

            window.csInterface.evalScript(saveScript, function (result) {
                _isSaving = false;
                if (!_enabled) return;

                if (result === 'ok') {
                    var timeStr = _formatTime(new Date());
                    _setState(STATE.SAVED);
                    if (_els.lastSavedText) _els.lastSavedText.textContent = 'Last saved: ' + timeStr;
                    _persistLastSaved(timeStr);
                    _isDirty = false;
                    _pauseProgressBar();
                    setTimeout(function () {
                        if (_enabled && _state !== STATE.NO_FILE && _state !== STATE.RENDERING) {
                            _setState(STATE.CLEAN);
                        }
                    }, 2500);
                } else if (result === 'clean') {
                    _isDirty = false;
                    _setState(STATE.CLEAN);
                    _pauseProgressBar();
                } else if (result === 'no_file') {
                    _isDirty = false;
                    _setState(STATE.NO_FILE, 'Please save your project first to use Auto Save.');
                    _stopProgressBar();
                } else if (result === 'rendering') {
                    _isDirty = false;
                    _setState(STATE.RENDERING, 'Auto Save is paused while After Effects is rendering.');
                    _stopProgressBar();
                } else {
                    _setState(STATE.ERROR);
                    console.warn('[AutoSave] Save failed:', result);
                    setTimeout(function () {
                        if (_enabled) {
                            _setState(STATE.ACTIVE);
                            _startProgressBar();
                        }
                    }, 3000);
                }
            });
        });
    }

    function _startPoll() {
        _stopPoll();
        _pollTimer = setInterval(function () {
            if (!_enabled) { _stopPoll(); return; }

            _checkProjectState(function (check) {
                if (!_enabled) return;

                if (check.status === 'no_file') {
                    if (_state !== STATE.NO_FILE) {
                        _isDirty = false;
                        _stopProgressBar();
                        _setState(STATE.NO_FILE, 'Please save your project first to use Auto Save.');
                    }
                    return;
                }

                if (check.status === 'rendering') {
                    if (_state !== STATE.RENDERING) {
                        _isDirty = false;
                        _stopProgressBar();
                        _setState(STATE.RENDERING, 'Auto Save is paused while After Effects is rendering.');
                    }
                    return;
                }

                var wasDirty = _isDirty;
                _isDirty     = check.dirty;

                if (_state === STATE.NO_FILE || _state === STATE.RENDERING) {
                    if (_isDirty) {
                        _setState(STATE.ACTIVE);
                        _startProgressBar();
                    } else {
                        _setState(STATE.CLEAN);
                    }
                    return;
                }

                if (_state === STATE.SAVING || _state === STATE.SAVED || _state === STATE.DISABLED) {
                    return;
                }

                if (_isDirty && !wasDirty) {
                    _setState(STATE.ACTIVE);
                    _startProgressBar();
                } else if (!_isDirty && wasDirty) {
                    _setState(STATE.CLEAN);
                    _pauseProgressBar();
                }
            });
        }, POLL_MS);
    }

    function _stopPoll() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    }

    function _stopAllTimers() {
        _stopPoll();
        _stopProgressBar();
    }

    function _applyUI() {
        if (_els.toggle)          _els.toggle.checked              = _enabled;
        if (_els.intervalInput)   _els.intervalInput.value         = _intervalSec;
        if (_els.intervalDisplay) _els.intervalDisplay.textContent = _intervalSec;
        if (!_enabled) _setState(STATE.DISABLED);
    }

    function _onEnable() {
        _saveSettings();
        _applyUI();

        _checkProjectState(function (check) {
            if (!_enabled) return;
            _isDirty = check.dirty;

            if (check.status === 'no_file') {
                _setState(STATE.NO_FILE, 'Please save your project first to use Auto Save.');
            } else if (check.status === 'rendering') {
                _setState(STATE.RENDERING, 'Auto Save is paused while After Effects is rendering.');
            } else if (!check.dirty) {
                _setState(STATE.CLEAN);
            } else {
                _setState(STATE.ACTIVE);
                _startProgressBar();
            }
            _startPoll();
        });
    }

    function _onDisable() {
        _saveSettings();
        _stopAllTimers();
        _isDirty = false;
        _setState(STATE.DISABLED);
        if (_els.progressTrack) _els.progressTrack.style.opacity = '0.25';
    }

    function init() {
        _getEl();
        _loadSettings();
        _applyUI();

        if (_els.toggle) {
            _els.toggle.addEventListener('change', function () {
                _enabled = this.checked;
                if (_enabled) {
                    _onEnable();
                } else {
                    _onDisable();
                }
            });
        }

        if (_els.intervalInput) {
            _els.intervalInput.addEventListener('input', function () {
                var val = _clampInterval(this.value);
                _intervalSec = val;
                this.value = val;
                if (_els.intervalDisplay) _els.intervalDisplay.textContent = val;
            });

            _els.intervalInput.addEventListener('change', function () {
                _saveSettings();
                if (_enabled && _isDirty) {
                    _startProgressBar();
                }
            });
        }

        if (_enabled) {
            _onEnable();
        }
    }

    return { init: init };
})();
