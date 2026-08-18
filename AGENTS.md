# AGENTS.md — OpenFishTools Project Guide

This document contains guidelines, architectural rules, and workflows for AI agents and developers working on the **OpenFishTools** repository.

---

## 📌 Project Overview
**OpenFishTools** is an open-source CEP (Common Extensibility Platform) extension for **Adobe After Effects**. It equips motion designers and animators with beat continuous effects, panning suites, keyframe tools, expression generators, and custom UI modules.

---

## 🛠️ Technology Stack & Architecture

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5 / CSS3 / ES6 JS | Located in `client/`. Vanilla JS modules without heavy frameworks. |
| **Host Engine** | ExtendScript (`.jsx`) | Located in `host/`. Communicates with After Effects DOM via `CSInterface.evalScript`. |
| **Extension Manifest** | `CSXS/manifest.xml` | Configures CEP extension bundle (`com.cutefish.tools.panel`). |
| **ZXP Package** | Universal Archive | `scripts/build_zxp.bat` packaging `OpenFishTools.zxp`. |
| **Windows Installer** | Inno Setup 6 | `Installer/Windows/OpenFishTools_Setup.iss` compiling `OpenFishTools.exe`. |
| **Mac Installer** | `pkgbuild` & `productbuild` | `Installer/Mac/build_pkg.sh` producing `OpenFishTools.pkg`. |
| **CI/CD Automation** | GitHub Actions | `.github/workflows/release.yml` automating builds, release note parsing, and deployment. |

---

## 📐 Coding Standards & Guidelines

### 1. Client-Side JavaScript (Vanilla ES Modules)
- Keep frontend logic decoupled into ES modules under `client/js/modules/`.
- Use the unified modal system (`client/js/modules/modal.js`) for popups (`UPDATE`, `CONFIRM`, `INFO`, `WARN`, `ERROR`).
- Render HTML safely; use `formatReleaseNotes` parser in `update.js` when presenting release notes.

### 2. ExtendScript & Host Communication
- Ensure ExtendScript helper functions in `host/` fail gracefully without crashing After Effects main loop.
- Use `inPoint` / `outPoint` timeline guards on dynamic expression generators.

### 3. Versioning & Changelog
- When bumping version, use the provided version updater:
  ```bash
  chmod +x scripts/update_version.sh
  ./scripts/update_version.sh <new_version>
  ```
- Always document changes in `changelog.md` following Keep a Changelog formatting under `## [X.Y.Z] - YYYY-MM-DD`.

### 4. Windows & Mac Installers
- **Windows**: Uses `SetupIcon.ico` (256x256 converted from `Logo.svg`) for `SetupIconFile` and `UninstallDisplayIcon={app}\SetupIcon.ico`.
- **Mac**: Package builder uses `build_pkg.sh` to package CEP extension files into `/Library/Application Support/Adobe/CEP/extensions/OpenFishTools`.

---

## 🚀 Build & CI/CD Workflows

### Manual Test Run
Manual runs on GitHub Actions default to `create_release: false`, building Mac `.pkg` and Windows `.exe` as downloadable **Artifacts** without creating a public GitHub Release.

### Publishing Official Release
To publish an official GitHub release:
```bash
git tag v1.1.1
git push origin v1.1.1
```
The workflow will extract the latest version section from `changelog.md`, format rich release notes, attach `OpenFishTools.exe` & `OpenFishTools.pkg`, and publish the release.

### Deployment (Machine-Wide Only)
Deployments must strictly target system/machine-wide CEP directories, never user AppData. Do not copy files into `%APPDATA%\Adobe\CEP\extensions\`.

**Windows (Machine-Wide):**
- Target: `%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\OpenFishTools` (or `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\OpenFishTools`)
- Run `Installer\Windows\deploy.bat` (Run as Administrator).

**macOS (Machine-Wide):**
- Target: `/Library/Application Support/Adobe/CEP/extensions/OpenFishTools`
- Run `bash Installer/Mac/deploy.command` (with `sudo`).

