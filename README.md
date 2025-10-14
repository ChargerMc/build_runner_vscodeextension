![Dart build_runner watch Icon](icon.png)

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ChargerDevs.dart-build-runner-watch.svg?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ChargerDevs.dart-build-runner-watch)

# Dart build_runner watch - VS Code Extension

A Visual Studio Code extension to run `dart run build_runner watch` for Dart projects.

## Features

- Manage build_runner sessions from the **Build Runner Explorer** view with inline icons to start, stop, or clean each workspace folder.
- Toggle watchers from the status bar or with **Ctrl+Shift+B**/**Cmd+Shift+B**, and automatically restart them if they exit unexpectedly.
- Clean the build cache with **Ctrl+Alt+Shift+B**/**Cmd+Alt+Shift+B** or the **Dart Build Runner: Clean** command wired into the Explorer view.
- Build just the active Dart file (including generated parts) with **Ctrl+Alt+B**/**Cmd+Alt+B** or the **Dart Build Runner: Build File** command in editor and file explorer menus.
- Multi-workspace aware: run and clean independent watchers per folder with automatic cleanup when folders are removed.
- Automatically checks for the `build_runner` dependency and guides you when it is missing, so commands only appear where they can succeed.
- Localized UI and notifications for English and Spanish, with detailed output streamed to the dedicated Build Runner Output channel.

## Requirements

- Dart SDK
- Flutter SDK

## Installation

1. Install Dart and Flutter SDKs.
2. Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ChargerDevs.dart-build-runner-watch).

## Usage

1. Open a Dart project with a `pubspec.yaml` that includes the `build_runner` dependency.
2. Use the **Build Runner Explorer** view (Explorer sidebar) to start, stop, or clean each workspace folder with the inline eye and trash icons.
3. Alternatively, start or stop the watcher with **Ctrl+Shift+B**/**Cmd+Shift+B** or the status bar button, and stop it using the same shortcut.
4. Clean the build cache with **Ctrl+Alt+Shift+B**/**Cmd+Alt+Shift+B** or by invoking **Dart Build Runner: Clean** from the command palette or Explorer view.
5. Rebuild only the currently active file with **Ctrl+Alt+B**/**Cmd+Alt+B**, or trigger **Dart Build Runner: Build File** from the editor and file explorer context menus.

The extension keeps the dedicated output channel in sync with watcher, build, and clean logs, and will prompt for the Flutter SDK location when needed.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
