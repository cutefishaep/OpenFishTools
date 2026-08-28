'use strict';

var ModalModule = (function () {

    var overlay, modal, titleEl, contentEl, footerEl;
    var activeCallback = null;

    function init() {
        injectStyles();
        createDOM();
    }

    function injectStyles() {
        
    }

    function createDOM() {
        overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.id = 'fish-modal-overlay';

        modal = document.createElement('div');
        modal.className = 'custom-modal';

        titleEl = document.createElement('h3');
        contentEl = document.createElement('div');
        contentEl.className = 'modal-body';
        footerEl = document.createElement('div');
        footerEl.className = 'custom-modal-footer';

        modal.appendChild(titleEl);
        modal.appendChild(contentEl);
        modal.appendChild(footerEl);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) {
                if (!modal.classList.contains('is-required')) close();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (!overlay.classList.contains('active')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'Enter') {
                var primaryBtn = footerEl.querySelector('.primary-btn');
                if (primaryBtn) primaryBtn.click();
            }
        });
    }

    function resetModal() {
        modal.className = 'custom-modal';
        titleEl.innerHTML = '';
        contentEl.innerHTML = '';
        footerEl.innerHTML = '';
        activeCallback = null;
    }

    function alertFn(msg, title, type, options) {
        resetModal();
        if (options && options.customClass) {
            modal.classList.add(options.customClass);
        }
        modal.classList.add('modal-type-' + (type || 'info'));
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">' + getIcon(type) + '</span> ' + (title || 'Notice');
        
        if (options && options.isHTML) {
            contentEl.innerHTML = msg;
        } else {
            contentEl.innerText = msg;
        }

        if (options && options.copyable) {
            contentEl.style.userSelect = 'text';
            contentEl.style.cursor = 'text';
        }

        var btnText = (options && options.btnText) || 'OK';
        var btn = createBtn(btnText, 'primary-btn', close);
        if (options && options.dangerBtn) btn.classList.add('danger');
        footerEl.appendChild(btn);

        open();
    }

    function confirm(msg, title, callback, options) {
        resetModal();
        if (options && options.customClass) {
            modal.classList.add(options.customClass);
        }
        modal.classList.add('modal-type-info');
        modal.classList.add('is-required');
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">help_outline</span> ' + (title || 'Confirm');

        if (options && options.isHTML) {
            contentEl.innerHTML = msg;
        } else {
            contentEl.innerText = msg;
        }

        var cancelText = (options && options.cancelText) || 'Cancel';
        var confirmText = (options && options.confirmText) || 'Continue';

        var btnCancel = createBtn(cancelText, 'secondary-btn', close);
        var btnConfirm = createBtn(confirmText, 'primary-btn', function () {
            if (callback) callback(true);
            close();
        });
        btnConfirm.style.background = 'var(--accent)';
        btnConfirm.style.color = 'var(--bg)';

        footerEl.appendChild(btnCancel);
        footerEl.appendChild(btnConfirm);

        open();
    }

    function prompt(msg, placeholder, callback) {
        resetModal();
        modal.classList.add('modal-type-info');
        modal.classList.add('is-required');
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">edit</span> Input Required';
        contentEl.innerText = msg;

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder || '';
        input.value = placeholder || '';
        input.style.marginTop = '10px';
        contentEl.appendChild(input);

        var btnCancel = createBtn('Cancel', 'secondary-btn', close);
        var btnSave = createBtn('Save', 'primary-btn', function () {
            if (callback) callback(input.value);
            close();
        });
        btnSave.style.background = 'var(--accent)';
        btnSave.style.color = 'var(--bg)';

        footerEl.appendChild(btnCancel);
        footerEl.appendChild(btnSave);

        open();
        setTimeout(function () { input.focus(); }, 50);
    }

    function getIcon(type) {
        if (type === 'error') return 'error_outline';
        if (type === 'warning') return 'warning_amber';
        return 'info_outline';
    }

    function getThemeColor(type) {
        if (type === 'error') return 'var(--danger)';
        return 'var(--accent)';
    }

    function createBtn(text, cls, onClick) {
        var btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'btn-modal ' + (cls || '');
        btn.addEventListener('click', onClick);
        return btn;
    }

    var isClosing = false;

    function open() {
        isClosing = false;
        overlay.classList.add('active');
        // Force reflow to guarantee CSS animation triggers cleanly every time
        void modal.offsetWidth;
        modal.classList.add('active');
    }

    function close() {
        if (isClosing) return;
        isClosing = true;
        modal.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(function () {
            isClosing = false;
            activeCallback = null;
        }, 240);
    }

    function showProgress(title) {
        resetModal();
        modal.classList.add('modal-type-info');
        modal.classList.add('is-required');
        modal.classList.add('modal-progress');

        titleEl.innerHTML = '<span class="material-icons rotating" style="font-size:15px; color:var(--accent); margin-right:6px; display:inline-block; vertical-align:middle;">sync</span> ' + (title || 'Processing...');

        var statusEl = document.createElement('div');
        statusEl.className = 'modal-progress-status';
        statusEl.style.fontSize = '11px';
        statusEl.style.fontWeight = 'bold';
        statusEl.style.color = 'var(--text-main, #e0e0e0)';
        statusEl.style.marginBottom = '8px';
        statusEl.innerText = 'Initializing...';

        var logBox = document.createElement('pre');
        logBox.className = 'modal-progress-logs';
        logBox.style.background = 'var(--surface2, #141416)';
        logBox.style.border = '1px solid var(--border, #2e2e34)';
        logBox.style.borderRadius = '6px';
        logBox.style.padding = '8px 10px';
        logBox.style.fontFamily = 'monospace';
        logBox.style.fontSize = '9.5px';
        logBox.style.lineHeight = '1.45';
        logBox.style.maxHeight = '140px';
        logBox.style.overflowY = 'auto';
        logBox.style.color = 'var(--accent, #38ef7d)';
        logBox.style.whiteSpace = 'pre-wrap';
        logBox.style.wordBreak = 'break-all';
        logBox.style.margin = '0 0 10px 0';
        logBox.style.userSelect = 'text';

        var logsArray = [];

        contentEl.appendChild(statusEl);
        contentEl.appendChild(logBox);

        var copyBtn = createBtn('Copy Logs', 'secondary-btn', function () {
            var text = logsArray.join('\n');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
            } else {
                var ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            copyBtn.innerHTML = '<span class="material-icons" style="font-size:12px; margin-right:4px;">check</span> Copied!';
            setTimeout(function () {
                copyBtn.innerHTML = '<span class="material-icons" style="font-size:12px; margin-right:4px;">content_copy</span> Copy Logs';
            }, 1500);
        });
        copyBtn.style.fontSize = '10px';
        copyBtn.style.padding = '5px 12px';
        copyBtn.innerHTML = '<span class="material-icons" style="font-size:12px; margin-right:4px;">content_copy</span> Copy Logs';

        footerEl.appendChild(copyBtn);

        open();

        return {
            setStatus: function (txt) {
                statusEl.innerText = txt;
            },
            log: function (msg) {
                var timeStr = new Date().toTimeString().split(' ')[0];
                var line = '[' + timeStr + '] ' + msg;
                logsArray.push(line);
                logBox.innerText = logsArray.join('\n');
                logBox.scrollTop = logBox.scrollHeight;
            },
            getLogs: function () {
                return logsArray.join('\n');
            },
            close: function () {
                close();
            }
        };
    }

    return {
        init: init,
        alert: alertFn,
        confirm: confirm,
        prompt: prompt,
        showProgress: showProgress,
        error: function (msg, title) {
            alertFn(msg, title || 'Error', 'error', { btnText: 'OK', dangerBtn: true, copyable: true });
        },
        warn: function (msg, title) { alertFn(msg, title || 'Warning', 'warning'); },
        info: function (msg, title) { alertFn(msg, title || 'Information', 'info'); }
    };
})();

window.ModalModule = ModalModule;
