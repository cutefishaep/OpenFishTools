const fs = require('fs');
const path = require('path');

let errors = [];
let checkedFiles = [];

function checkJsxFile(filePath) {
    try {
        let code = fs.readFileSync(filePath, 'utf8');
        // ExtendScript preprocessor directives like #include, #target
        code = code.replace(/^\s*#(include|target|targetengine|script|strict)\b[^\r\n]*/gm, '/* $& */');
        new Function(code);
        checkedFiles.push({ file: path.relative(process.cwd(), filePath), status: 'OK' });
    } catch (e) {
        errors.push({ file: path.relative(process.cwd(), filePath), error: e.message });
        checkedFiles.push({ file: path.relative(process.cwd(), filePath), status: 'FAIL', error: e.message });
    }
}

function checkClientJsFile(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        // Strip ES module import/export keywords for node Function constructor check
        const cleaned = code
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '/* import */')
            .replace(/import\s+['"][^'"]+['"];?/g, '/* import */')
            .replace(/export\s+default\s+/g, '/* export default */ ')
            .replace(/export\s+\{[^}]*\};?/g, '/* export */ ')
            .replace(/export\s+(const|let|var|function|class|async\s+function)\s+/g, '$1 ');
        new Function(cleaned);
        checkedFiles.push({ file: path.relative(process.cwd(), filePath), status: 'OK' });
    } catch (e) {
        errors.push({ file: path.relative(process.cwd(), filePath), error: e.message });
        checkedFiles.push({ file: path.relative(process.cwd(), filePath), status: 'FAIL', error: e.message });
    }
}

function scanDir(dir, isClient = false) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
            scanDir(fullPath, isClient);
        } else if (entry.isFile()) {
            if (entry.name.endsWith('.jsx')) {
                checkJsxFile(fullPath);
            } else if (isClient && entry.name.endsWith('.js')) {
                checkClientJsFile(fullPath);
            }
        }
    }
}

console.log('🔍 Scanning ExtendScript (host/) and Client JS (client/js/)...');
scanDir('host', false);
scanDir('client/js', true);

console.log('\n================== SYNTAX CHECK RESULTS ==================');
checkedFiles.forEach(f => {
    if (f.status === 'OK') {
        console.log(`  ✅ [PASS] ${f.file}`);
    } else {
        console.log(`  ❌ [FAIL] ${f.file} -> ${f.error}`);
    }
});

console.log('==========================================================');
console.log(`📊 Total Files Checked : ${checkedFiles.length}`);
console.log(`✅ Passed               : ${checkedFiles.length - errors.length}`);
console.log(`❌ Failed               : ${errors.length}`);

if (errors.length > 0) {
    console.log('\n❌ SYNTAX CHECK FAILED with errors.');
    process.exit(1);
} else {
    console.log('\n🎉 ALL SCRIPTS PASSED SYNTAX CHECK WITH ZERO ERRORS!');
    process.exit(0);
}
