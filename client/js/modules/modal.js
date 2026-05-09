'use strict';

var ModalModule = (function () {

    var overlay, modal, titleEl, contentEl, footerEl;
    var activeCallback = null;

    function init() {
        injectStyles();
        createDOM();
    }

    function injectStyles() {
        // Styles moved to main style.css for theme consistency
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

    function alertFn(msg, title, type) {
        resetModal();
        modal.classList.add('modal-type-' + (type || 'info'));
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">' + getIcon(type) + '</span> ' + (title || 'Notice');
        contentEl.innerText = msg;

        var btn = createBtn('OK', 'primary-btn', close);
        btn.style.background = getThemeColor(type);
        btn.style.color = (type === 'error' || type === 'warning') ? '#fff' : 'var(--bg)';
        footerEl.appendChild(btn);

        open();
    }

    function confirm(msg, title, callback, options) {
        resetModal();
        modal.classList.add('modal-type-info');
        modal.classList.add('is-required');
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">help_outline</span> ' + (title || 'Confirm');
        contentEl.innerText = msg;

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
        if (type === 'warning') return '#ffbb33'; // Warnings often stay orange for visibility
        return 'var(--accent)';
    }

    function createBtn(text, cls, onClick) {
        var btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'btn-modal ' + (cls || '');
        btn.addEventListener('click', onClick);
        return btn;
    }

    function open() {
        overlay.classList.add('active');
        setTimeout(function () { modal.classList.add('active'); }, 10);
    }

    function close() {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        activeCallback = null;
    }

    return {
        init: init,
        alert: alertFn,
        confirm: confirm,
        prompt: prompt,
        error: function (msg, title) { alertFn(msg, title || 'System Error', 'error'); },
        warn: function (msg, title) { alertFn(msg, title || 'Warning', 'warning'); },
        info: function (msg, title) { alertFn(msg, title || 'Information', 'info'); }
    };
})();

window.ModalModule = ModalModule;
