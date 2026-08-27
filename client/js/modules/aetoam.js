'use strict';

window.AeToAmModule = (function () {
    var _bakeExpr = true;
    var _importAdj = false;
    var _export3D = false;

    function _loadSettings() {
        if (!window.FileStore) return;
        var saved = window.FileStore.get('aetoam');
        if (!saved) return;
        if (typeof saved.bakeExpr !== 'undefined') _bakeExpr = !!saved.bakeExpr;
        if (typeof saved.importAdj !== 'undefined') _importAdj = !!saved.importAdj;
        if (typeof saved.export3D !== 'undefined') _export3D = !!saved.export3D;
    }

    function _saveSettings() {
        if (!window.FileStore) return;
        window.FileStore.set('aetoam', { bakeExpr: _bakeExpr, importAdj: _importAdj, export3D: _export3D });
    }

    function _applyUI() {
        var bakeEl    = document.getElementById('aetoam-bake-toggle');
        var adjEl     = document.getElementById('aetoam-adj-toggle');
        var threeDEl  = document.getElementById('aetoam-3d-toggle');
        if (bakeEl)   bakeEl.checked   = _bakeExpr;
        if (adjEl)    adjEl.checked    = _importAdj;
        if (threeDEl) threeDEl.checked = _export3D;
    }

    function _run() {
        if (!window.csInterface) return;
        var script = 'FishTools.executeTool("AE_TO_AM", ' + _bakeExpr + ', ' + _importAdj + ', ' + _export3D + ')';
        window.csInterface.evalScript(script);
    }

    function init() {
        _loadSettings();
        _applyUI();

        var bakeEl    = document.getElementById('aetoam-bake-toggle');
        var adjEl     = document.getElementById('aetoam-adj-toggle');
        var threeDEl  = document.getElementById('aetoam-3d-toggle');
        var runBtn    = document.getElementById('btn-aetoam-run');

        if (bakeEl) {
            bakeEl.addEventListener('change', function () {
                _bakeExpr = this.checked;
                _saveSettings();
            });
        }

        if (adjEl) {
            adjEl.addEventListener('change', function () {
                _importAdj = this.checked;
                _saveSettings();
            });
        }

        if (threeDEl) {
            threeDEl.addEventListener('change', function () {
                _export3D = this.checked;
                _saveSettings();
            });
        }

        if (runBtn) {
            runBtn.addEventListener('click', function () {
                runBtn.classList.add('tool-btn--active');
                setTimeout(function () { runBtn.classList.remove('tool-btn--active'); }, 300);
                _run();
            });
        }
    }

    return { init: init };
})();
