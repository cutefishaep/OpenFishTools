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

        bindClick('btn-test-update-modal', function () {
            if (window.UpdateModule) {
                window.UpdateModule.showTestModal();
            }
        });

        bindClick('btn-test-confirm-modal', function () {
            if (window.ModalModule) {
                window.ModalModule.confirm('This is a test confirmation modal. Proceed with action?', 'Confirm Test', function (confirmed) {
                    log('Modal Confirm result: ' + confirmed);
                });
            }
        });

        bindClick('btn-test-info-modal', function () {
            if (window.ModalModule) {
                window.ModalModule.info('System notification: OpenFishTools is up to date and active.', 'Info Test');
            }
        });

        bindClick('btn-test-prompt-modal', function () {
            if (window.ModalModule) {
                window.ModalModule.prompt('Enter debug parameter:', 'Preset_1', function (val) {
                    log('Modal Prompt value: ' + val);
                });
            }
        });

        bindClick('btn-test-error-modal', function () {
            if (window.ModalModule) {
                window.ModalModule.error('Failed to parse CSXS debug mode key.', 'Error Test');
            }
        });

        bindClick('btn-test-warn-modal', function () {
            if (window.ModalModule) {
                window.ModalModule.warn('Low RAM available for expression engine.', 'Warning Test');
            }
        });
    }

    function bindClick(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
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
        init: init,
        log: log
    };
})();
