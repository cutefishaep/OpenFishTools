window.UpdaterModule = class UpdaterModule {
    constructor() {
        this.currentVersion = window.EXTENSION_VERSION;
        this.repoURL = "https://github.com/cutefishaep/OpenFishTools";
        this.apiURL = "https://api.github.com/repos/cutefishaep/OpenFishTools/releases/latest";

        this.btn = null;
        this.progressContainer = null;
        this.progressBar = null;
        this.label = null;
        this.latestVerLabel = null;
        this.notesContainer = null;
        this.notesContent = null;

        this.csInterface = new CSInterface();
    }

    init() {
        this.btn = document.getElementById('btn-check-update');
        this.progressContainer = document.querySelector('.progress-container');
        this.progressBar = document.getElementById('update-progress');
        this.label = document.getElementById('update-label');
        this.latestVerLabel = document.getElementById('update-latest-ver');
        this.notesContainer = document.getElementById('releasenotes-container');
        this.notesContent = document.getElementById('releasenotes-content');

        if (this.btn) {
            this.btn.addEventListener('click', () => this.checkForUpdates());
        }
    }

    async checkForUpdates() {
        if (!this.btn || !this.progressContainer || !this.progressBar || !this.label) return;

        this.btn.disabled = true;
        this.btn.innerHTML = '<span class="material-icons rotating" style="font-size: 18px; vertical-align: middle;">sync</span> CONNECTING TO GITHUB...';
        this.progressContainer.style.display = 'block';
        this.progressBar.style.width = '0%';
        this.label.textContent = "SYNCHRONIZING REPOSITORY";
        if (this.notesContainer) this.notesContainer.style.display = 'none';

        try {
            this.updateProgressBar(30);

            const response = await fetch(this.apiURL);
            if (!response.ok) throw new Error("GitHub API unreachable");

            const data = await response.json();
            const latestVer = data.tag_name;
            const releaseNotes = data.body;

            this.updateProgressBar(100);

            setTimeout(() => {
                this.onUpdateFinish(latestVer, releaseNotes);
            }, 500);

        } catch (error) {
            console.error("Updater Error:", error);
            this.label.textContent = "CONNECTION ERROR";
            this.btn.disabled = false;
            this.btn.innerHTML = '<span class="material-icons" style="font-size: 18px; vertical-align: middle;">sync</span> RETRY CONNECTION';
            this.progressContainer.style.display = 'none';
        }
    }

    updateProgressBar(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = percent + '%';
        }
    }

    isNewerVersion(current, latest) {
        const clean = (v) => v.replace(/^v/, '').split('.').map(Number);
        const c = clean(current);
        const l = clean(latest);

        for (let i = 0; i < Math.max(c.length, l.length); i++) {
            const cNum = c[i] || 0;
            const lNum = l[i] || 0;
            if (lNum > cNum) return true;
            if (lNum < cNum) return false;
        }
        return false;
    }

    onUpdateFinish(latestVer, notes) {
        if (this.latestVerLabel) this.latestVerLabel.textContent = latestVer;

        if (this.notesContainer && this.notesContent) {
            this.notesContainer.style.display = 'block';
            this.notesContent.innerHTML = this.parseMarkdown(notes || "No release notes available.");
        }

        const isNewer = this.isNewerVersion(this.currentVersion, latestVer);

        if (isNewer) {
            this.label.textContent = "NEW VERSION DETECTED";
            this.btn.disabled = false;
            this.btn.innerHTML = '<span class="material-icons" style="font-size: 18px; vertical-align: middle;">download</span> UPDATE TO ' + latestVer;

            this.btn.onclick = () => {
                this.csInterface.openURLInDefaultBrowser(this.repoURL);
            };
        } else {
            this.label.textContent = "EXTENSION UP TO DATE";
            this.btn.disabled = false;
            this.btn.innerHTML = '<span class="material-icons" style="font-size: 18px; vertical-align: middle;">sync</span> CHECK UPDATE';
            this.btn.onclick = () => { this.checkForUpdates(); };
        }

        setTimeout(() => {
            if (this.progressContainer) this.progressContainer.style.display = 'none';
        }, 1500);
    }

    parseMarkdown(text) {
        if (!text) return "";

        const lines = text.split('\n');
        let inList = false;
        let finalHtml = "";

        for (let line of lines) {
            let trimmed = line.trim();

            // Unordered Lists
            if (trimmed.startsWith('- ')) {
                if (!inList) {
                    finalHtml += "<ul>";
                    inList = true;
                }
                finalHtml += `<li>${this.parseInline(trimmed.slice(2))}</li>`;
                continue;
            }

            // Close list if we were in one
            if (inList && trimmed !== "" && !trimmed.startsWith('- ')) {
                finalHtml += "</ul>";
                inList = false;
            }

            // Headers
            if (trimmed.startsWith('### ')) {
                finalHtml += `<h3>${this.parseInline(trimmed.slice(4))}</h3>`;
            } else if (trimmed.startsWith('## ')) {
                finalHtml += `<h2>${this.parseInline(trimmed.slice(3))}</h2>`;
            } else if (trimmed.startsWith('# ')) {
                finalHtml += `<h1>${this.parseInline(trimmed.slice(2))}</h1>`;
            }
            // Empty lines
            else if (trimmed === "") {
                if (inList) {
                    finalHtml += "</ul>";
                    inList = false;
                }
            }
            // Regular paragraphs
            else {
                finalHtml += `<p>${this.parseInline(trimmed)}</p>`;
            }
        }

        if (inList) finalHtml += "</ul>";
        return finalHtml;
    }

    parseInline(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
}
