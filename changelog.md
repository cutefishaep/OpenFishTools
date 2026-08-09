# Changelog

All notable changes to the **Fish Tools** Adobe After Effects extension will be documented in this file.

## [1.1.51] - 2026-08-09
### Added
- **Velocity Card Multi-Select Support**: Updated **TWIXTOR** (`_TWIX`) and **T-REMAP** (`_TMRE`) buttons on the Velocity card (Tools tab) to support multiple selected layers (`comp.selectedLayers`). Applies velocity effects, time remapping, and keyframe speed curves across all selected layers in a single undo group.

### Fixed
- **Idle Performance & Lag Optimization**: Resolved performance bottlenecks causing background CPU wakeups and UI micro-freezes:
  - **AutoSave Polling Overhead**: Increased project status check interval from 4s to 10s and integrated Page Visibility API (`document.hidden`) to pause IPC polling when the extension panel is hidden.
  - **Clock Timer CPU Wakeup**: Updated `loadSystemInfo` clock updater in `main.js` to pause its 1-second `setInterval` when the panel is hidden.
  - **Global MouseMove Event Overhead**: Added early-return guards to `onMouseMove` and `onSpeedMouseMove` handlers in `graph.js` so window-wide mouse movement incurs zero CPU cost when not dragging graph handles.

## [1.1.5] - 2026-08-08
### Fixed
- **Speed Graph Handle Mapping**: Fixed speed graph handle x-extent to use half-scale (`influence / 200`), matching After Effects' derivative-based speed graph behavior. Previously, speed handles meeting in the middle produced value graph handles that also met in the middle; now they correctly produce fully crossed value handles as in AE.
- **Speed Graph Drag Detection**: Added pointer capture support on the speed graph canvas so handle dragging continues to work reliably when the cursor moves outside the canvas area during a drag operation.
- **Speed Graph Tab Tooltip**: Updated the navigation bar tab tooltip from "Value Graph" to "Graph" to match the visible label.

### Changed
- **Speed Graph Handle Visuals**: Replaced dim dashed connection lines with solid accent-colored lines and redesigned knob handles (white fill, accent border, radius 9) so handles are clearly visible and distinguishable from the background.

## [1.1.4] - 2026-07-27
### Fixed
- **X FLIP & Y FLIP Expression Compatibility**: Fixed an expression error on Adobe After Effects CC 2018 (and Legacy ExtendScript expression engine) where `thisComp.frameRate` caused `property or method named 'frameRate' in Class 'Comp' is missing or does not exist`. Replaced `1 / thisComp.frameRate` with `thisComp.frameDuration` in both `_X_FLIP` and `_Y_FLIP` expression generators in `host/modules/animation.jsx`.
- **Auto Save Compatibility on CC 2018**: Fixed an issue where Auto Save failed to run on Adobe After Effects CC 2018. The `app.project.dirty` property does not exist (`undefined`) in CC 2018 ExtendScript, which evaluated `!!app.project.dirty` to `false` and caused dirty checks to falsely report "no changes". Added fallback handling for `undefined` dirty properties in `client/js/modules/autosave.js` and ensured project file paths are cloned safely before saving backup copies.
- **AE to AM Converter Progress Window**: Fixed an issue on Windows AE CC 2018 where the converter progress window got stuck on screen at "Done" (100%) and could not be closed. In Windows ScriptUI, calling `.close()` on a modeless palette window without calling `.hide()` first leaves the OS window rendered on screen while blocking ScriptUI message destruction. Updated `host/modules/aetoam.jsx` to call `progWin.hide()` prior to `.close()` and added an `onClose` window handler.

## [1.1.3] - 2026-07-27
### Added
- **Comprehensive Button Validation & Guidance**: All tool buttons now show a clear warning modal when required conditions are not met — users will no longer experience silent failures. Implemented across all host ExtendScript modules:
  - **Layer Tools** (`FRZ`, `FIT`, `DSH`, `MIR`, `ADJ`, `SHA`, `SOL`, `NUL`, `CAM`, `PRECOMP`, `PRECOMP_AUTOCROP`, `CENTERINCOMP`, `ALIGN_*`, `setAnchorPoint`, `CUT_*`): Return a structured JSON warning when no composition is open or no layer is selected.
  - **Effect Tools** (`HUE`, `FILL`, `TINT`, `BLUR`, `LUM`, `CURV`): Return a structured JSON warning when no composition is open or no layer is selected.
  - **OVERLAP**: Added specific keyframe check — now returns a warning if the selected layer has fewer than 2 keyframes on Position, Scale, or Rotation, explaining exactly what is needed.
  - **Animation/Beat Tools** (`TWIX`, `TMRE`, `GHST`, `WARP`, `MIDWAVE`, `HUESPIN`, `FISHEYE`, `OSCILLATE`, `Y_BEAT`, `X_BEAT`, `Y_FLIP`, `X_FLIP`, `SCALE_BEAT`, `SWING`, all Panning tools, all Transition tools, all Cutefish Style tools): Return structured JSON warnings with contextual guidance (e.g. beat marker tools include a tip to use Beat Maker first).
  - **Beat Tap**: Now shows a warning modal if clicked when no composition is open.
  - **Auto Beat Detect**: Now validates for active composition, selected layer, and audio presence separately — each with a specific error message.
  - **Clear Beats**: Shows a warning if no composition is open.
  - **Graph Editor (Read/Apply Ease, Read Velocity, Apply Velocity)**: Now show contextual warning modals when no keyframe is selected or operation fails.
- **Enhanced `_runTool()` response handler** (`tools.js`): Improved to additionally catch plain `ERROR:` string prefixes from ExtendScript (legacy format) and display them as error modals.

### Changed
- **Modal Theme Consistency**: Overhauled `modal.js` and `style.css` to remove all hardcoded colors from modal components. All modal types now fully follow the active theme using CSS custom properties:
  - **Warning** modal: border, title, and button now use `var(--accent)` instead of hardcoded `#ffbb33` (yellow).
  - **Error** modal: button now uses `var(--danger)` via a `.danger` CSS class instead of inline styles.
  - **Primary button** text color changed from hardcoded `#000` to `var(--bg)` — adapts correctly to light/dark themes.
  - **Secondary (Cancel) button** redesigned from flat `--surface2` background to transparent with `--border` outline — visually distinct and consistent across all themes.
  - Button typography updated: `text-transform: uppercase`, `font-weight: 700`, `letter-spacing: 0.5px` — consistent with the rest of the UI.

### Fixed
- **PRECOMP_AUTOCROP Anchor Centering**: Updated `_PRECOMP_AUTOCROP` in `host/modules/layers.jsx` so that the newly created cropped precomp layer's anchor point is placed directly in the center `[width / 2, height / 2]` instead of top-left `[0, 0]`, with position offset dynamically maintained so visual placement remains unchanged.
- **Center in Comp 3D Layer Offset**: Fixed `_CENTERINCOMP` in `host/modules/layers.jsx` by utilizing AE's native `Center In View` command (`app.findMenuCommandId("Center In View")`) with complete script fallback handling 3D layers, separated position dimensions, and parent transformation space (`fromComp`).

## [1.1.2] - 2026-07-26


### Fixed
- **SWING Tool Handler Registration**: Fixed `TypeError: undefined is not an object (Line 12)` by registering `tools.SWING = function () { return _SWING(); };` in `host/modules/animation.jsx`.

## [1.1.1] - 2026-07-26
### Added
- **Rich Release Notes Auto-Formatter**: Added automatic Markdown-to-HTML parsing in the update module (`update.js`). Dynamically converts GitHub Release notes into styled version headers, color-coded section badges (`ADDED`, `FIXED`, `CHANGED`, `REMOVED`), highlighted bold titles, and inline code tags.
- **SignPath Code Signing Integration**: Integrated official `SignPath` PowerShell module (`Submit-SigningRequest` with `-Force` overwrite) in `.github/workflows/release.yml` for automated Windows setup executable digital signing in GitHub Actions.
- **Windows Installer & Uninstaller Branding**: Converted `Logo.svg` into high-resolution `SetupIcon.ico` (256x256) and configured `SetupIconFile` & `UninstallDisplayIcon` in Inno Setup (`OpenFishTools_Setup.iss`), ensuring the OpenFishTools logo icon is displayed in Windows Explorer, installer wizards, and Windows Control Panel (*Add or Remove Programs*).
- **Debug Card Modal Triggers**: Added a dedicated "Modal Triggers" section to the Debug card in settings featuring one-click test triggers for `UPDATE` (with rich release notes), `CONFIRM`, `INFO`, `PROMPT`, `WARN`, and `ERROR` popups.
- **Manual Workflow Release Toggle**: Added a `create_release` toggle input to `workflow_dispatch` in GitHub Actions, allowing manual test builds without creating public GitHub Releases.

### Changed
- **Inno Setup False Positive Optimization**: Optimized `Installer/Windows/OpenFishTools_Setup.iss` compression settings from `lzma2/ultra64` to `lzma2/max` with `SolidCompression=no` and added complete `VersionInfo` metadata (company, description, product name, copyright) to prevent false positive detections on VirusTotal.
- **Update Modal Header Polish**: Simplified update popup title to `UPDATE AVAILABLE` to prevent duplicate version number displays between modal header and release notes body.

### Fixed
- **Modal Scrollbar & Body Overflow**: Enhanced `ModalModule` and CSS with auto-scrolling body max-height, custom scrollbar styling, and responsive modal width (`modal-update`) for long release notes.

## [1.1.0] - 2026-07-25
### Added
- **Panning Beat Effect Suite**: Added a dedicated **Panning** section in Beat Effects featuring 5 tool buttons: `POSITION`, `ROTATION`, `SCALE`, `MIX PR`, and `MIX ALL`. Generates a parent Null layer powered by organic multi-frequency sine wave expressions with customizable `Freq` (frequency/speed) and `Amp` slider controls.
- **Mix PR Tuned Defaults**: Configured `Mix PR` mode default slider parameters to `Freq: 7`, `Position: 10`, and `Rotation: 1`.
- **Y FLIP Beat Effect**: Added `Y_FLIP` tool in Beat Continuous section with alternating vertical bounces and instantaneous teleportation 1 frame prior to the next beat marker.

### Fixed
- **X FLIP & Y FLIP Scale Bounds**: Added `inPoint`/`outPoint` time guards to scale flip expressions, ensuring scale stays at normal `[100, 100]` outside the null layer's timeline range.
- **Oscillate Smooth Attack Envelope**: Eliminated abrupt initial velocity jerk at beat markers by applying a smooth ramp-in attack envelope `(1 - Math.exp(-t * attack))` and introducing an `Attack` control slider (default `40`).
- **MID-WAVE Preset Tuning**: Updated default MID-WAVE properties to `Tile Output Height/Width: 150`, `Wave Width: 1200`, `Wave Speed: 1.3`, and `Phase: 90°`.
- **GitHub Action Release Versioning**: Fixed whitespace accumulation bug in `scripts/update_version.sh` regex when updating `CSXS/manifest.xml` Version tag.

## [1.0.9] - 2026-07-23
### Added
- **AE to AM Converter Dashboard Card**: Added a dedicated "Ae > Am Converter" card on the dashboard featuring toggles for "Bake Expressions" (enabled by default) and "Import Adjustment Layers". Runs clean, comment-free ExtendScript with a lightweight non-modal status window titled `Ae > Am Converter`.
- **Auto Save Folder & Custom Naming**: Redesigned Auto Save to generate timestamped `.aep` backups in `[DataDir]/Auto Save/` using the format `ProjectName [HH.MM.SS] [DD-MM-YYYY].aep`. Added a folder icon button on the card header to directly open the Auto Save directory in Explorer or Finder.
- **MIT License & Legal Disclaimer**: Added official `LICENSE` file under the MIT License with copyright holder `cutefishaep`, along with clear disclaimers clarifying independence from Adobe Inc.
- **Platform Installers & Build Automation**: Created automated Mac (`build_pkg.sh`) and Windows (`build.bat`) build scripts producing clean output files (`OpenFishTools.pkg` and `OpenFishTools_Setup.exe`) with auto-detected signing capabilities.
- **GitHub Release CI/CD**: Added `.github/workflows/release.yml` for automated GitHub Releases, supporting tags like `1.0.9` or `v1.0.9` with clean release titles.

## [1.0.8] - 2026-07-23
### Fixed
- **Cut Front / Back**: Added boundary guard so the cut only applies when the playhead is strictly inside the layer's in/out range, preventing accidental trims when the playhead is outside the layer. Snapshot layer references before the loop to avoid stale references after layer operations.
- **Cut Middle**: Fixed layer ordering — the back portion now correctly lands *below* the front portion in the layer stack (`moveAfter` instead of `moveBefore`). Added boundary guard and saved `outPoint` before splitting so the duplicate always has the correct end time.
- **Precomp Auto-crop (right-click)**: After the precomp is resized to its bounding box, the precomp layer's anchor point is now reset to `[0, 0]` and its position set to `[minX, minY]`, preserving the original visual position in the parent comp. Previously the anchor remained at the center of the old comp size, causing the layer to visually jump to the center after precomping.

## [1.0.7] - 2026-06-05

### Added
- **Text Animate Trash Button**: Added a trash icon button to the Text Animate card header to quickly clear all FishTools-applied animators, dynamic slider controls, and markers (`IN`/`OUT`) from the selected layer.

### Changed
- **Dynamic Auto-Fitting Stagger Delay**: Re-engineered stagger delay calculation inside the Text Animate expressions. It now dynamically calculates the remaining time between markers and automatically compresses the delay for longer texts so that animations never overflow or get truncated.

### Fixed
- **Preset Expression ReferenceError**: Resolved a `ReferenceError: bounce is not defined` inside After Effects expressions for standard presets by conditionally generating code blocks inside ExtendScript instead of compiling the check literally into AE.
- **ExtendScript Marker ReferenceError**: Fixed `ReferenceError: Function markers.key is undefined` by shifting from `.key(index)` to the correct `.keyValue(index)` ExtendScript API for Marker properties.

## [1.0.6] - 2026-06-02
### Added
- **Recommended Tools Card**: Added a new "Recommended Tools" section to the main dashboard showcasing "WOMTools" by "womxsy" with direct TikTok redirection.
- **ShowIntro Setting**: Integrated the startup write permission popup with settings (`showIntro`). Clicking "Got It!" now permanently dismisses the warning dialog.
- **Snap Scroll Setting**: Added a dedicated toggle under the settings panel to enable/disable card snap-scroll functionality.
- **Scale Beat (Continuous Beat Effect)**: Added `SCALE_BEAT` tool to trigger uniform scale decays based on layer or comp markers, complete with controllable Amp and Decay sliders.
- **Google Translate Text to Speech Integration**: Added a "Text To Speech" dashboard card using Google Translate's keyless TTS API. Offers 100% free, unlimited generation across 13 languages, interactive in-panel text previewing, and automatic After Effects audio import with styled box-wrapped subtitle layers.

### Changed
- **OSCILLATE Direction**: Refactored the oscillate expression to start movement smoothly from the default layer position (0,0) and animate clockwise (Right -> Down -> Left -> Up).
- **Descriptive Null Layer Names**: Generated Beat Effect control null layers now receive clear, descriptive names mapping to their utility (e.g., `Oscillate_Null`, `Y_Beat_Null`, `X_Beat_Null`, `Scale_Overlap_Null`).
- **Global Animation Control**: Disabling animations in the settings now successfully disables both UI transitions and card snap-scroll animations globally.
- **Precomp Right-Click Shortcut**: Added a right-click shortcut on the Precomp button to automatically crop the precomp size according to the bounding box of the inner objects (using the Auto Crop menu command).
- **Update Redirection URL**: Updated the update check fallback link to point directly to `https://cutefish.my.id/#fishtoolupdate`.

### Fixed
- **SCALE OVER Duration Bug**: Fixed a bug where Scale Over effects remained active outside of the generated controller null's inPoint/outPoint range.
- **Comment Cleanup**: Stripped all single-line and multi-line comments from all project JavaScript (`.js`) and ExtendScript (`.jsx`) files to clean production scripts.
- **X BEAT Reference Bug**: Fixed a reference error in the `X_BEAT` tool where `positionProp` was used without being declared.
- **CEP Base64 Encoding Bug**: Fixed a reference error in `tts.js` where `window.cep.fs.encoding` was used instead of the correct `window.cep.encoding.Base64` constant.

## [1.0.5] - 2026-05-24
### Added
- **X BEAT and Y BEAT (Continuous Beat Effects)**: Replaced `X_OSCILLATE` and `Y_OSCILLATE` with `X_BEAT` and `Y_BEAT`, implementing symmetrical pure decay jumps (`amp / Math.exp(t * decay)`) with new default settings (Amp: 500, Decay: 20). Only takes effect during the Null layer's duration.
- **Smart Marker Detection (Layer & Composition Fallback)**: Refactored `Flash` (EXPO), `S_Shake` (SHKE), `Lens Blur` (LENS), `Scale Overlap` (SCALE_OVERLAP), `X BEAT`, and `Y BEAT` to use expressions that dynamically prefer target layer markers (`thisComp.layer(index + 1).marker`) and fall back to composition markers (`thisComp.marker`) if no layer markers are present. This prevents expression errors and ensures compatibility with any marker workflow.

## [1.0.4] - 2026-05-24
### Added
- **Script Write Permission Check**: Added startup permission check that warns users if "Allow Scripts to Write Files and Access Network" is not enabled in After Effects settings. Renders a beautiful 4-step modal to guide the user on how to enable it.

### Fixed
- **Settings Persistence on macOS/Windows**: Resolved issue where settings did not persist on macOS/Windows by shifting the save location to the official Adobe-recommended user data directory (`~/Library/Application Support/Adobe/com.cutefish.tools` on macOS and `%APPDATA%/Adobe/com.cutefish.tools` on Windows). This avoids OS permissions errors when the plugin is installed in system-wide directories and prevents user settings from being wiped during plugin updates/reinstalls.
- **Theme and Easing Initialization**: Fixed issue where Theme, Easing Graph, and Style settings would revert to default on panel reload by moving the initialization code inside `DOMContentLoaded` event and ensuring custom dropdown selectors are ready before restoring settings.
- **Tab Preservation on Theme Change**: Fixed bug where selecting a different theme or UI style would reset the active workspace tab to the default "Home" tab.

## [1.0.3] - 2026-05-10
### Added
- **Persistent Beat Maker**: Threshold, Channel, and last active sub-tab (Manual/Auto) are now automatically saved and restored.
- **Solid Block Slider**: Refined the Material You slider to a perfect "blocking" style matching modern Android volume controls.

### Fixed
- **UI State Persistence**: Fixed critical issue where Theme, Style, and Animation settings would reset to default after a UI reload.
- **Beat Maker Settings Logic**: Fixed a reference error that prevented detection settings from loading on startup.

## [1.0.2] - 2026-05-10
### Added
- **CC2018 Legacy Support**: Full refactor for Chromium 57 compatibility (Adobe CC 2018).
    - Replaced `inset` shorthand with explicit `top/right/bottom/left`.
    - Replaced flexbox `gap` with smart margin-based spacing (`> * + *`).
    - Added fallback for `backdrop-filter` and `clamp()`.
    - Fixed `scale` shorthand and added `-webkit-` prefixes for stable rendering.
- **Pastel Design System**: Reworked all Light Mode themes (Vanilla, Pandan, Ube, Peach, Blue) with soft pastel backgrounds for better eye comfort.
- **Enhanced Capsule Nav**: Widened the pill bar and added a circular "block" active indicator behind icons.
- **Factory Reset**: Improved "Reset to Default" logic to physically delete the save file from disk.

### Changed
- **QRIS Modal Polish**: Optimized layout and image sizing to fit perfectly within small CEP panels.
- **Clean Code Architecture**: Stripped all instructional comments, placeholders, and developer notes from the production codebase for maximum performance.

---

## [1.0.1] - 2026-05-10
### Added
- **Cutefish Style Toolkit**: A dedicated signature effects card featuring:
    - **Background**: `Colorize` (Random Tint), `Scanline` (S_TVDamage), and `Mono` (B&W).
    - **Object**: `Starburst`, `Grid`, and `Radio` styles for solid layers.
    - **Aura Effects**: `Glow Aura` (S_GlowAura) and `Solid Aura` for advanced highlighting.
    - **Shatter Tools**: `Simple` and `Slow (0 Gravity)` shatter presets.
- **Velocity Management**: 
    - Added **Velocity Preview** canvas for real-time easing curve visualization.
    - Implemented **Speed Preset Library** to save, load, and manage custom animation curves.
- **Dual Design System**: Seamlessly switch between **Material You** (Modern/Rounded/Pill) and **Simple Flat** (Minimalist/Classic/Square) aesthetics.
- **Intelligent Grid Architecture**: Toolbox and Credit sections now use a fluid `auto-fit` system that wraps perfectly based on window width.
- **Themed Form Components**: Complete overhaul of Inputs, Toggle Switches, and Custom Select dropdowns to match active themes.
- **Social Credits Restoration**: Re-implemented the full social presence section (YouTube, TikTok AEP/RBX, Instagram, GitHub) with technical handles.
- **Beat Maker Animations**: Added themed glow effects and rhythmic pulse animations to the manual tap button.
- **Enhanced Anchor Point**: Redesigned the 3x3 grid with tactile feedback, themed glows, and optimized click areas (32px).


### Changed
- **Typography & Visibility**: Brightened muted text and section labels across all dark modes (Matcha, Slate, Dracula, Ocean, Forest) for superior readability.
- **Color Picker Fix**: Implemented real-time color previews on trigger buttons and a modernized popup action bar.
- **Fixed Align Logic**: Locked the 'Align' toolset to a strict 3x2 grid to preserve professional muscle memory.
- **Symmetry & Alignment**: Refined the To-Do list layout for perfect vertical symmetry between inputs and action buttons.
- **Shadows & Depth**: Implemented sophisticated shadow systems and glassmorphism-lite overlays for a premium feel.

---

## [0.0.8] - 2026-03-06
### Added
- **Bubble Text Tool**: Create speech bubbles with text that automatically positions and sizes itself.
- **Smart Anchor Point**: Bubble text anchor point is automatically set to the bottom-right or bottom-left corner depending on the bubble's position.
- **Sender/Receiver Modes**: Toggle between sender and receiver bubble styles.
- **Client-Side Styling**: Added comprehensive CSS for a modern, glassmorphism-based UI.
- **Touch-Friendly Design**: Added `outline: none` and `-webkit-tap-highlight-color: transparent` to all interactive elements for better mobile/touch support.

### Changed
- **UI Polish**: Improved card header styling to prevent style bleeding into content.
- **Performance**: Optimized script execution by removing redundant guide text and unused CSS.

---

## [0.0.7] - 2026-02-24
### Added
- **Duplicate Comp (DUP)**: True deep comp duplicator that smart-renames and replaces selected pre-comp layers automatically.
- **Transitions Panel**: One-click Scale & Fade transitions (In & Out) matching smart CC2017 ease formulas.
- **Task Tracker Dashboard**: To-Do list tracking logic and a Sticky Notes auto-save area.
- **Fluid Toolbox UI**: Buttons now dynamically wrap cleanly without squishing when resizing panel width.
- **Made in Indonesia**: Added signature heart flair to Info footer.

### Changed
- **Codebase Minification**: Reduced bundle size via Python script removal of large instructional logic and code comments.

### Removed
- **Auto-Updater**: Removed the GitHub release checker due to internal request conflicts running on After Effects CC 2017's engine.

---

## [0.0.6] - 2026-02-15
### Added
- **Lens Blur (LENS)**: New beat-synced blur tool (Flash-like graph) in the Beat card.
- **Beat Card**: Dedicated UI card for rhythmic effects (Ghost, Flash, Shake, Warp, Lens Blur).
- **GUI Error Handler**: Replaced native alerts with styled modal popups for errors and warnings.

### Changed
- **Overlap**: Consolidated 2D & 3D buttons into a single smart "OVERLAP" button.
- **Z-Graph Easing**: Implemented adaptive asymmetric easing for Overlap (steepest point at keyframes).
- **Settings Persistence**: Fixed issue where UI state (Last Tab) wasn't saving by switching to reliable `localStorage`.
- **Null Values**: Overlap nulls now use absolute keyframe values instead of deltas for easier graph editing.

---

## [0.0.4] - 2026-02-14
### Added
- **Velocity Tools**: Added 4 new motion tools: Ghost, Exposure Flash, S_Shake, and Wave Warp.
- **Auto-Adjustment Layers**: Velocity tools now automatically create and animate Adjustment Layers above the selected footage.
- **Smart Easing**: All Velocity tools use custom "Fast Start -> Slow End" easing curves for punchy animation.
- **Wave Warp**: "Smooth Noise" wave type with maximized initial velocity (-50000) for sharp impact.

### Changed
- **S_Shake**: Refactored to use Adjustment Layer instead of direct effect application.
- **Performance**: Optimized script execution by removing redundant guide text and unused CSS.

---

## [0.0.3] - 2026-02-13
### Added
- **Enhanced Null Tool**: Right-click on Null tool now creates a "Controller" Null, centers it to selected layers, and automatically parents them.

### Changed
- **UI Organization**: Reordered Tools tab cards to: Anchor Point, Toolbox, Actions, and Color Palette.
- **Default State**: The extension now opens the Dashboard (Home) tab by default.

---

## [0.0.2] - 2026-02-13
### Added
- **Offline Assets**: Bundled Material Icons and Roboto font for full offline capability.
- **Splash Screen**: New opening animation featuring the Fish Tools logo.
- **Release Notes Renderer**: GitHub-style markdown rendering for updater release notes.

### Changed
- **UI Polish**: Improved card header styling to prevent style bleeding into content.
- **Performance**: Optimized splash screen animation timing.

---

### Added
- **Cubic Bezier Graph Editor**: A visual easing editor for keyframes.
- **Preset Library**: Save and load custom easing curves with automatic thumbnail generation.
- **Universal Modal System**: Custom-styled alerts, confirmations, and prompts replacing native browser popups.
- **Premium Tooltips**: Glassmorphism-styled tooltips with dynamic boundary-aware positioning.
- **Auto-Apply Feature**: Toggle for real-time graph updates while dragging handles.
- **Snap to Grid**: Toggle for precise 0.1 increment handle positioning (hold Shift for temporary snap).
- **Overshoot Mode**: Support for elastic/overshoot easing via inertial bounce expressions.
- **Advanced Theme Customization**: Real-time preview and editing of Accent, Background, Card, Text, and Border colors.

### Changed
- **Codebase Refactoring**: Surgical cleanup of the entire project.
- **Host Logic**: Refactored `index.jsx` to strict ES3 for maximum After Effects compatibility.
- **Client Logic**: Refactored UI scripts to clean, modular ES6.
- **UI UX Polish**: Redesigned Graph UI with a "Pro Blueprint" grid and balanced action buttons.
- **Stability**: Fixed global scoping issues affecting the "Reset to Default" functionality.

### Removed
- **Debug Logs**: Stripped all `console.log` and `$.writeln` statements from production code.
- **Instructional Comments**: Cleaned up codebase by removing all instructional placeholders and developer notes.

---

## [0.0.1] - 2026-02-10
### Added
- **Initial Release**: Core toolbox functionality for After Effects.
- **Layer Tools**: Freeze Frame, Fit to Comp, Drop Shadow, Mirror, Adjustment Layer.
- **Creation Tools**: Shape, Solid, Null, Camera, Hue/Sat.
- **Effect Tools**: Fill, Tint, Blur, Lumetri, Curves.
- **Anchor Point System**: 3x3 grid for quick anchor point adjustments.
- **System Dashboard**: Real-time display of OS, AE version, and Project name.
- **Session Stopwatch**: Built-in timer for tracking work hours.
- **Update System**: Integrated GitHub release checker.
- **Windows Installer**: Automated `.bat` script for easy extension installation.
