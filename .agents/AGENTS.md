# AGENTS.md — OpenFishTools Project Instructions

- Maintain vanilla JavaScript ES6 module structure in `client/js/modules/`.
- Ensure ExtendScript code in `host/` includes proper error handling.
- Use `./scripts/update_version.sh <version>` when bumping project versions.
- Document all changes in `changelog.md` under `## [X.Y.Z] - YYYY-MM-DD`.
- Windows installer is configured in `Installer/Windows/OpenFishTools_Setup.iss`.
- Mac installer builder script is located in `Installer/Mac/build_pkg.sh`.
