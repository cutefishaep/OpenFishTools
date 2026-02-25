'use strict';

window.DebugModule = (function () {
    var outputEl;

    function init() {
        outputEl = document.getElementById('debug-output');
        setupListeners();
    }

    function setupListeners() {
        var btnAll = document.getElementById('btn-debug-all');
        var btnClear = document.getElementById('btn-debug-clear');

        if (btnAll) {
            btnAll.addEventListener('click', function () {
                runDebug('DEBUG_ALL');
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', function () {
                if (outputEl) outputEl.value = '';
            });
        }
    }

    function runDebug(toolName) {
        if (!window.csInterface) return;

        log('Running Full Debug...');

        window.csInterface.evalScript('FishTools.executeTool("' + toolName + '")', function (result) {
            try {
                if (result.indexOf('{') === 0) {
                    var data = JSON.parse(result);
                    if (data.error) {
                        log('ERROR: ' + data.message);
                        return;
                    }
                }
                log(result);
            } catch (e) {
                log(result);
            }
        });
    }

    function log(msg) {
        if (!outputEl) return;
        if (outputEl.value) {
            outputEl.value += '\n\n' + msg;
        } else {
            outputEl.value = msg;
        }
        outputEl.scrollTop = outputEl.scrollHeight;
    }

    return {
        init: init
    };
})();
