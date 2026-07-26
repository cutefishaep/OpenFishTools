'use strict';


var UpdateModule = (function () {
    var GITHUB_API = "https://api.github.com/repos/cutefishaep/OpenFishTools/releases/latest";
    var GITHUB_URL = "https://cutefish.my.id/#fishtoolupdate";

    function init() {
        var btn = document.getElementById('btn-check-update');
        if (btn) {
            btn.addEventListener('click', function() { checkUpdate(false); });
        }

        var curVerEl = document.getElementById('update-current-ver');
        if (curVerEl) {
            curVerEl.textContent = "v" + (window.EXTENSION_VERSION || "0.0.8");
        }
        
        
        setTimeout(function() { checkUpdate(true); }, 1000);
    }

    
    function checkUpdate(silent) {
        if (!window.csInterface) return;

        window.csInterface.evalScript("app.version", function (res) {
            var majorVersion = parseInt(res, 10);

            
            if (majorVersion && majorVersion <= 14) {
                if (!silent && window.ModalModule) {
                    window.ModalModule.confirm(
                        "After Effects CC 2017 cannot use the internal update checker due to technical limitations. \n\nWould you like to visit cutefish.my.id manually to check for the latest version?",
                        "Manual Check Required",
                        function (confirmed) {
                            if (confirmed) {
                                window.csInterface.openURLInDefaultBrowser("https://cutefish.my.id/#fishtoolupdate");
                            }
                        }
                    );
                }
                var latestVerEl = document.getElementById('update-latest-ver');
                if (latestVerEl) latestVerEl.textContent = "Manual Check Req.";
                return;
            }

            
            performFetchCheck(silent);
        });
    }

    
    function resetBtn(btn) {
        if (btn) {
            btn.innerHTML = '<span class="material-icons">sync</span>';
            btn.disabled = false;
        }
    }

    function performFetchCheck(silent) {
        var btn = document.getElementById('btn-check-update');
        var latestVerEl = document.getElementById('update-latest-ver');

        if (btn) {
            btn.innerHTML = '<span class="material-icons rotating" style="font-size: 14px;">sync</span>';
            btn.disabled = true;
        }

        if (latestVerEl) {
            latestVerEl.textContent = "Checking...";
        }

        fetch(GITHUB_API)
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(function (data) {
                if (!data || !data.tag_name) throw new Error('Invalid API response');

                var latestVersion = data.tag_name.replace(/^v/, '');
                var currentVersion = (window.EXTENSION_VERSION || "0.0.8").replace(/^v/, '');

                if (latestVerEl) latestVerEl.textContent = "v" + latestVersion;

                if (isNewer(latestVersion, currentVersion)) {
                    if (window.ModalModule) {
                        var bodyHtml = formatReleaseNotes(data.body || ("A new version (v" + latestVersion + ") is available!"));
                        window.ModalModule.confirm(
                            bodyHtml,
                            "Update Available",
                            function (confirmed) {
                                if (confirmed) {
                                    window.csInterface.openURLInDefaultBrowser(GITHUB_URL);
                                }
                            },
                            {
                                confirmText: "Update Now",
                                cancelText: "Later",
                                isHTML: true,
                                customClass: "modal-update"
                            }
                        );
                    }
                } else {
                    if (!silent && window.ModalModule) {
                        window.ModalModule.info("You are already using the latest version (v" + currentVersion + ").", "Up to Date");
                    }
                }
                resetBtn(btn);
            })
            .catch(function (error) {
                console.error('Update check failed:', error);
                if (latestVerEl) latestVerEl.textContent = "Failed";
                if (!silent && window.ModalModule) {
                    window.ModalModule.error("Failed to connect to GitHub. Please check your internet connection.", "Connection Error");
                }
                resetBtn(btn);
            });
    }

    function formatReleaseNotes(md) {
        if (!md) return '<div class="update-notes-empty">Improvements & general fixes</div>';

        var versionMatch = md.match(/\*\*Version:\*\*\s*(.*)/i);
        var builtMatch = md.match(/\*\*Built:\*\*\s*(.*)/i);

        var cleaned = md.replace(/\*\*Version:\*\*[\s\S]*$/i, '').trim();

        if (!cleaned) {
            var vStr = versionMatch ? 'v' + versionMatch[1].trim() : '';
            var dStr = builtMatch ? builtMatch[1].trim() : '';
            return '<div class="update-notes-body">' +
                        '<div class="update-header-version">' +
                            '<span class="version-tag">' + (vStr || 'Latest Update') + '</span>' +
                            (dStr ? '<span class="version-date">' + dStr + '</span>' : '') +
                        '</div>' +
                        '<p class="update-text-p" style="color: var(--text-dim); margin-top: 6px;">Improvements & bug fixes in this release.</p>' +
                   '</div>';
        }

        var lines = cleaned.split('\n');
        var html = '<div class="update-notes-body">';
        var inList = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            if (!line) {
                if (inList) { html += '</ul>'; inList = false; }
                continue;
            }

            if (/^##\s+/.test(line)) {
                if (inList) { html += '</ul>'; inList = false; }
                var versionMatch = line.match(/^##\s+\[?v?([\d\.]+)\]?\s*(?:-\s*(.*))?$/i);
                var versionStr = versionMatch && versionMatch[1] ? 'v' + versionMatch[1] : line.replace(/^##\s+/, '');
                var dateStr = versionMatch && versionMatch[2] ? versionMatch[2].trim() : '';

                html += '<div class="update-header-version">' +
                            '<span class="version-tag">' + versionStr + '</span>' +
                            (dateStr ? '<span class="version-date">' + dateStr + '</span>' : '') +
                        '</div>';
                continue;
            }

            if (/^###\s+(.*)$/.test(line)) {
                if (inList) { html += '</ul>'; inList = false; }
                var sectionTitle = line.replace(/^###\s+/, '').trim();
                var badgeClass = 'badge-info';
                var icon = 'info';

                var lower = sectionTitle.toLowerCase();
                if (lower.indexOf('added') !== -1) {
                    badgeClass = 'badge-added';
                    icon = 'add_circle_outline';
                } else if (lower.indexOf('fix') !== -1) {
                    badgeClass = 'badge-fixed';
                    icon = 'build';
                } else if (lower.indexOf('change') !== -1 || lower.indexOf('update') !== -1 || lower.indexOf('tuned') !== -1) {
                    badgeClass = 'badge-changed';
                    icon = 'published_with_changes';
                } else if (lower.indexOf('remove') !== -1 || lower.indexOf('deprecat') !== -1) {
                    badgeClass = 'badge-removed';
                    icon = 'remove_circle_outline';
                }

                html += '<div class="update-section-title ' + badgeClass + '">' +
                            '<span class="material-icons" style="font-size: 13px; margin-right: 4px;">' + icon + '</span>' +
                            sectionTitle.toUpperCase() +
                        '</div>';
                continue;
            }

            if (/^[\-\*]\s+/.test(line)) {
                if (!inList) { html += '<ul class="update-notes-list">'; inList = true; }
                var itemText = line.replace(/^[\-\*]\s+/, '');

                itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                itemText = itemText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

                html += '<li>' + itemText + '</li>';
                continue;
            }

            if (inList) { html += '</ul>'; inList = false; }
            var formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
            html += '<p class="update-text-p">' + formattedLine + '</p>';
        }

        if (inList) { html += '</ul>'; }
        html += '</div>';

        return html;
    }

    function showTestModal(customMd) {
        var sample = customMd || [
            "## [1.1.0] - 2026-07-25",
            "### Added",
            "- **Panning Beat Effect Suite**: Added a dedicated **Panning** section in Beat Effects featuring 5 tool buttons: `POSITION`, `ROTATION`, `SCALE`, `MIX PR`, and `MIX ALL`. Generates a parent Null layer powered by organic multi-frequency sine wave expressions with customizable `Freq` (frequency/speed) and `Amp` slider controls.",
            "- **Mix PR Tuned Defaults**: Configured `Mix PR` mode default slider parameters to `Freq: 7`, `Position: 10`, and `Rotation: 1`.",
            "- **Y FLIP Beat Effect**: Added `Y_FLIP` tool in Beat Continuous section with alternating vertical bounces and instantaneous teleportation 1 frame prior to the next beat marker.",
            "",
            "### Fixed",
            "- **X FLIP & Y FLIP Scale Bounds**: Added `inPoint`/`outPoint` time guards to scale flip expressions, ensuring scale stays at normal `[100, 100]` outside the null layer's timeline range.",
            "- **Oscillate Smooth Attack Envelope**: Eliminated abrupt initial velocity jerk at beat markers by applying a smooth ramp-in attack envelope `(1 - Math.exp(-t * attack))` and introducing an `Attack` control slider (default `40`).",
            "- **MID-WAVE Preset Tuning**: Updated default MID-WAVE properties to `Tile Output Height/Width: 150`, `Wave Width: 1200`, `Wave Speed: 1.3`, and `Phase: 90°`.",
            "- **GitHub Action Release Versioning**: Fixed whitespace accumulation bug in `scripts/update_version.sh` regex when updating `CSXS/manifest.xml` Version tag.",
            "",
            "**Version:** 1.1.0",
            "**Built:** 2026-07-25"
        ].join("\n");

        var bodyHtml = formatReleaseNotes(sample);

        if (window.ModalModule) {
            window.ModalModule.confirm(
                bodyHtml,
                "Update Available",
                function (confirmed) {
                    if (confirmed && window.csInterface) {
                        window.csInterface.openURLInDefaultBrowser(GITHUB_URL);
                    }
                },
                {
                    confirmText: "Update Now",
                    cancelText: "Later",
                    isHTML: true,
                    customClass: "modal-update"
                }
            );
        }
    }

    
    function isNewer(latest, current) {
        var l = latest.split('.').map(Number);
        var c = current.split('.').map(Number);
        for (var i = 0; i < Math.max(l.length, c.length); i++) {
            var lv = l[i] || 0;
            var cv = c[i] || 0;
            if (lv > cv) return true;
            if (lv < cv) return false;
        }
        return false;
    }

    return {
        init: init,
        checkUpdate: checkUpdate,
        showTestModal: showTestModal,
        formatReleaseNotes: formatReleaseNotes
    };
})();

window.UpdateModule = UpdateModule;
