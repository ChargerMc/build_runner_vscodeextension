![Dart build_runner watch Icon](icon.png)

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ChargerDevs.dart-build-runner-watch.svg?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ChargerDevs.dart-build-runner-watch)

# Dart build_runner watch - VS Code Extension

A Visual Studio Code extension to run `dart run build_runner watch` for Dart projects.

## Features

- Start and stop `build_runner watch` with a single button.
- Start and stop the watcher with **Ctrl+Shift+B** (or **Cmd+Shift+B** on Mac).
- Multi-workspace ready: run independent watchers per workspace folder with automatic cleanup.
- Supports localization for English and Spanish.
- Displays output and error logs in the VS Code output panel.
- Automatically restarts the watcher if it stops unexpectedly.
- Build a single file with **Ctrl+Alt+B**/**Cmd+Alt+B** or the **Dart Build Runner: Build File** command available in editor and file explorer context menus.

## Requirements

- Dart SDK
- Flutter SDK

## Installation

1. Install Dart and Flutter SDKs.
2. Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ChargerDevs.dart-build-runner-watch).

## Usage

1. Open a Dart project in VS Code.
2. Press **Ctrl+Shift+B** (or **Cmd+Shift+B** on Mac) or click the "Watch" button in the status bar to start `build_runner watch`.
3. Press the same shortcut or click again to stop the watch process.
4. To rebuild only the currently active file, press **Ctrl+Alt+B** (or **Cmd+Alt+B** on Mac) or invoke **Dart Build Runner: Build File** from the editor or file explorer context menus.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
