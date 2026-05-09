'use strict';

window.ColorPicker = {
    activeTarget: null,
    activeTrigger: null,
    state: { h: 0, s: 100, v: 100 },

    init: function () {
        this.createPickerUI();
        this.setupListeners();
    },

    createPickerUI: function () {
        if (document.getElementById('ft-color-picker-bubble-overlay')) return;

        var html =
            '<div class="cp-bubble-container" id="cp-bubble-wrap">' +
            '<div class="cp-bubble-arrow"></div>' +
            '<div class="cp-picker-area" id="cp-square">' +
            '<div class="cp-white-grad"></div>' +
            '<div class="cp-black-grad"></div>' +
            '<div class="cp-cursor" id="cp-cursor"></div>' +
            '</div>' +
            '<div class="cp-hue-slider" id="cp-hue">' +
            '<div class="cp-hue-cursor" id="cp-hue-cursor"></div>' +
            '</div>' +
            '<div class="cp-actions">' +
            '<div class="cp-preview" id="cp-preview"></div>' +
            '<input type="text" id="cp-hex-input" class="cp-hex-text">' +
            '<button id="cp-btn-ok" class="cp-btn">OK</button>' +
            '</div>' +
            '</div>';

        var wrap = document.createElement('div');
        wrap.id = 'ft-color-picker-bubble-overlay';
        wrap.className = 'cp-bubble-overlay';
        wrap.innerHTML = html;
        document.body.appendChild(wrap);
    },

    setupListeners: function () {
        var self = this;
        var overlay = document.getElementById('ft-color-picker-bubble-overlay');
        var hueSlider = document.getElementById('cp-hue');
        var square = document.getElementById('cp-square');
        var okBtn = document.getElementById('cp-btn-ok');

        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) self.close();
        });

        okBtn.onclick = function () {
            if (self.activeTarget) {
                var color = document.getElementById('cp-hex-input').value;
                self.activeTarget.value = color;

                
                var event = document.createEvent('Event');
                event.initEvent('input', true, true);
                self.activeTarget.dispatchEvent(event);
            }
            self.close();
        };

        hueSlider.onmousedown = function (e) {
            self.hueMove(e);
            var onMouseMove = function (moveE) { self.hueMove(moveE); };
            var onMouseUp = function () {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        square.onmousedown = function (e) {
            self.squareMove(e);
            var onMouseMove = function (moveE) { self.squareMove(moveE); };
            var onMouseUp = function () {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };
    },

    open: function (targetInput, triggerElement) {
        this.activeTarget = targetInput;
        this.activeTrigger = triggerElement;
        var overlay = document.getElementById('ft-color-picker-bubble-overlay');
        var bubble = document.getElementById('cp-bubble-wrap');
        overlay.classList.add('active');

        var bubbleHeight = bubble.offsetHeight || 215;

        if (triggerElement) {
            var rect = triggerElement.getBoundingClientRect();
            var leftPos = rect.left - 10;
            var topPos = rect.top - bubbleHeight - 8;
            var isBottomPlaced = false;

            if (topPos < 10) {
                topPos = rect.bottom + 8;
                isBottomPlaced = true;
            }

            bubble.style.top = topPos + 'px';
            bubble.style.left = leftPos + 'px';

            if (isBottomPlaced) {
                bubble.classList.add('bottom-placed');
            } else {
                bubble.classList.remove('bottom-placed');
            }
        }

        var hex = targetInput.value || "#FFD700";
        this.updateFromHex(hex);
    },

    close: function () {
        var overlay = document.getElementById('ft-color-picker-bubble-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    hueMove: function (e) {
        var hueSlider = document.getElementById('cp-hue');
        var rect = hueSlider.getBoundingClientRect();
        var x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        this.state.h = Math.floor((x / rect.width) * 360);
        this.updateUI();
    },

    squareMove: function (e) {
        var square = document.getElementById('cp-square');
        var rect = square.getBoundingClientRect();
        var x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        var y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        this.state.s = Math.round((x / rect.width) * 100);
        this.state.v = Math.round(100 - (y / rect.height) * 100);
        this.updateUI();
    },

    updateFromHex: function (hex) {
        var rgb = this.hexToRgb(hex);
        if (!rgb) return;
        var hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        this.state.h = hsv.h;
        this.state.s = hsv.s;
        this.state.v = hsv.v;
        this.updateUI();
    },

    updateUI: function () {
        var rgb = this.hsvToRgb(this.state.h, this.state.s, this.state.v);
        var hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);

        document.getElementById('cp-square').style.backgroundColor = 'hsl(' + this.state.h + ', 100%, 50%)';

        var cursorX = (this.state.s / 100) * 100;
        var cursorY = 100 - this.state.v;
        document.getElementById('cp-cursor').style.left = cursorX + '%';
        document.getElementById('cp-cursor').style.top = cursorY + '%';

        var hueX = (this.state.h / 360) * 100;
        document.getElementById('cp-hue-cursor').style.left = hueX + '%';

        document.getElementById('cp-preview').style.backgroundColor = hex;
        document.getElementById('cp-hex-input').value = hex.toUpperCase();

        if (this.activeTrigger) {
            this.activeTrigger.style.backgroundColor = hex;
        }
        if (this.activeTarget) {
            this.activeTarget.value = hex.toUpperCase();
            var event = document.createEvent('Event');
            event.initEvent('input', true, true);
            this.activeTarget.dispatchEvent(event);
        }
    },

    hexToRgb: function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex: function (r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    rgbToHsv: function (r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;
        var d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    },

    hsvToRgb: function (h, s, v) {
        var r, g, b;
        var i;
        var f, p, q, t;

        h = Math.max(0, Math.min(360, h));
        s = Math.max(0, Math.min(100, s));
        v = Math.max(0, Math.min(100, v));

        s /= 100;
        v /= 100;

        if (s == 0) {
            r = g = b = v;
            return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        }

        h /= 60;
        i = Math.floor(h);
        f = h - i;
        p = v * (1 - s);
        q = v * (1 - s * f);
        t = v * (1 - s * (1 - f));

        switch (i) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            default: r = v; g = p; b = q; break;
        }

        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }
};
