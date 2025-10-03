# Changelog

All notable changes to this extension will be documented in this file.

## [1.2.0] - 2025-10-02

### Added

- Multi-workspace support for `build_runner watch`, allowing independent watchers per workspace folder with automatic cleanup.
- **Dart Build Runner: Build File** command accessible from the editor and file explorer context menus.
- Localized command title for the single-file build command (English and Spanish).

### Changed

- The single-file build command now detects `part` directives to include generated targets even if the files are missing.
- Updated documentation to reflect the new command name and context menu locations.
- Project structure refactored to follow clean architecture principles.

## [1.1.0] - 2025-06-06

### Added

- **Keyboard Shortcuts**: Use `Ctrl+Shift+B`/`Cmd+Shift+B` to start or stop the watcher.
- **Filtered Build Command**: Rebuild only the active file with `Ctrl+Alt+B`/`Cmd+Alt+B`.
- **Automatic Restart**: The watcher now automatically restarts if it stops unexpectedly, such as after running `pub get`.
- **Refactor Code**: The project has been refactored.

## [1.0.1] - 2024-11-06

### Changed

- Extension name and icon, updated.

## [1.0.0] - 2024-11-05

### Added

- **Multilingual Support**: Added support for English and Spanish using `vscode-nls`.
- **Start and Stop `build_runner watch` Command**: Introduced a command to start the `build_runner watch` process, which can be stopped using a button in the status bar.
- **Status Bar Button**: Added a button in the status bar to start and stop `build_runner watch` with an eye icon that changes based on the process state.
- **Dedicated Output Channel**: Displays messages and errors from the `build_runner` process in a dedicated output channel for easier monitoring.
- **Automatic Detection**: Automatically checks if the project is a Dart project and if the Flutter SDK is installed before running the command.
- **Cross-platform Process Management**: Utilizes `tree-kill` to safely stop the `build_runner watch` process and its subprocesses on all operating systems.
