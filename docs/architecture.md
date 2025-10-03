# Clean Architecture Overview

This VS Code extension now follows a clean architecture layout that separates domain logic from framework-specific code.

## Layers

- **Domain** (src/domain): Pure business rules and value objects. For example, the build filter resolver that determines which generated files must be rebuilt when a Dart file changes.
- **Application** (src/application): Use cases that orchestrate the domain and ask infrastructure services to perform work. These classes depend only on ports (interfaces).
- **Infrastructure** (src/infrastructure): Concrete adapters for the VS Code API, filesystem, process spawning, and Flutter SDK discovery. They implement the ports expected by the application layer.
- **Presentation** (src/presentation): UI facing adapters such as status bar and quick pick presenters. Presentation depends on the application layer ports.
- **Bootstrap** (src/extension.ts): Wires dependencies on activation, registers commands, and disposes resources on shutdown.

## Dependency Rule

Higher layers never import from lower (framework) layers. All cross-layer communication happens through TypeScript interfaces in src/application/ports. Infrastructure implements those interfaces and is injected at runtime from the bootstrap module.

## Command Flow Example

1. The VS Code command handler resolves data from the VS Code API using infrastructure adapters.
2. It calls the appropriate application use case (BuildSelectedCommand or ToggleWatchCommand).
3. The use case uses domain helpers (e.g., build filter resolver) and calls ports for IO.
4. Infrastructure implementations execute the work and feed results back via events or return values.

## Watch Service Events

The watch service exposes a small event surface so presentation components (status bar, output channel) can react to changes without the service depending on VS Code APIs. Listeners are registered through the onDidChangeSessions event exposed by the service.

