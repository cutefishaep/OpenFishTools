'use strict';

window.TipsModule = function TipsModule() {
    this.tips = [];
    this.currentTip = "";
};

TipsModule.prototype.init = function () {
    var self = this;
    var csInterface = new CSInterface();
    var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    var tipsPath = extPath + "/client/tips.json";

    try {
        if (window.cep && window.cep.fs) {
            var result = window.cep.fs.readFile(tipsPath);
            if (result.err === 0) {
                this.tips = JSON.parse(result.data);
                this.showRandomTip();
            } else {
                throw new Error("CEP FS error: " + result.err);
            }
        } else {
            fetch('./tips.json')
                .then(function (r) { return r.json(); })
                .then(function (data) { self.tips = data; self.showRandomTip(); });
        }
    } catch (e) {
        console.error("Error loading tips:", e);
        document.getElementById('tip-content').innerText = "Error loading tips.";
    }

    var nextBtn = document.getElementById('next-tip');
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            self.showRandomTip();
        });
    }
};

TipsModule.prototype.showRandomTip = function () {
    if (this.tips.length === 0) return;

    var randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * this.tips.length);
    } while (this.tips[randomIndex] === this.currentTip && this.tips.length > 1);

    this.currentTip = this.tips[randomIndex];

    var tipEl = document.getElementById('tip-content');
    tipEl.style.opacity = 0;
    var currentTip = this.currentTip;
    setTimeout(function () {
        tipEl.innerText = currentTip;
        tipEl.style.opacity = 1;
    }, 300);
};
