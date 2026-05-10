'use strict';


var FileStore = (function () {

    var _filePath = null;
    var _cache = {};

    function _hasCepFs() {
        return !!(window.cep && window.cep.fs);
    }

    function _ensureDir(dirPath) {
        if (!_hasCepFs()) return;
        window.cep.fs.makedir(dirPath);
    }

    function init(extensionPath) {
        if (!extensionPath) return;
        var dataDir = extensionPath + '/data';
        _ensureDir(dataDir);
        _filePath = dataDir + '/fishtools_save.json';
        load();
    }

    function load() {
        if (!_filePath || !_hasCepFs()) {
            
            try {
                var raw = localStorage.getItem('fishToolsFileStore');
                if (raw) _cache = JSON.parse(raw);
            } catch (e) {}
            return;
        }
        var result = window.cep.fs.readFile(_filePath);
        if (result.err === 0 && result.data) {
            try { _cache = JSON.parse(result.data); } catch (e) { _cache = {}; }
        }
    }

    function save() {
        var json = JSON.stringify(_cache, null, 2);
        if (!_filePath || !_hasCepFs()) {
            try { localStorage.setItem('fishToolsFileStore', json); } catch (e) {}
            return;
        }
        window.cep.fs.writeFile(_filePath, json);
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
        return JSON.parse(JSON.stringify(_cache));
    }

    function clear() {
        _cache = {};
        if (_hasCepFs() && _filePath) {
            window.cep.fs.deleteFile(_filePath);
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
