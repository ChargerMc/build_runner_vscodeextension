import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import { WatchService } from '../../application/watch/watchService';
import { WorkspaceGateway } from '../../application/ports/workspace';
import { BuildRunnerDetector } from '../../application/ports/buildRunner';
import { WatchSession } from '../../domain/watch/watchSession';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import { Disposable, DisposableStore } from '../../shared/lifecycle/disposable';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

interface FolderItem {
  readonly folder: WorkspaceFolder;
}

export class WatchExplorerView
  implements Disposable, vscode.TreeDataProvider<FolderItem>
{
  private readonly disposables = new DisposableStore();
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    FolderItem | undefined
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private sessions: Map<string, WatchSession> = new Map();
  private readonly treeView: vscode.TreeView<FolderItem>;
  private capabilities = new Map<string, boolean>();

  constructor(
    private readonly watchService: WatchService,
    private readonly workspaceGateway: WorkspaceGateway,
    private readonly buildRunnerDetector: BuildRunnerDetector
  ) {
    this.sessions = this.toSessionMap(this.watchService.getActiveSessions());
    this.treeView = vscode.window.createTreeView('buildRunnerExplorer', {
      treeDataProvider: this,
      showCollapseAll: false,
    });

    this.disposables.add(this.treeView);
    this.disposables.add(
      this.watchService.onDidChangeSessions((sessions) => {
        this.sessions = this.toSessionMap(sessions);
        this.onDidChangeTreeDataEmitter.fire(undefined);
      })
    );
    this.disposables.add(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        void this.refreshCapabilities();
      })
    );

    void this.refreshCapabilities();
  }

  dispose(): void {
    this.disposables.dispose();
    this.onDidChangeTreeDataEmitter.dispose();
  }

  getTreeItem(element: FolderItem): vscode.TreeItem {
    const { folder } = element;
    const session = this.sessions.get(folder.uri);
    const item = new vscode.TreeItem(folder.name);

    if (session) {
      item.iconPath = new vscode.ThemeIcon('eye');
      item.description = localize(
        'extension.folderStatus.watching',
        'Currently watching'
      );
      item.contextValue = 'buildRunnerFolderWatching';
    } else {
      item.iconPath = new vscode.ThemeIcon('eye-closed');
      item.description = localize(
        'extension.folderStatus.idle',
        'Not watching'
      );
      item.contextValue = 'buildRunnerFolderIdle';
    }

    item.tooltip = folder.path;
    item.command = {
      command: 'extension.toggleWatch',
      title: localize(
        'extension.command.toggleWatchInline',
        'Toggle build_runner watch'
      ),
      arguments: [element],
    };

    return item;
  }

  getChildren(element?: FolderItem): FolderItem[] {
    if (element) {
      return [];
    }

    const folders = this.workspaceGateway.getDartWorkspaceFolders();
    const supported = folders.filter((folder) => {
      const capability = this.capabilities.get(folder.uri);
      return capability !== false;
    });

    return supported.map((folder) => ({ folder }));
  }

  private toSessionMap(sessions: WatchSession[]): Map<string, WatchSession> {
    return new Map(sessions.map((session) => [session.folder.uri, session]));
  }

  private async refreshCapabilities(): Promise<void> {
    const folders = this.workspaceGateway.getDartWorkspaceFolders();
    const results = await Promise.all(
      folders.map(async (folder) => ({
        folder,
        hasBuildRunner: await this.buildRunnerDetector.hasBuildRunner(
          folder.path
        ),
      }))
    );

    this.capabilities = new Map(
      results.map(({ folder, hasBuildRunner }) => [folder.uri, hasBuildRunner])
    );

    const hasSupported = results.some(({ hasBuildRunner }) => hasBuildRunner);

    await this.updateWorkspaceContext(hasSupported);
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  private async updateWorkspaceContext(hasFolders: boolean): Promise<void> {
    await vscode.commands.executeCommand(
      'setContext',
      'buildRunnerExplorer.hasFolders',
      hasFolders
    );
  }
}
