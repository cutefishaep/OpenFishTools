'use strict';

var FileStore = (function () {

    var _filePath = null;
    var _dataDir = null;
    var _cache = {};
    var _useLocalStorage = false;

    function _hasCepFs() {
        return !!(window.cep && window.cep.fs);
    }

    function _ensureDir(dirPath) {
        if (!_hasCepFs()) return false;
        try {
            var result = window.cep.fs.makedir(dirPath);
            // err 0 = success, err 174 = already exists (EEXIST) - both are fine
            return (result.err === 0 || result.err === 174);
        } catch (e) {
            return false;
        }
    }

    function init(extensionPath) {
        if (!extensionPath) {
            _useLocalStorage = true;
            _loadFromLocalStorage();
            return;
        }

        if (!_hasCepFs()) {
            _useLocalStorage = true;
            _loadFromLocalStorage();
            return;
        }

        _dataDir = extensionPath + '/data';
        _filePath = _dataDir + '/fishtools_save.json';

        // Ensure directory exists before attempting any file operations
        var dirOk = _ensureDir(_dataDir);
        if (!dirOk) {
            // Fallback to localStorage if we can't create the directory
            _useLocalStorage = true;
            _filePath = null;
            _loadFromLocalStorage();
            return;
        }

        load();
    }

    function _loadFromLocalStorage() {
        try {
            var raw = localStorage.getItem('fishToolsFileStore');
            if (raw) _cache = JSON.parse(raw);
        } catch (e) { _cache = {}; }
    }

    function load() {
        if (!_filePath || !_hasCepFs() || _useLocalStorage) {
            _loadFromLocalStorage();
            return;
        }
        try {
            var result = window.cep.fs.readFile(_filePath);
            if (result.err === 0 && result.data) {
                try {
                    var parsed = JSON.parse(result.data);
                    _cache = parsed || {};
                } catch (e) {
                    _cache = {};
                }
            } else if (result.err !== 0) {
                // File doesn't exist yet or read error - start fresh
                _cache = {};
            }
        } catch (e) {
            // If cep.fs throws, fall back to localStorage
            _useLocalStorage = true;
            _filePath = null;
            _loadFromLocalStorage();
        }
    }

    function save() {
        var json;
        try {
            json = JSON.stringify(_cache, null, 2);
        } catch (e) { return; }

        if (!_filePath || !_hasCepFs() || _useLocalStorage) {
            try { localStorage.setItem('fishToolsFileStore', json); } catch (e) {}
            return;
        }

        try {
            // Re-ensure directory exists before each write (handles Mac sandbox quirks)
            _ensureDir(_dataDir);
            var result = window.cep.fs.writeFile(_filePath, json);
            if (result.err !== 0) {
                // Write failed - fall back to localStorage
                try { localStorage.setItem('fishToolsFileStore', json); } catch (e2) {}
            }
        } catch (e) {
            try { localStorage.setItem('fishToolsFileStore', json); } catch (e2) {}
        }
    }

    function get(key) {
        return _cache[key];
    }

    function set(key, value) {
        _cache[key] = value;
        save();
    }

    function remove(key) {
        delete _cache[key];
        save();
    }

    function getAll() {
        try { return JSON.parse(JSON.stringify(_cache)); } catch (e) { return {}; }
    }

    function clear() {
        _cache = {};
        if (_hasCepFs() && _filePath && !_useLocalStorage) {
            try { window.cep.fs.deleteFile(_filePath); } catch (e) {}
        }
        try { localStorage.removeItem('fishToolsFileStore'); } catch (e) {}
    }

    return {
        init: init,
        load: load,
        get: get,
        set: set,
        remove: remove,
        getAll: getAll,
        clear: clear
    };

})();

window.FileStore = FileStore;
