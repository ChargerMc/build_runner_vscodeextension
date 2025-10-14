# Copilot Instructions

## Extension Overview

- This VS Code extension starts and stops `dart run build_runner watch` and exposes a targeted build command for the active Dart file.
- `src/extension.ts` is the bootstrap: it wires ports to VS Code adapters, registers commands, and disposes everything through `DisposableStore`.

## Architecture Expectations

- Layers follow clean architecture: domain (`src/domain`) holds pure logic, application (`src/application`) orchestrates use cases, infrastructure (`src/infrastructure`) adapts external systems, and presentation (`src/presentation`) renders UI.
- Application code only talks to ports in `src/application/ports`; new IO concerns should add or extend these interfaces rather than importing VS Code APIs directly.
- Infrastructure adapters implement ports (e.g., `VscodeWorkspaceGateway`, `ChildProcessRunner`) and should remain thin wrappers over platform APIs.

## Watch Workflow

- `WatchService` maintains a `Map` keyed by `WorkspaceFolder.uri`, tracks `ProcessHandle`s, auto-restarts crashes, and emits session snapshots via `Emitter`—call `emitSessions()` after mutating watcher state.
- `ToggleWatchCommand` resolves the target folder via `WorkspaceGateway` and `FolderPickerService`; respect multi-root behavior and reuse `resolveTargetFolder` when adding new entry points.
- UI integrations (e.g., `WatchStatusBarPresenter`) listen on `WatchService.onDidChangeSessions`; new presenters should subscribe rather than poking service internals.
- When a workspace folder is removed, `extension.ts` forwards the event to `WatchService.handleWorkspaceRemoved`; keep that hook updated if folder lifecycle handling changes.

## Targeted Build Workflow

- `BuildSelectedCommand` obtains the active `DocumentSnapshot`, validates `languageId === 'dart'`, and verifies the document belongs to a Dart workspace via `WorkspaceGateway.isDartWorkspace`.
- Build filters come from `resolveBuildFilters` in `src/domain/build/buildFilterResolver.ts`, which parses `part` directives and checks common generated suffixes (`.g.dart`, `.freezed.dart`, etc.); extend `generatedPartPatterns` and `heuristicSuffixes` when supporting new generators.
- The command logs build steps to `Logger` with `[build_runner]` prefixes and surfaces success or failure through `MessageService`; follow the same pattern for additional build operations.

## SDK and Process Conventions

- All long-lived Dart invocations go through `ProcessRunner.runDart`; the default implementation (`ChildProcessRunner`) wraps `dart` via `cmd` on Windows and uses `tree-kill` for cleanup—reuse it instead of spawning processes manually.
- `FlutterSdkResolver` first probes `flutter --version` and falls back to prompting the user; any feature needing the SDK should call `resolveFlutterSdk()` before `promptForFlutterSdk()`.
- Workspace detection relies on `pubspec.yaml` via `VscodeWorkspaceGateway`; avoid hard-coding other heuristics unless the gateway is updated.

## Localization & UX

- User-facing strings use `vscode-nls`; add new message IDs to both `package.nls.json` and `package.nls.es.json` (plus `i18n/` variants for package metadata contributions).
- Keep status bar text/icons consistent with `WatchStatusBarPresenter` (`$(watch)` / `$(eye-closed)`), and surface user notifications through `MessageService` rather than `vscode.window`.

## Developer Workflow

- Install dependencies with `npm install`, compile TypeScript via `npm run compile`, and use `npm run watch` for incremental builds; package the extension with `npm run build` (`vsce package`).
- Launch the Extension Development Host from VS Code after running `npm run compile`; `out/extension.js` is the activation entry point.
- When adding commands or keybindings, update `package.json` contributions and ensure their titles have localized entries in `package.nls*.json`.
