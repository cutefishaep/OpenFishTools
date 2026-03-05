'use strict';

(function () {
    var NS = "FishTools";

    window.BubbleTextModule = {
        csInterface: null,

        init: function () {
            this.csInterface = new CSInterface();
            this._bindGenerateButton();
            this._bindPreview();
        },

        _updatePreview: function () {
            var textEl = document.getElementById('bubble-text-input');
            var senderEl = document.getElementById('bubble-is-sender');
            var radiusEl = document.getElementById('bubble-radius');
            var previewBubble = document.getElementById('bubble-preview-bubble');
            var previewContainer = document.getElementById('bubble-preview-container');
            var modeLabel = document.getElementById('bubble-mode-label');

            if (!previewBubble || !previewContainer) return;

            var isSender = senderEl ? senderEl.checked : false;
            var text = textEl ? textEl.value : '';
            var R = radiusEl ? parseInt(radiusEl.value, 10) || 18 : 18;

            previewBubble.style.whiteSpace = 'pre-wrap';
            previewBubble.textContent = text || 'Preview';


            if (isSender) {
                previewBubble.style.background = '#1888FE';
                previewBubble.style.borderRadius = R + 'px ' + R + 'px 0px ' + R + 'px';
                previewContainer.style.webkitJustifyContent = 'flex-end';
                previewContainer.style.justifyContent = 'flex-end';
            } else {
                previewBubble.style.background = '#3B3B3D';
                previewBubble.style.borderRadius = R + 'px ' + R + 'px ' + R + 'px 0px';
                previewContainer.style.webkitJustifyContent = 'flex-start';
                previewContainer.style.justifyContent = 'flex-start';
            }


            if (modeLabel) {
                modeLabel.textContent = isSender ? 'Sender' : 'Receiver';
            }
        },

        _bindPreview: function () {
            var self = this;
            var textEl = document.getElementById('bubble-text-input');
            var senderEl = document.getElementById('bubble-is-sender');
            var radiusEl = document.getElementById('bubble-radius');

            if (textEl) {
                textEl.addEventListener('input', function () { self._updatePreview(); });
            }
            if (senderEl) {
                senderEl.addEventListener('change', function () { self._updatePreview(); });
            }
            if (radiusEl) {
                radiusEl.addEventListener('input', function () { self._updatePreview(); });
            }

            this._updatePreview();
        },

        _bindGenerateButton: function () {
            var self = this;
            var btnGenerate = document.getElementById('btn-generate-bubble');
            if (!btnGenerate) return;

            btnGenerate.addEventListener('click', function () {
                var textEl = document.getElementById('bubble-text-input');
                var radiusEl = document.getElementById('bubble-radius');
                var senderEl = document.getElementById('bubble-is-sender');

                var text = textEl ? textEl.value : '';
                var radius = radiusEl ? radiusEl.value : '18';
                var isSender = senderEl ? senderEl.checked : false;

                if (!text || text.trim() === '') {
                    if (window.ModalModule) {
                        ModalModule.warn("Please enter some text for the bubble.", "Bubble Text");
                    }
                    return;
                }

                var safeText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

                var script = NS + '.executeTool("BUBBLETEXT", "' + safeText + '", ' + radius + ', ' + isSender + ')';

                self.csInterface.evalScript(script, function (res) {
                    if (!res || res === 'undefined') return;
                    try {
                        var data = JSON.parse(res);
                        if (data && data.error) {
                            if (data.type === 'warn' || data.type === 'warning') {
                                ModalModule.warn(data.message, 'Bubble Text');
                            } else {
                                ModalModule.error(data.message, 'Bubble Text');
                            }
                        } else if (data && !data.error && data.message) {
                            window.showTooltip(btnGenerate, data.message, 2000);
                        }
                    } catch (e) { }
                });
            });
        }
    };
})();
