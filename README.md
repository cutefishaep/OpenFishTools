# OpenFishTools

OpenFishTools is a CEP (Common Extensibility Platform) extension panel for Adobe After Effects designed to streamline motion design workflows, animation controls, and project management.

Developed by **cutefishaep**.

---

## Features

### Graph Editor & Easing
- Interactive bezier curve handle adjustments.
- Easing presets with instant application and auto-apply toggles.

### AE to AM Converter
- Converts After Effects compositions into Alight Motion XML scenes.
- Recursive pre-composition embedding and keyframe data extraction.
- Optional expression baking and adjustment layer filtering options.

### Auto Save System
- Automatic background project backup into designated storage folders (`com.cutefish.tools/Auto Save`).
- Non-disruptive background saving with timestamped file naming formats: `ProjectName [HH.MM.SS] [DD-MM-YYYY].aep`.

### Layer & Transform Utilities
- Quick anchor point alignment grid.
- Smart auto-crop pre-compositions.
- Comp ratio and FPS format changers.
- Layer duplication, cropping, overlap, and screenshot tools.

### Text Animator Presets
- Custom text animation presets and one-click animator clearing tools.

---

## Installation

### Method 1: Automated Installer (Recommended)
Download the latest release from the [GitHub Releases](https://github.com/cutefishaep/OpenFishTools/releases) page:
- **macOS**: Run `OpenFishTools.pkg` and follow the setup wizard.
- **Windows**: Run `OpenFishTools_Setup.exe` and complete installation.

*Note:* Automated installers automatically configure `PlayerDebugMode` registry/plist settings required for CEP extensions.

### Method 2: Manual Installation
1. Download or clone this repository.
2. Move the `OpenFishTools` directory into your system's CEP extensions folder:
   - **macOS**: `/Library/Application Support/Adobe/CEP/extensions/`
   - **Windows**: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
3. Enable `PlayerDebugMode` for unsigned extensions:
   - **macOS**: `defaults write com.adobe.CSXS.12 PlayerDebugMode 1`
   - **Windows Registry**: `HKCU\Software\Adobe\CSXS.12` -> `PlayerDebugMode = "1"` (string).
4. Launch After Effects and navigate to **Window > Extensions > Fish Tools**.

---

## Prerequisites

Enable **Allow Scripts to Write Files and Access Network** under After Effects Preferences:
- **After Effects**: `Preferences > Scripting & Expressions`

---

## Building Installers

### macOS Installer (.pkg)
Requirements: macOS with Xcode Command Line Tools (`pkgbuild` and `productbuild`).

```bash
cd Installer/Mac
chmod +x build_pkg.sh
./build_pkg.sh
```

Output binary: `Installer/Mac/OpenFishTools.pkg`

### Windows Installer (.exe)
Requirements: Inno Setup 6.x.

Run the automated batch script:
```cmd
cd Installer\Windows
build.bat
```

Or manually compile `Installer\Windows\OpenFishTools_Setup.iss` inside Inno Setup Compiler.

Output binary: `Installer/Windows/OpenFishTools_Setup.exe`

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Disclaimer

OpenFishTools is an independent extension. Adobe and After Effects are registered trademarks of Adobe Inc. OpenFishTools is not affiliated with, endorsed by, or sponsored by Adobe Inc.
