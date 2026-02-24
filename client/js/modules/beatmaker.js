'use strict';

window.BeatMakerModule = function BeatMakerModule() {
    this.cs = null;
    this.markerCount = 0;
    this.tapBtnId = 'beat-tap-btn';
    this.countId = 'beat-count';
    this.clearBtnId = 'beat-clear-btn';
};

BeatMakerModule.prototype.init = function (csInterface) {
    this.cs = csInterface;
    this.setupListeners();
};

BeatMakerModule.prototype.setupListeners = function () {
    var self = this;

    var tapBtn = document.getElementById(this.tapBtnId);
    if (tapBtn) {
        tapBtn.addEventListener('click', function (e) {
            self.tap(e);
        });
    }

    var clearBtn = document.getElementById(this.clearBtnId);
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            self.clearAll();
        });
    }
};

BeatMakerModule.prototype.tap = function (e) {
    var self = this;
    var tapBtn = document.getElementById(this.tapBtnId);

    
    var ripple = document.createElement('div');
    ripple.className = 'beat-ripple';
    var btnW = tapBtn.offsetWidth;
    var btnH = tapBtn.offsetHeight;
    var size = Math.max(btnW, btnH);
    var x = (e.offsetX !== undefined ? e.offsetX : btnW / 2) - size / 2;
    var y = (e.offsetY !== undefined ? e.offsetY : btnH / 2) - size / 2;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    tapBtn.appendChild(ripple);
    setTimeout(function () {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 650);

    
    tapBtn.classList.add('tapped');
    setTimeout(function () { tapBtn.classList.remove('tapped'); }, 220);

    
    if (self.cs) {
        self.cs.evalScript('executeTool("BEATMARK")', function () { });
    }
};

BeatMakerModule.prototype.clearAll = function () {
    var self = this;
    if (self.cs) {
        self.cs.evalScript('executeTool("CLEARBEATS")', function () { });
    }
};

BeatMakerModule.prototype.updateCount = function () { };

