window.ColorPicker = {
    activeTarget: null,
    state: { h: 0, s: 100, v: 100 },

    init() {
        this.createPickerUI();
        this.setupListeners();
    },

    createPickerUI() {
        if (document.getElementById('ft-color-picker-overlay')) return;

        const html = `
            <div id="ft-color-picker-overlay" class="cp-overlay">
                <div class="cp-container">
                    <div class="cp-picker-area" id="cp-square">
                        <div class="cp-white-grad"></div>
                        <div class="cp-black-grad"></div>
                        <div class="cp-cursor" id="cp-cursor"></div>
                    </div>
                    <div class="cp-hue-slider" id="cp-hue">
                        <div class="cp-hue-cursor" id="cp-hue-cursor"></div>
                    </div>
                    <div class="cp-actions">
                        <div class="cp-preview" id="cp-preview"></div>
                        <input type="text" id="cp-hex-input" class="cp-hex-text">
                        <button id="cp-btn-ok" class="cp-btn">OK</button>
                    </div>
                </div>
            </div>`;

        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
    },

    setupListeners() {
        const overlay = document.getElementById('ft-color-picker-overlay');
        const hueSlider = document.getElementById('cp-hue');
        const square = document.getElementById('cp-square');
        const okBtn = document.getElementById('cp-btn-ok');

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) this.close();
        });

        okBtn.onclick = () => {
            if (this.activeTarget) {
                const color = document.getElementById('cp-hex-input').value;
                this.activeTarget.value = color;
                const event = new Event('input', { bubbles: true });
                this.activeTarget.dispatchEvent(event);
            }
            this.close();
        };

        hueSlider.onmousedown = (e) => {
            this.hueMove(e);
            const onMouseMove = (moveE) => { this.hueMove(moveE); };
            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        square.onmousedown = (e) => {
            this.squareMove(e);
            const onMouseMove = (moveE) => { this.squareMove(moveE); };
            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };
    },

    open(targetInput) {
        this.activeTarget = targetInput;
        const overlay = document.getElementById('ft-color-picker-overlay');
        overlay.classList.add('active');

        const hex = targetInput.value || "#FFD700";
        this.updateFromHex(hex);
    },

    close() {
        document.getElementById('ft-color-picker-overlay').classList.remove('active');
    },

    hueMove(e) {
        const hueSlider = document.getElementById('cp-hue');
        const rect = hueSlider.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        this.state.h = Math.floor((x / rect.width) * 360);
        document.getElementById('cp-hue-cursor').style.left = x + 'px';
        this.updateUI();
    },

    squareMove(e) {
        const square = document.getElementById('cp-square');
        const rect = square.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        this.state.s = Math.floor((x / rect.width) * 100);
        this.state.v = Math.floor(100 - (y / rect.height) * 100);

        const cursor = document.getElementById('cp-cursor');
        cursor.style.left = (x / rect.width * 100) + '%';
        cursor.style.top = (y / rect.height * 100) + '%';
        this.updateUI();
    },

    updateUI() {
        const square = document.getElementById('cp-square');
        const preview = document.getElementById('cp-preview');
        const hexInput = document.getElementById('cp-hex-input');

        square.style.backgroundColor = 'hsl(' + this.state.h + ', 100%, 50%)';
        const rgb = this.hsvToRgb(this.state.h, this.state.s, this.state.v);
        const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);

        preview.style.backgroundColor = hex;
        hexInput.value = hex.toUpperCase();
    },

    updateFromHex(hex) {
        document.getElementById('cp-hex-input').value = hex.toUpperCase();
        document.getElementById('cp-preview').style.backgroundColor = hex;
        this.updateUI();
    },

    hsvToRgb(h, s, v) {
        s /= 100; v /= 100;
        const i = Math.floor(h / 60) % 6;
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let r, g, b;
        switch (i) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
};
