'use strict';

(function () {
    var LANGUAGES = [
        { code: 'id', name: 'Indonesian' },
        { code: 'en', name: 'English (US)' },
        { code: 'en-gb', name: 'English (UK)' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'zh-cn', name: 'Chinese' }
    ];

    var currentAudio = null;

    window.TextToSpeechModule = {
        init: function () {
            this.setupListeners();
            this.populateLanguages();
            this.restoreSettings();
            this.updateVisibility();
        },

        updateVisibility: function () {
            var addTextToggle = document.getElementById('tts-add-text-toggle');
            var animToggle = document.getElementById('tts-anim-toggle');
            var animToggleContainer = document.getElementById('tts-anim-toggle-container');
            var textOptions = document.getElementById('tts-text-options');

            var addText = addTextToggle ? addTextToggle.checked : false;
            var animate = animToggle ? animToggle.checked : false;

            if (animToggleContainer) {
                animToggleContainer.style.display = addText ? 'flex' : 'none';
            }
            if (textOptions) {
                textOptions.style.display = (addText && animate) ? 'flex' : 'none';
            }
        },

        setupListeners: function () {
            var self = this;

            var previewBtn = document.getElementById('btn-tts-preview');
            if (previewBtn) {
                previewBtn.addEventListener('click', function () {
                    self.playPreview();
                });
            }

            var generateBtn = document.getElementById('btn-tts-generate');
            if (generateBtn) {
                generateBtn.addEventListener('click', function () {
                    self.generateSpeech();
                });
            }

            var cleanCacheBtn = document.getElementById('btn-tts-clean-cache');
            if (cleanCacheBtn) {
                cleanCacheBtn.addEventListener('click', function () {
                    self.cleanCache();
                });
            }

            var addTextToggle = document.getElementById('tts-add-text-toggle');
            var animToggle = document.getElementById('tts-anim-toggle');

            if (addTextToggle) {
                addTextToggle.addEventListener('change', function () {
                    self.updateVisibility();
                });
            }
            if (animToggle) {
                animToggle.addEventListener('change', function () {
                    try { localStorage.setItem('tts_anim_enabled', this.checked ? 'true' : 'false'); } catch(e) {}
                    self.updateVisibility();
                });
            }

            // Persist animation settings
            var dirSelect = document.getElementById('tts-anim-direction');
            if (dirSelect) {
                dirSelect.addEventListener('change', function () {
                    try { localStorage.setItem('tts_anim_direction', this.value); } catch(e) {}
                });
            }
            var basedSelect = document.getElementById('tts-anim-based-on');
            if (basedSelect) {
                basedSelect.addEventListener('change', function () {
                    try { localStorage.setItem('tts_anim_based_on', this.value); } catch(e) {}
                });
            }
        },

        restoreSettings: function () {
            try {
                var animEnabled = localStorage.getItem('tts_anim_enabled');
                if (animEnabled !== null) {
                    var animToggleEl = document.getElementById('tts-anim-toggle');
                    if (animToggleEl) animToggleEl.checked = (animEnabled === 'true');
                }
                var dir = localStorage.getItem('tts_anim_direction');
                if (dir) {
                    var dirSel = document.getElementById('tts-anim-direction');
                    if (dirSel) dirSel.value = dir;
                }
                var based = localStorage.getItem('tts_anim_based_on');
                if (based) {
                    var basedSel = document.getElementById('tts-anim-based-on');
                    if (basedSel) basedSel.value = based;
                }
            } catch(e) {}
        },

        populateLanguages: function () {
            var select = document.getElementById('tts-voice-select');
            if (!select) return;
            select.innerHTML = '';
            
            LANGUAGES.forEach(function (lang) {
                var opt = document.createElement('option');
                opt.value = lang.code;
                opt.text = lang.name;
                select.appendChild(opt);
            });

            // Trigger custom select refresh
            var event = new Event('refresh');
            select.dispatchEvent(event);
        },

        cleanCache: function () {
            var self = this;
            var dataDir = window.FileStore ? window.FileStore.getDataDir() : null;
            if (!dataDir) {
                window.ModalModule.warn('Data directory is not available.', 'Clean Cache');
                return;
            }
            var cacheDir = dataDir + '/tts_cache';
            var script = 'FishTools.executeTool("CLEAN_TTS_CACHE", "' + cacheDir.replace(/\\/g, '\\\\') + '")';
            window.csInterface.evalScript(script, function (res) {
                if (res && res.indexOf('ERROR') === 0) {
                    window.ModalModule.warn('No TTS cache found or already clean.', 'Clean Cache');
                } else {
                    window.ModalModule.info('TTS cache folder cleared!', 'Clean Cache');
                }
            });
        },

        playPreview: function () {
            var textInput = document.getElementById('tts-text-input');
            var text = textInput ? textInput.value.trim() : 'Preview';
            if (!text) {
                text = 'Preview';
            }

            var select = document.getElementById('tts-voice-select');
            var lang = select ? select.value : 'en';

            if (text.length > 200) {
                window.ModalModule.warn('Text is too long for preview. Please limit to 200 characters.', 'Text Too Long');
                return;
            }

            var url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=' + lang + '&client=tw-ob&q=' + encodeURIComponent(text);

            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }

            currentAudio = new Audio(url);
            currentAudio.play().catch(function (err) {
                window.ModalModule.error('Failed to play preview: ' + err.message, 'Preview Error');
            });
        },

        generateSpeech: function () {
            var self = this;
            var textInput = document.getElementById('tts-text-input');
            var text = textInput ? textInput.value.trim() : '';
            if (!text) {
                window.ModalModule.warn('Please enter some text to generate speech.', 'Input Empty');
                return;
            }

            if (text.length > 200) {
                window.ModalModule.warn('Text is too long for Google TTS. Please limit to 200 characters.', 'Text Too Long');
                return;
            }

            var select = document.getElementById('tts-voice-select');
            var lang = select ? select.value : 'en';

            var addTextToggle = document.getElementById('tts-add-text-toggle');
            var addText = addTextToggle ? addTextToggle.checked : false;

            var animToggle = document.getElementById('tts-anim-toggle');
            var animateText = animToggle ? animToggle.checked : false;

            var dirSelect = document.getElementById('tts-anim-direction');
            var animDirection = dirSelect ? dirSelect.value : 'bottom_to_top';

            var basedSelect = document.getElementById('tts-anim-based-on');
            var animBasedOn = basedSelect ? basedSelect.value : 'lines';

            var generateBtn = document.getElementById('btn-tts-generate');
            if (generateBtn) {
                generateBtn.innerText = 'GENERATING...';
                generateBtn.disabled = true;
            }

            var url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=' + lang + '&client=tw-ob&q=' + encodeURIComponent(text);

            fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('TTS generation failed. Status: ' + response.status);
                }
                return response.arrayBuffer();
            })
            .then(function (buffer) {
                var base64 = self.arrayBufferToBase64(buffer);
                var dataDir = window.FileStore ? window.FileStore.getDataDir() : null;
                if (!dataDir) {
                    throw new Error('Data directory is not available.');
                }
                var cacheDir = dataDir + '/tts_cache';
                if (window.cep && window.cep.fs) {
                    window.cep.fs.makedir(cacheDir);
                }
                var timestamp = Date.now();
                var filePath = cacheDir + '/tts_' + timestamp + '.mp3';
                var encoding = (window.cep && window.cep.encoding && window.cep.encoding.Base64) ? window.cep.encoding.Base64 : 2;
                var writeRes = window.cep.fs.writeFile(filePath, base64, encoding);
                if (writeRes.err !== 0) {
                    throw new Error('Failed to save file on disk. Error code: ' + writeRes.err);
                }

                var cleanText = text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                var script = 'FishTools.executeTool("IMPORT_TTS", "' + filePath.replace(/\\/g, '\\\\') + '", "' + cleanText + '", ' + addText + ', ' + animateText + ', "' + animDirection + '", "' + animBasedOn + '")';
                window.csInterface.evalScript(script, function (res) {
                    try {
                        var parsed = JSON.parse(res);
                        if (parsed.error) {
                            window.ModalModule.error(parsed.message || 'Unknown After Effects error', 'After Effects Error');
                        } else {
                            window.ModalModule.info(parsed.message || 'Speech generated and imported successfully!', 'TTS Success');
                        }
                    } catch (e) {
                        if (res && res.indexOf('ERROR') === 0) {
                            window.ModalModule.error(res, 'After Effects Error');
                        } else {
                            window.ModalModule.error('Failed to parse host response: ' + res, 'Response Error');
                        }
                    }
                });
            })
            .catch(function (err) {
                window.ModalModule.error(err.message, 'Generation Failure');
            })
            .finally(function () {
                if (generateBtn) {
                    generateBtn.innerText = 'GENERATE';
                    generateBtn.disabled = false;
                }
            });
        },

        arrayBufferToBase64: function (buffer) {
            var binary = '';
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }
    };
})();
