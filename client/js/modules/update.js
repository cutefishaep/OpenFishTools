'use strict';

/**
 * UpdateModule
 * Handles checking for updates from GitHub API.
 * 
 * Note: CC 2017 (Major Version 14) has issues with fetch/network requests in CEP 7.x.
 * CC 2018+ (Major Version 15+, CEP 8.0+) supports modern fetch API.
 */
var UpdateModule = (function () {
    var GITHUB_API = "https://api.github.com/repos/cutefishaep/OpenFishTools/releases/latest";
    var GITHUB_URL = "https://github.com/cutefishaep/OpenFishTools/releases/latest";

    function init() {
        var btn = document.getElementById('btn-check-update');
        if (btn) {
            btn.addEventListener('click', function() { checkUpdate(false); });
        }

        var curVerEl = document.getElementById('update-current-ver');
        if (curVerEl) {
            curVerEl.textContent = "v" + (window.EXTENSION_VERSION || "0.0.8");
        }
        
        // Auto check on load silently
        setTimeout(function() { checkUpdate(true); }, 1000);
    }

    /**
     * Checks for updates.
     * Branches logic based on After Effects version.
     */
    function checkUpdate(silent) {
        if (!window.csInterface) return;

        window.csInterface.evalScript("app.version", function (res) {
            var majorVersion = parseInt(res, 10);

            // CC 2017 is version 14.x
            if (majorVersion && majorVersion <= 14) {
                if (!silent && window.ModalModule) {
                    window.ModalModule.confirm(
                        "After Effects CC 2017 cannot use the internal update checker due to technical limitations. \n\nWould you like to visit GitHub manually to check for the latest version?",
                        "Manual Check Required",
                        function (confirmed) {
                            if (confirmed) {
                                window.csInterface.openURLInDefaultBrowser("https://github.com/cutefishaep/OpenFishTools/releases");
                            }
                        }
                    );
                }
                var latestVerEl = document.getElementById('update-latest-ver');
                if (latestVerEl) latestVerEl.textContent = "Manual Check Req.";
                return;
            }

            // CC 2018+ (Version 15+)
            performFetchCheck(silent);
        });
    }

    /**
     * Performs a fetch request to GitHub API to check for the latest release.
     */
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
                        window.ModalModule.confirm(
                            "A new version (v" + latestVersion + ") is available!\n\nUpdate includes:\n" + (data.name || "Improvements & fixes"),
                            "Update Available",
                            function (confirmed) {
                                if (confirmed) {
                                    window.csInterface.openURLInDefaultBrowser(GITHUB_URL);
                                }
                            },
                            { confirmText: "Update" }
                        );
                    }
                } else {
                    if (!silent && window.ModalModule) {
                        window.ModalModule.info("You are already using the latest version (v" + currentVersion + ").", "Up to Date");
                    }
                }
            })
            .catch(function (error) {
                console.error('Update check failed:', error);
                if (latestVerEl) latestVerEl.textContent = "Failed";
                if (!silent && window.ModalModule) {
                    window.ModalModule.error("Failed to connect to GitHub. Please check your internet connection.", "Connection Error");
                }
            })
            .finally(function () {
                if (btn) {
                    btn.innerHTML = '<span class="material-icons">sync</span>';
                    btn.disabled = false;
                }
            });
    }

    /**
     * Semantic version comparison (simple)
     */
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
        checkUpdate: checkUpdate
    };
})();

window.UpdateModule = UpdateModule;
