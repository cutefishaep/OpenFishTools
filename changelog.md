# Changelog

All notable changes to the **Fish Tools** Adobe After Effects extension will be documented in this file.

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
