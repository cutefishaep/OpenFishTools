# Changelog

All notable changes to the **Fish Tools** Adobe After Effects extension will be documented in this file.

## [1.0.4] - 2026-05-23
### Added
- **Script Write Permission Check**: Added startup permission check that warns users if "Allow Scripts to Write Files and Access Network" is not enabled in After Effects settings. Renders a beautiful 4-step modal to guide the user on how to enable it.
- **Y, X, and Scale Oscillate**: Added Y Oscillate, X Oscillate, and Scale Oscillate buttons to the Continuous section of Beat Effects. Includes an "Overlap Graph" option for Scale Oscillate that applies the custom Bezier easing curve from the Graph Editor directly to the After Effects bounce expression.

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
