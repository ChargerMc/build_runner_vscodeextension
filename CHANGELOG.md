# Changelog

All notable changes to this extension will be documented in this file.

## [1.0.0] - 2024-11-05

### Added

- **Multilingual Support**: Added support for English and Spanish using `vscode-nls`.
- **Start and Stop `build_runner watch` Command**: Introduced a command to start the `build_runner watch` process, which can be stopped using a button in the status bar.
- **Status Bar Button**: Added a button in the status bar to start and stop `build_runner watch` with an eye icon that changes based on the process state.
- **Dedicated Output Channel**: Displays messages and errors from the `build_runner` process in a dedicated output channel for easier monitoring.
- **Automatic Detection**: Automatically checks if the project is a Dart project and if the Flutter SDK is installed before running the command.
- **Cross-platform Process Management**: Utilizes `tree-kill` to safely stop the `build_runner watch` process and its subprocesses on all operating systems.