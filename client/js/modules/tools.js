(function () {
    'use strict';

    const NS = "FishTools";

    window.ToolboxModule = class ToolboxModule {
        constructor() {
            this.csInterface = null;
        }

        init() {
            this.csInterface = new CSInterface();
            this._bindToolButtons();
            this._bindAnchorGrid();
            this._bindActionButtons();
        }

        _runTool(toolName, alter) {
            let script;
            if (alter !== undefined) {
                script = NS + '.executeTool("' + toolName + '", ' + alter + ')';
            } else {
                script = NS + '.executeTool("' + toolName + '")';
            }
            this.csInterface.evalScript(script, (res) => {
                if (res === "false" || res === false) {
                    console.warn("FishTools: Tool '" + toolName + "' returned false.");
                }
            });
        }

        _bindToolButtons() {
            const buttons = document.querySelectorAll('.tool-btn[data-tool]');
            buttons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const toolName = btn.getAttribute('data-tool');
                    const alter = btn.getAttribute('data-alter');

                    btn.classList.add('tool-btn--active');
                    setTimeout(() => { btn.classList.remove('tool-btn--active'); }, 200);

                    if (alter !== null) {
                        this._runTool(toolName, alter === 'true');
                    } else {
                        this._runTool(toolName);
                    }
                });

                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const toolName = btn.getAttribute('data-tool');
                    const hasAlter = btn.getAttribute('data-has-alter');
                    if (hasAlter === 'true') {
                        btn.classList.add('tool-btn--active');
                        setTimeout(() => { btn.classList.remove('tool-btn--active'); }, 200);
                        this._runTool(toolName, true);
                    }
                });
            });
        }

        _bindAnchorGrid() {
            const cells = document.querySelectorAll('.anchor-cell');
            cells.forEach((cell) => {
                cell.addEventListener('click', () => {
                    const pos = parseInt(cell.getAttribute('data-pos'), 10);

                    const allCells = document.querySelectorAll('.anchor-cell');
                    allCells.forEach((c) => c.classList.remove('anchor-active'));
                    cell.classList.add('anchor-active');

                    this._runTool('setAnchorPoint', pos);
                });
            });
        }

        _bindActionButtons() {
            const btnPrecomp = document.getElementById('btn-precomp');
            if (btnPrecomp) {
                btnPrecomp.addEventListener('click', () => {
                    this._runTool('PRECOMP');
                });
            }
            const btnCenter = document.getElementById('btn-center');
            if (btnCenter) {
                btnCenter.addEventListener('click', () => {
                    this._runTool('CENTERINCOMP');
                });
            }
        }
    };
})();
