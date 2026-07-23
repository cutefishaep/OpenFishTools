# OpenFishTools — Installer

This folder contains platform-specific installers for the **OpenFishTools** CEP Extension (`com.cutefish.tools`) for Adobe After Effects.

---

## Folder Structure

```
Installer/
├── Mac/
│   ├── build_pkg.sh              ← Run this to build the .pkg installer
│   ├── scripts/
│   │   ├── preinstall            ← Removes old installation before install
│   │   └── postinstall           ← Enables PlayerDebugMode + creates uninstaller
│   └── resources/
│       ├── welcome.html          ← Installer wizard welcome screen
│       ├── conclusion.html       ← Installer wizard finish screen
│       └── distribution.xml      ← productbuild distribution definition
└── Windows/
    └── OpenFishTools_Setup.iss   ← Inno Setup 6 script
```

---

## Mac (.pkg) Installer

### Requirements
- macOS (built-in `pkgbuild` + `productbuild` — no extra tools needed)
- Xcode Command Line Tools: `xcode-select --install`
- *(Optional)* Apple Developer ID Installer certificate for signing

### Build Steps

```bash
cd Installer/Mac
./build_pkg.sh
# Output: Installer/Mac/OpenFishTools_v1.0.7.pkg
```

### Signing (Recommended for Distribution)

Open `build_pkg.sh` and set your certificate:
```bash
SIGNING_IDENTITY="Developer ID Installer: Your Name (XXXXXXXXXX)"
```
Find your certificate name with:
```bash
security find-identity -v -p basic | grep "Developer ID Installer"
```

### What the Installer Does
1. **preinstall**: Removes any existing `OpenFishTools` from system/user CEP paths
2. Copies extension to `/Library/Application Support/Adobe/CEP/extensions/OpenFishTools/`
3. **postinstall**: 
   - Enables `PlayerDebugMode=1` for **CSXS 9–12** (CC 2018–CC 2027) system-wide and per-user
   - Creates `Uninstall OpenFishTools.tool` inside the extension folder

### Uninstalling on Mac
Open Finder → `/Library/Application Support/Adobe/CEP/extensions/OpenFishTools/` → double-click **Uninstall OpenFishTools.tool**

---

## Windows (Inno Setup) Installer

### Requirements
- [Inno Setup 6](https://jrsoftware.org/isdl.php) (free)

### Build Steps
1. Install Inno Setup 6
2. Open `Installer/Windows/OpenFishTools_Setup.iss` in Inno Setup Compiler
3. Click **Build → Compile** (or press `Ctrl+F9`)
4. Output: `Installer/Windows/OpenFishTools_v1.0.7_Setup.exe`

### What the Installer Does
- Copies extension files to `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\OpenFishTools\`
- Sets `PlayerDebugMode=1` in the registry for **CSXS 9–12** (CC 2018–CC 2027):
  - `HKCU\Software\Adobe\CSXS.9` through `CSXS.12`
  - `HKLM\Software\Adobe\CSXS.9` through `CSXS.12`
  - Also sets `Wow6432Node` paths for 32-bit compatibility
- Built-in uninstaller (Add/Remove Programs)

### Anti-virus
The installer contains **only script files and web assets** — no compiled executables. Inno Setup is widely recognized and trusted by AV engines.

---

## CEP PlayerDebugMode — Version Reference

| Adobe CC Version | CSXS Version |
|------------------|-------------|
| CC 2018          | CSXS 9      |
| CC 2019          | CSXS 9      |
| CC 2020          | CSXS 10     |
| CC 2021          | CSXS 11     |
| CC 2022          | CSXS 11     |
| CC 2023          | CSXS 12     |
| CC 2024          | CSXS 12     |
| CC 2025          | CSXS 12     |
| CC 2026          | CSXS 12     |
| CC 2027          | CSXS 12     |
