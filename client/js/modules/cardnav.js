'use strict';


window.CardNavModule = (function () {
    var _enabled = false;
    var _currentIndex = -1;
    var _cards = [];
    var _scrollCooldown = false;
    var _cooldownMs = 70; 
    var _animationFrame = null;
    var _isAnimating = false;

    

    function getVisibleCards() {
        var activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return [];
        return Array.prototype.slice.call(activeTab.querySelectorAll('.card, .controller-am-card'));
    }

    function focusCard(index) {
        if (!_cards.length) return;
        index = Math.max(0, Math.min(index, _cards.length - 1));

        _cards.forEach(function (c) { c.classList.remove('card--focused'); });
        _cards[index].classList.add('card--focused');
        _currentIndex = index;
        if (window.ControllerModule && typeof window.ControllerModule.setSnapCard === 'function') {
            window.ControllerModule.setSnapCard(_cards[index].id);
        }

        var container = document.querySelector('.content-container');
        if (!container) return;
        var card = _cards[index];
        var containerRect = container.getBoundingClientRect();
        var cardRect = card.getBoundingClientRect();
        var targetScrollTop = container.scrollTop + (cardRect.top - containerRect.top) - (container.clientHeight / 2) + (card.offsetHeight / 2);
        var animOff = document.documentElement.getAttribute('data-anim') === 'off' || document.body.getAttribute('data-anim') === 'off';
        if (animOff) {
            container.style.scrollBehavior = 'auto';
            container.scrollTop = targetScrollTop;
            _isAnimating = false;
            return;
        }

        if (_animationFrame) cancelAnimationFrame(_animationFrame);
        _isAnimating = true;
        var previousScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        var start = container.scrollTop;
        var distance = targetScrollTop - start;
        var startedAt = Date.now();
        var duration = 200;
        function animate() {
            var progress = Math.min(1, (Date.now() - startedAt) / duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            container.scrollTop = start + distance * eased;
            if (progress < 1) _animationFrame = requestAnimationFrame(animate);
            else {
                _animationFrame = null;
                _isAnimating = false;
                container.style.scrollBehavior = previousScrollBehavior;
            }
        }
        _animationFrame = requestAnimationFrame(animate);
    }

    function findClosestCardIndex() {
        var container = document.querySelector('.content-container');
        if (!container || !_cards.length) return 0;

        var containerMid = container.getBoundingClientRect().top + container.clientHeight / 2;
        var best = 0;
        var bestDist = Infinity;

        _cards.forEach(function (c, i) {
            var rect = c.getBoundingClientRect();
            var cardMid = rect.top + rect.height / 2;
            var dist = Math.abs(cardMid - containerMid);
            if (dist < bestDist) { bestDist = dist; best = i; }
        });
        return best;
    }

    

    function onWheel(e) {
        if (!_enabled) return;
        e.preventDefault();

        if (_scrollCooldown || _isAnimating) return;
        _scrollCooldown = true;
        setTimeout(function () { _scrollCooldown = false; }, _cooldownMs);

        var delta = e.deltaY || e.detail || (-e.wheelDelta);
        if (_currentIndex < 0) {
            _currentIndex = findClosestCardIndex();
        }
        focusCard(_currentIndex + (delta > 0 ? 1 : -1));
    }

    function onKeyDown(e) {
        if (!_enabled) return;
        var key = e.key || e.keyCode;
        if (key === 'ArrowDown' || key === 40) {
            e.preventDefault();
            if (_currentIndex < 0) _currentIndex = findClosestCardIndex();
            focusCard(_currentIndex + 1);
        } else if (key === 'ArrowUp' || key === 38) {
            e.preventDefault();
            if (_currentIndex < 0) _currentIndex = findClosestCardIndex();
            focusCard(_currentIndex - 1);
        }
    }

    

    function refreshOnTabChange() {
        if (!_enabled) return;
        _cards = getVisibleCards();
        _currentIndex = -1;
        _cards.forEach(function (c) { c.classList.remove('card--focused'); });

        
        if (_cards.length) {
            setTimeout(function () { focusCard(0); }, 80);
        }
    }

    

    function enable() {
        if (_enabled) return;
        _enabled = true;
        document.documentElement.setAttribute('data-snap', 'on');

        _cards = getVisibleCards();
        _currentIndex = _cards.length ? findClosestCardIndex() : -1;
        if (_currentIndex >= 0) focusCard(_currentIndex);

        var container = document.querySelector('.content-container');
        if (container) {
            container.addEventListener('wheel', onWheel, { passive: false });
        }
        document.addEventListener('keydown', onKeyDown);

        
        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', refreshOnTabChange);
        });
    }

    function disable() {
        if (!_enabled) return;
        _enabled = false;
        if (_animationFrame) { cancelAnimationFrame(_animationFrame); _animationFrame = null; }
        _isAnimating = false;
        document.documentElement.setAttribute('data-snap', 'off');

        _cards.forEach(function (c) { c.classList.remove('card--focused'); });
        _cards = [];
        _currentIndex = -1;
        if (window.ControllerModule && typeof window.ControllerModule.clearSnapCard === 'function') {
            window.ControllerModule.clearSnapCard();
        }

        var container = document.querySelector('.content-container');
        if (container) {
            container.removeEventListener('wheel', onWheel);
        }
        document.removeEventListener('keydown', onKeyDown);

        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.removeEventListener('click', refreshOnTabChange);
        });
    }

    function isEnabled() { return _enabled; }

    return { enable: enable, disable: disable, isEnabled: isEnabled, refresh: refreshOnTabChange };
}());
