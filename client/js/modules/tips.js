window.TipsModule = class TipsModule {
    constructor() {
        this.tips = [];
        this.currentTip = "";
    }

    init() {
        const csInterface = new CSInterface();
        const extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        const tipsPath = extPath + "/client/tips.json";

        try {
            if (window.cep && window.cep.fs) {
                const result = window.cep.fs.readFile(tipsPath);
                if (result.err === 0) {
                    this.tips = JSON.parse(result.data);
                    this.showRandomTip();
                } else {
                    throw new Error("CEP FS error: " + result.err);
                }
            } else {
                fetch('./tips.json')
                    .then(r => r.json())
                    .then(data => { this.tips = data; this.showRandomTip(); });
            }
        } catch (e) {
            console.error("Error loading tips:", e);
            document.getElementById('tip-content').innerText = "Error loading tips.";
        }

        const nextBtn = document.getElementById('next-tip');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.showRandomTip();
            });
        }
    }

    showRandomTip() {
        if (this.tips.length === 0) return;

        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * this.tips.length);
        } while (this.tips[randomIndex] === this.currentTip && this.tips.length > 1);

        this.currentTip = this.tips[randomIndex];

        const tipEl = document.getElementById('tip-content');
        tipEl.style.opacity = 0;
        setTimeout(() => {
            tipEl.innerText = this.currentTip;
            tipEl.style.opacity = 1;
        }, 300);
    }
}
