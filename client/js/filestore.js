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
            // First check if the directory already exists
            var stat = window.cep.fs.stat(dirPath);
            if (stat.err === 0 && stat.data && typeof stat.data.isDirectory === 'function') {
                if (stat.data.isDirectory()) {
                    return true; // Already exists and is a directory
                }
            }

            // If it doesn't exist, create it
            var result = window.cep.fs.makedir(dirPath);
            if (result.err === 0) return true;

            // Re-verify after makedir in case of platform-specific error codes for already-exists (e.g. 183 on Windows, 17 on macOS)
            stat = window.cep.fs.stat(dirPath);
            if (stat.err === 0 && stat.data && typeof stat.data.isDirectory === 'function') {
                return stat.data.isDirectory();
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function _isWritable(dirPath) {
        if (!_hasCepFs()) return false;
        try {
            if (!_ensureDir(dirPath)) return false;
            var testFile = dirPath + '/.write_test';
            var writeRes = window.cep.fs.writeFile(testFile, 'test');
            if (writeRes.err === 0) {
                window.cep.fs.deleteFile(testFile);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function init(extensionPath, userDataPath) {
        _useLocalStorage = false;
        _filePath = null;
        _dataDir = null;

        if (!_hasCepFs()) {
            _useLocalStorage = true;
            _loadFromLocalStorage();
            return;
        }

        // We prioritize the official Adobe-recommended directory for persistent settings:
        // macOS: ~/Library/Application Support/Adobe/com.cutefish.tools
        // Windows: %APPDATA%/Adobe/com.cutefish.tools
        // This avoids permission errors when installed in system-wide /Library/Application Support/Adobe/CEP/extensions
        // and protects user data (presets/settings) from being wiped out during extension updates or reinstalls.
        var targetUserDir = userDataPath ? (userDataPath + '/Adobe/com.cutefish.tools') : null;
        var extDataDir = extensionPath ? (extensionPath + '/data') : null;

        if (targetUserDir && _isWritable(targetUserDir)) {
            _dataDir = targetUserDir;
            _filePath = _dataDir + '/fishtools_save.json';

            // If the user file doesn't exist yet, try to pre-load from the extension's default file (from repository/installer)
            var userFileStat = window.cep.fs.stat(_filePath);
            if (userFileStat.err !== 0 && extDataDir) {
                var extFile = extDataDir + '/fishtools_save.json';
                var extFileStat = window.cep.fs.stat(extFile);
                if (extFileStat.err === 0) {
                    // Pre-load from extension folder
                    var readRes = window.cep.fs.readFile(extFile);
                    if (readRes.err === 0 && readRes.data) {
                        try {
                            _cache = JSON.parse(readRes.data) || {};
                            // Save it to the user path immediately so it's initialized
                            save();
                            return;
                        } catch (e) {}
                    }
                }
            }

            load();
            return;
        }

        // Fallback: Try Extension Path (e.g. if USER_DATA is somehow not writable)
        if (extDataDir && _isWritable(extDataDir)) {
            _dataDir = extDataDir;
            _filePath = _dataDir + '/fishtools_save.json';
            load();
            return;
        }

        // Fallback to LocalStorage if both paths are unwritable
        _useLocalStorage = true;
        _loadFromLocalStorage();
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
                // File doesn't exist yet or read error - try to restore from localStorage fallback
                _loadFromLocalStorage();
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

    function replace(newData) {
        _cache = newData || {};
        save();
    }

    function getDataDir() {
        return _dataDir;
    }

    function isLocalStorage() {
        return _useLocalStorage;
    }

    return {
        init: init,
        load: load,
        get: get,
        set: set,
        remove: remove,
        getAll: getAll,
        clear: clear,
        getDataDir: getDataDir,
        isLocalStorage: isLocalStorage,
        replace: replace
    };

})();

window.FileStore = FileStore;
