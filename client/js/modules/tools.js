'use strict';

(function () {
    var NS = "FishTools";

    window.ToolboxModule = function ToolboxModule() {
        this.csInterface = null;
    };

    ToolboxModule.prototype.init = function () {
        this.csInterface = new CSInterface();
        this._bindToolButtons();
        this._bindAnchorGrid();
        this._bindActionButtons();
        this._bindFormatButtons();
    };

    ToolboxModule.prototype._runTool = function (toolName) {
        var args = Array.prototype.slice.call(arguments, 1);
        var script = NS + '.executeTool("' + toolName + '"';
        if (args.length > 0) {
            for (var i = 0; i < args.length; i++) {
                var val = args[i];
                if (typeof val === 'string') {
                    script += ', "' + val + '"';
                } else {
                    script += ', ' + val;
                }
            }
        }
        script += ')';

        this.csInterface.evalScript(script, function (res) {
            if (!res || res === 'undefined') return;
            try {
                var data = JSON.parse(res);
                if (data && data.error) {
                    if (data.type === 'warn' || data.type === 'warning') {
                        ModalModule.warn(data.message, data.tool || 'Warning');
                    } else {
                        ModalModule.error(data.message, data.tool || 'Error');
                    }
                    return;
                }
            } catch (e) { }
            if (res === "false" || res === false) {
                console.warn("FishTools: Tool '" + toolName + "' returned false.");
            }
        });
    };

    ToolboxModule.prototype._bindToolButtons = function () {
        var self = this;
        var buttons = document.querySelectorAll('.tool-btn[data-tool]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var toolName = btn.getAttribute('data-tool');
                var alter = btn.getAttribute('data-alter');

                btn.classList.add('tool-btn--active');
                setTimeout(function () { btn.classList.remove('tool-btn--active'); }, 200);

                if (alter !== null) {
                    self._runTool(toolName, alter === 'true');
                } else {
                    self._runTool(toolName);
                }
            });

            btn.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var toolName = btn.getAttribute('data-tool');
                var hasAlter = btn.getAttribute('data-has-alter');
                if (hasAlter === 'true') {
                    btn.classList.add('tool-btn--active');
                    setTimeout(function () { btn.classList.remove('tool-btn--active'); }, 200);
                    self._runTool(toolName, true);
                }
            });
        });
    };

    ToolboxModule.prototype._bindAnchorGrid = function () {
        var self = this;
        var cells = document.querySelectorAll('.anchor-cell');
        cells.forEach(function (cell) {
            cell.addEventListener('click', function () {
                var pos = parseInt(cell.getAttribute('data-pos'), 10);

                var allCells = document.querySelectorAll('.anchor-cell');
                allCells.forEach(function (c) { c.classList.remove('anchor-active'); });
                cell.classList.add('anchor-active');

                self._runTool('setAnchorPoint', pos);
            });
        });
    };

    ToolboxModule.prototype._bindActionButtons = function () {
        var self = this;
        var btnPrecomp = document.getElementById('btn-precomp');
        if (btnPrecomp) {
            btnPrecomp.addEventListener('click', function () {
                self._runTool('PRECOMP');
            });
        }
        var btnCenter = document.getElementById('btn-center');
        if (btnCenter) {
            btnCenter.addEventListener('click', function () {
                self._runTool('CENTERINCOMP');
            });
        }
        var btnOverlap = document.getElementById('btn-overlap');
        if (btnOverlap) {
            btnOverlap.addEventListener('click', function () {
                self._runTool('OVERLAP');
            });
        }
        var btnScreenshot = document.getElementById('btn-screenshot');
        if (btnScreenshot) {
            btnScreenshot.addEventListener('click', function () {
                self._runTool('PNG');
            });
        }
        var btnCreateCube = document.getElementById('btn-create-cube');
        if (btnCreateCube) {
            btnCreateCube.addEventListener('click', function () {
                var w = document.getElementById('cube-width').value;
                var h = document.getElementById('cube-height').value;
                var d = document.getElementById('cube-depth').value;
                var useLayer = document.getElementById('cube-use-layer').checked;
                self._runTool('CUBE', w, h, d, useLayer);
            });
        }
        var btnPurgeAll = document.getElementById('btn-purge-all');
        if (btnPurgeAll) {
            btnPurgeAll.addEventListener('click', function () {
                ModalModule.confirm("Are you sure you want to purge ALL caches, memory, and undo history?", "Purge All", function (confirmed) {
                    if (confirmed) self._runTool('PURGE', 'ALL');
                });
            });
        }
        var btnDupComp = document.getElementById('btn-dup-comp');
        if (btnDupComp) {
            btnDupComp.addEventListener('click', function () {
                var getCompNameScript = '(function() { var comp = app.project.activeItem; if (!comp || !(comp instanceof CompItem)) return ""; if (comp.selectedLayers.length > 0) { if (comp.selectedLayers[0].source instanceof CompItem) { return comp.selectedLayers[0].source.name; } return "NOT_A_PRECOMP"; } return comp.name; })()';

                self.csInterface.evalScript(getCompNameScript, function (compName) {
                    if (!compName) {
                        ModalModule.warn("Please select a composition or a precomp layer.", "Duplicate Comp");
                        return;
                    }
                    if (compName === "NOT_A_PRECOMP") {
                        ModalModule.warn("Please select a precomp layer, not a regular layer.", "Duplicate Comp");
                        return;
                    }

                    var newName = compName;
                    if (/\d+(?=\D*$)/.test(compName)) {
                        newName = compName.replace(/(\d+)(?=\D*$)/g, function (match) {
                            var num = parseInt(match, 10) + 1;
                            var s = num + "";
                            while (s.length < match.length) s = "0" + s;
                            return s;
                        });
                    } else {
                        newName = compName + " 2";
                    }

                    ModalModule.prompt("Enter new composition name:", newName, function (userStr) {
                        if (userStr && userStr.trim() !== '') {
                            self._runTool('DUP', userStr.trim());
                        }
                    });
                });
            });
        }
        var btnPurgeCache = document.getElementById('btn-purge-cache');
        if (btnPurgeCache) {
            btnPurgeCache.addEventListener('click', function () {
                ModalModule.confirm("Are you sure you want to purge all DISK CACHE?", "Purge Cache", function (confirmed) {
                    if (confirmed) self._runTool('PURGE', 'CACHE');
                });
            });
        }
        var btnPurgeMemory = document.getElementById('btn-purge-memory');
        if (btnPurgeMemory) {
            btnPurgeMemory.addEventListener('click', function () {
                ModalModule.confirm("Are you sure you want to purge all IMAGE MEMORY?", "Purge Memory", function (confirmed) {
                    if (confirmed) self._runTool('PURGE', 'MEMORY');
                });
            });
        }
        var btnPurgeUndo = document.getElementById('btn-purge-undo');
        if (btnPurgeUndo) {
            btnPurgeUndo.addEventListener('click', function () {
                ModalModule.confirm("Are you sure you want to clear UNDO history? This cannot be undone.", "Purge Undo", function (confirmed) {
                    if (confirmed) self._runTool('PURGE', 'UNDO');
                });
            });
        }
    };

    ToolboxModule.prototype._bindFormatButtons = function () {
        var self = this;
        var ratioButtons = document.querySelectorAll('.btn-ratio');
        ratioButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var w = btn.getAttribute('data-width');
                var h = btn.getAttribute('data-height');
                
                btn.classList.add('tool-btn--active');
                setTimeout(function () { btn.classList.remove('tool-btn--active'); }, 200);
                
                self._runTool('changeCompRatio', w, h);
            });
        });
        
        var fpsButtons = document.querySelectorAll('.btn-fps');
        fpsButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var fps = btn.getAttribute('data-fps');
                
                btn.classList.add('tool-btn--active');
                setTimeout(function () { btn.classList.remove('tool-btn--active'); }, 200);
                
                self._runTool('changeCompFPS', fps);
            });
        });
    };
})();
