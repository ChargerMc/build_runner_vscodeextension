import * as nls from 'vscode-nls';
import { WatchSession, WatchState } from '../../domain/watch/watchSession';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import { Emitter } from '../../shared/events/emitter';
import { Disposable } from '../../shared/lifecycle/disposable';
import { Logger } from '../ports/logger';
import { MessageService } from '../ports/messageService';
import { ProcessRunner } from '../ports/processRunner';
import type { ProcessHandle } from '../ports/processRunner';

interface WatcherEntry {
  readonly folder: WorkspaceFolder;
  readonly handle: ProcessHandle;
  userInitiatedStop: boolean;
  silentStop: boolean;
  state: WatchState;
}

interface StartOptions {
  restart?: boolean;
}

interface StopOptions {
  silent?: boolean;
}

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const WATCH_ARGS = ['run', 'build_runner', 'watch', '--delete-conflicting-outputs'];

export class WatchService implements Disposable {
  private readonly watchers = new Map<string, WatcherEntry>();
  private readonly sessionsEmitter = new Emitter<WatchSession[]>();

  constructor(
    private readonly processRunner: ProcessRunner,
    private readonly logger: Logger,
    private readonly messages: MessageService
  ) {}

  readonly onDidChangeSessions = this.sessionsEmitter.event;

  getActiveSessions(): WatchSession[] {
    return [...this.watchers.values()].map(({ folder, state, handle }) => ({
      folder,
      state,
      pid: handle.pid,
    }));
  }

  isWatching(folder: WorkspaceFolder): boolean {
    return this.watchers.has(folder.uri);
  }

  async toggle(folder: WorkspaceFolder): Promise<void> {
    if (this.watchers.has(folder.uri)) {
      await this.stop(folder);
    } else {
      await this.start(folder);
    }
  }

  async start(folder: WorkspaceFolder, options: StartOptions = {}): Promise<void> {
    if (this.watchers.has(folder.uri)) {
      return;
    }

    try {
      const handle = this.processRunner.runDart(WATCH_ARGS, {
        cwd: folder.path,
      });

      const entry: WatcherEntry = {
        folder,
        handle,
        userInitiatedStop: false,
        silentStop: false,
        state: WatchState.Running,
      };

      this.watchers.set(folder.uri, entry);
      this.logger.show(true);
      this.logger.appendLine(`[build_runner:${folder.name}]: watch started`);
      if (!options.restart) {
        this.messages.showInfo(
          localize(
            'extension.startMessageForFolder',
            'Build runner watch started for {0}.',
            folder.name
          )
        );
      }

      const disposables: Disposable[] = [];
      disposables.push(
        handle.onStdout((chunk) => {
          this.logger.append(`[build_runner:${folder.name}]: ${chunk}`);
        })
      );
      disposables.push(
        handle.onStderr((chunk) => {
          this.logger.append(`[build_runner error:${folder.name}]: ${chunk}`);
        })
      );
      disposables.push(
        handle.onExit(async (code, signal) => {
          disposables.forEach((d) => d.dispose());
          await this.handleExit(folder, entry, code, signal);
        })
      );

      this.emitSessions();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.messages.showError(
        localize(
          'extension.watchStartError',
          'Failed to run build_runner watch for {0}: {1}',
          folder.name,
          message
        )
      );
    }
  }

  async stop(folder: WorkspaceFolder, options: StopOptions = {}): Promise<void> {
    const entry = this.watchers.get(folder.uri);
    if (!entry) {
      return;
    }

    entry.userInitiatedStop = true;
    entry.silentStop = options.silent ?? false;

    try {
      await entry.handle.terminate('SIGINT');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.messages.showError(
        localize('extension.errorStoppingProcess', 'Error stopping process: {0}', message)
      );
    }
  }

  async stopAll(): Promise<void> {
    const folders = [...this.watchers.keys()];
    for (const folderUri of folders) {
      const entry = this.watchers.get(folderUri);
      if (entry) {
        await this.stop(entry.folder, { silent: true });
      }
    }
  }

  async handleWorkspaceRemoved(folder: WorkspaceFolder): Promise<void> {
    await this.stop(folder, { silent: true });
  }

  dispose(): void {
    void this.stopAll();
  }

  private async handleExit(
    folder: WorkspaceFolder,
    entry: WatcherEntry,
    code: number | null,
    signal: NodeJS.Signals | null
  ): Promise<void> {
    if (!this.watchers.has(folder.uri)) {
      return;
    }

    this.watchers.delete(folder.uri);
    entry.handle.dispose();
    this.emitSessions();

    if (entry.userInitiatedStop) {
      if (!entry.silentStop) {
        this.messages.showInfo(
          localize(
            'extension.stopMessageForFolder',
            'Build runner watch stopped for {0}.',
            folder.name
          )
        );
      }
      return;
    }

    if (signal === null || signal === 'SIGKILL' || code === 0) {
      this.messages.showInfo(
        localize(
          'extension.restartMessageForFolder',
          'Build runner watch restarted for {0}.',
          folder.name
        )
      );
      await this.start(folder, { restart: true });
      return;
    }

    this.messages.showError(
      localize(
        'extension.errorStopMessageForFolder',
        'Build runner watch stopped unexpectedly for {0} with code {1}.',
        folder.name,
        code ?? 'unknown'
      )
    );
  }

  private emitSessions(): void {
    this.sessionsEmitter.fire(this.getActiveSessions());
  }
}
