

if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        }
        targetLength = targetLength - this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(Math.ceil(targetLength / padString.length));
        }
        return padString.slice(0, targetLength) + String(this);
    };
}

if (!String.prototype.repeat) {
    String.prototype.repeat = function (count) {
        if (this == null) throw new TypeError('can\'t convert ' + this + ' to object');
        var str = '' + this;
        count = +count;
        if (count < 0 || count === Infinity) throw new RangeError('Invalid count value');
        count = Math.floor(count);
        if (str.length === 0 || count === 0) return '';
        var result = '';
        while (count > 0) {
            if (count & 1) result += str;
            count >>= 1;
            if (count) str += str;
        }
        return result;
    };
}

if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement, fromIndex) {
        if (this == null) throw new TypeError('"this" is null or not defined');
        var o = Object(this);
        var len = o.length >>> 0;
        if (len === 0) return false;
        var n = fromIndex | 0;
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (o[k] === searchElement) return true;
            k++;
        }
        return false;
    };
}

if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this == null) throw new TypeError('"this" is null or not defined');
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
        var thisArg = arguments[1];
        for (var k = 0; k < len; k++) {
            var kValue = o[k];
            if (predicate.call(thisArg, kValue, k, o)) return kValue;
        }
        return undefined;
    };
}

if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
        if (this == null) throw new TypeError('"this" is null or not defined');
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
        var thisArg = arguments[1];
        for (var k = 0; k < len; k++) {
            if (predicate.call(thisArg, o[k], k, o)) return k;
        }
        return -1;
    };
}

if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

if (!Element.prototype.remove) {
    Element.prototype.remove = function () {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

(function () {
    var testEl = document.createElement('div');
    try {
        testEl.classList.toggle('test', false);
        if (testEl.classList.contains('test')) {
            throw new Error('force parameter not supported');
        }
    } catch (e) {
        var _originalToggle = DOMTokenList.prototype.toggle;
        DOMTokenList.prototype.toggle = function (token, force) {
            if (arguments.length > 1) {
                if (force) {
                    this.add(token);
                } else {
                    this.remove(token);
                }
                return !!force;
            }
            return _originalToggle.call(this, token);
        };
    }
})();

if (!Math.hypot) {
    Math.hypot = function () {
        var sum = 0;
        for (var i = 0; i < arguments.length; i++) {
            sum += arguments[i] * arguments[i];
        }
        return Math.sqrt(sum);
    };
}

if (typeof Object.assign !== 'function') {
    Object.assign = function (target) {
        if (target == null) throw new TypeError('Cannot convert undefined or null to object');
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

