var ModalModule = (function () {

    let overlay, modal, titleEl, contentEl, footerEl;
    let activeCallback = null;

    function init() {
        injectStyles();
        createDOM();
    }

    function injectStyles() {
        if (document.getElementById('modal-styles')) return;
        const css = `
            .custom-modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center;
                z-index: 20000;
                opacity: 0; transition: opacity 0.2s ease;
            }
            .custom-modal {
                background: #0d0d0d;
                border: 1px solid #333;
                border-radius: 8px;
                width: 280px;
                padding: 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.8);
                transform: scale(0.8); transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column; gap: 10px;
            }
            .custom-modal.active { transform: scale(1); }
            .custom-modal-overlay.active { opacity: 1; display: flex; }
            
            .custom-modal h3 {
                color: #fff;
                font-size: 0.7rem;
                text-transform: uppercase;
                margin: 0;
                letter-spacing: 2px;
                font-weight: 900;
                display: flex; align-items: center; gap: 8px;
            }
            .custom-modal .modal-body {
                color: #aaa;
                font-size: 0.75rem;
                line-height: 1.4;
                margin: 5px 0 10px 0;
            }
            .custom-modal input {
                width: 100%;
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                color: #fff;
                padding: 10px;
                font-size: 0.75rem;
                outline: none;
                transition: border-color 0.2s;
            }
            .custom-modal input:focus { border-color: var(--accent); }
            .custom-modal-footer {
                display: flex; gap: 8px; justify-content: flex-end;
                margin-top: 10px;
            }

            .modal-type-error { border-color: #ff4444 !important; }
            .modal-type-error h3 { color: #ff4444; }
            .modal-type-warning { border-color: #ffbb33 !important; }
            .modal-type-warning h3 { color: #ffbb33; }
            .modal-type-info { border-color: var(--accent) !important; }
            .modal-type-info h3 { color: var(--accent); }
        `;
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
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
                const primaryBtn = footerEl.querySelector('.primary-btn');
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

    function alert(msg, title, type) {
        resetModal();
        modal.classList.add('modal-type-' + (type || 'info'));
        titleEl.innerHTML = `<span class="material-icons" style="font-size: 16px;">${getIcon(type)}</span> ${title || 'Notice'}`;
        contentEl.innerText = msg;

        const btn = createBtn('OK', 'primary-btn', close);
        btn.style.background = getThemeColor(type);
        btn.style.color = (type === 'error' || type === 'warning') ? '#fff' : '#000';
        footerEl.appendChild(btn);

        open();
    }

    function confirm(msg, title, callback) {
        resetModal();
        modal.classList.add('modal-type-info');
        modal.classList.add('is-required');
        titleEl.innerHTML = '<span class="material-icons" style="font-size: 16px;">help_outline</span> Confirm';
        contentEl.innerText = msg;

        const btnCancel = createBtn('Cancel', 'secondary-btn', close);
        const btnConfirm = createBtn('Continue', 'primary-btn', function () {
            if (callback) callback(true);
            close();
        });
        btnConfirm.style.background = 'var(--accent)';
        btnConfirm.style.color = '#000';

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

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder || '';
        input.style.marginTop = '10px';
        contentEl.appendChild(input);

        const btnCancel = createBtn('Cancel', 'secondary-btn', close);
        const btnSave = createBtn('Save', 'primary-btn', function () {
            if (callback) callback(input.value);
            close();
        });
        btnSave.style.background = 'var(--accent)';
        btnSave.style.color = '#000';

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
        if (type === 'error') return '#ff4444';
        if (type === 'warning') return '#ffbb33';
        return 'var(--accent)';
    }

    function createBtn(text, cls, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = cls || '';
        btn.style.padding = '8px 16px';
        btn.style.fontSize = '0.7rem';
        btn.style.fontWeight = 'bold';
        btn.style.borderRadius = '4px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        if (cls === 'secondary-btn') {
            btn.style.background = '#222';
            btn.style.color = '#888';
        }
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
        alert: alert,
        confirm: confirm,
        prompt: prompt,
        error: function (msg, title) { alert(msg, title || 'System Error', 'error'); },
        warn: function (msg, title) { alert(msg, title || 'Warning', 'warning'); },
        info: function (msg, title) { alert(msg, title || 'Information', 'info'); }
    };
})();

window.ModalModule = ModalModule;
