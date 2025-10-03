import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as kill from 'tree-kill';
import * as nls from 'vscode-nls';
import {
  isDartProject,
  getFlutterSdkPath,
  promptForFlutterSdkPath,
  getDartWorkspaceFolders,
} from '../utils/projectUtils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

interface WatcherInfo {
  process: ChildProcessWithoutNullStreams;
  folder: vscode.WorkspaceFolder;
  userInitiatedStop: boolean;
  silentStop: boolean;
}

interface FolderQuickPickItem extends vscode.QuickPickItem {
  folder: vscode.WorkspaceFolder;
}

export class WatchManager implements vscode.Disposable {
  private readonly watchers = new Map<string, WatcherInfo>();
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0
    );
    this.statusBarItem.text = '$(eye-closed) Watch';
    this.statusBarItem.command = 'extension.toggleWatch';
    this.statusBarItem.tooltip = localize(
      'extension.toggleWatch.tooltip.start',
      'Start build_runner watch'
    );
    this.statusBarItem.show();

    this.outputChannel = vscode.window.createOutputChannel(
      localize('extension.outputChannel', 'Dart Build Runner Watch')
    );

    context.subscriptions.push(
      this.statusBarItem,
      this.outputChannel,
      vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        event.removed.forEach((folder) => {
          void this.stopWatch(folder, { silent: true });
        });
      }),
      this
    );
  }

  public async toggle(): Promise<void> {
    const dartFolders = getDartWorkspaceFolders();
    if (dartFolders.length === 0) {
      vscode.window.showErrorMessage(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current workspace.'
        )
      );
      return;
    }

    const targetFolder = await this.resolveTargetFolder(dartFolders);
    if (!targetFolder) {
      return;
    }

    const folderKey = targetFolder.uri.toString();
    if (this.watchers.has(folderKey)) {
      await this.stopWatch(targetFolder);
      return;
    }

    let flutterSdkPath = await getFlutterSdkPath();
    if (!flutterSdkPath) {
      flutterSdkPath = await promptForFlutterSdkPath();
      if (!flutterSdkPath) {
        vscode.window.showErrorMessage(
          localize(
            'extension.flutterSdkRequiredMessage',
            'Flutter SDK is required to run this command.'
          )
        );
        return;
      }
    }

    await this.startWatch(targetFolder);
  }

  private async startWatch(
    folder: vscode.WorkspaceFolder,
    options: { isRestart?: boolean } = {}
  ): Promise<void> {
    const folderKey = folder.uri.toString();
    if (this.watchers.has(folderKey)) {
      return;
    }

    if (
      !vscode.workspace.workspaceFolders?.some(
        (workspaceFolder) => workspaceFolder.uri.toString() === folderKey
      )
    ) {
      return;
    }

    if (!isDartProject(folder.uri)) {
      vscode.window.showErrorMessage(
        localize(
          'extension.noDartProjectMessageForFolder',
          'No Dart project detected in the selected workspace folder.'
        )
      );
      return;
    }

    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const args =
      process.platform === 'win32'
        ? [
            '/c',
            'dart',
            'run',
            'build_runner',
            'watch',
            '--delete-conflicting-outputs',
          ]
        : ['run', 'build_runner', 'watch', '--delete-conflicting-outputs'];

    try {
      const watchProcess = spawn(command, args, { cwd: folder.uri.fsPath });

      const watcherInfo: WatcherInfo = {
        process: watchProcess,
        folder,
        userInitiatedStop: false,
        silentStop: false,
      };

      this.watchers.set(folderKey, watcherInfo);
      this.updateStatusBar();

      if (!options.isRestart) {
        vscode.window.showInformationMessage(
          localize(
            'extension.startMessageForFolder',
            'Build runner watch started for {0}.',
            folder.name
          )
        );
      }

      this.outputChannel.show(true);
      this.outputChannel.appendLine(
        `[build_runner:${folder.name}]: watch started`
      );

      watchProcess.stdout.on('data', (data: Buffer) => {
        this.outputChannel.append(`[build_runner:${folder.name}]: ${data}`);
      });

      watchProcess.stderr.on('data', (data: Buffer) => {
        this.outputChannel.append(
          `[build_runner error:${folder.name}]: ${data}`
        );
      });

      watchProcess.on('error', (err: Error) => {
        this.watchers.delete(folderKey);
        this.updateStatusBar();
        vscode.window.showErrorMessage(
          localize(
            'extension.watchStartError',
            'Failed to run build_runner watch for {0}: {1}',
            folder.name,
            err.message
          )
        );
      });

      watchProcess.on(
        'exit',
        (code: number | null, signal: NodeJS.Signals | null) => {
          const info = this.watchers.get(folderKey) ?? watcherInfo;
          this.watchers.delete(folderKey);
          this.updateStatusBar();

          if (info.userInitiatedStop) {
            if (!info.silentStop) {
              vscode.window.showInformationMessage(
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
            vscode.window.showInformationMessage(
              localize(
                'extension.restartMessageForFolder',
                'Build runner watch restarted for {0}.',
                folder.name
              )
            );
            void this.startWatch(folder, { isRestart: true });
          } else {
            vscode.window.showErrorMessage(
              localize(
                'extension.errorStopMessageForFolder',
                'Build runner watch stopped unexpectedly for {0} with code {1}.',
                folder.name,
                code ?? 'unknown'
              )
            );
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        localize(
          'extension.watchStartError',
          'Failed to run build_runner watch for {0}: {1}',
          folder.name,
          message
        )
      );
    }
  }

  private async resolveTargetFolder(
    folders: vscode.WorkspaceFolder[]
  ): Promise<vscode.WorkspaceFolder | undefined> {
    if (folders.length === 1) {
      return folders[0];
    }

    const items: FolderQuickPickItem[] = folders.map((folder) => {
      const isWatching = this.watchers.has(folder.uri.toString());
      return {
        label: folder.name,
        description: folder.uri.fsPath,
        detail: isWatching
          ? localize('extension.folderStatus.watching', 'Currently watching')
          : localize('extension.folderStatus.idle', 'Not watching'),
        folder,
      };
    });

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: localize(
        'extension.chooseWorkspaceFolder',
        'Select a workspace folder'
      ),
    });

    return selection?.folder;
  }

  private async stopWatch(
    folder: vscode.WorkspaceFolder,
    options: { silent?: boolean } = {}
  ): Promise<void> {
    const folderKey = folder.uri.toString();
    const watcher = this.watchers.get(folderKey);
    if (!watcher) {
      return;
    }

    watcher.userInitiatedStop = true;
    watcher.silentStop = options.silent ?? false;

    const pid = watcher.process.pid;
    if (pid === undefined) {
      this.watchers.delete(folderKey);
      this.updateStatusBar();
      return;
    }

    await new Promise<void>((resolve) => {
      kill(pid, 'SIGINT', (err) => {
        if (err) {
          vscode.window.showErrorMessage(
            localize(
              'extension.errorStoppingProcess',
              'Error stopping process: {0}',
              err.message
            )
          );
        }
        resolve();
      });
    });
  }

  private async stopAll(): Promise<void> {
    const folders = [...this.watchers.values()].map((info) => info.folder);
    await Promise.all(
      folders.map((folder) => this.stopWatch(folder, { silent: true }))
    );
  }

  private updateStatusBar(): void {
    const activeCount = this.watchers.size;
    if (activeCount === 0) {
      this.statusBarItem.text = '$(eye-closed) Watch';
      this.statusBarItem.tooltip = localize(
        'extension.toggleWatch.tooltip.start',
        'Start build_runner watch'
      );
      return;
    }

    this.statusBarItem.tooltip = localize(
      'extension.toggleWatch.tooltip.stop',
      'Stop build_runner watch'
    );

    if (activeCount === 1) {
      const [watcher] = this.watchers.values();
      const label = localize(
        'extension.statusBar.single',
        'Watching {0}',
        watcher.folder.name
      );
      this.statusBarItem.text = `$(watch) ${label}`;
      return;
    }

    const label = localize(
      'extension.statusBar.multiple',
      'Watching {0} folders',
      activeCount
    );
    this.statusBarItem.text = `$(watch) ${label}`;
  }

  public dispose(): void {
    void this.stopAll();
  }
}
