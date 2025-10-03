import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { BuildSelectedCommand } from './application/build/buildSelectedCommand';
import { ToggleWatchCommand } from './application/commands/toggleWatchCommand';
import { WatchService } from './application/watch/watchService';
import { NodeFileSystem } from './infrastructure/fs/nodeFileSystem';
import { FlutterSdkResolver } from './infrastructure/dart/flutterSdkResolver';
import { ChildProcessRunner } from './infrastructure/process/childProcessRunner';
import { VscodeDocumentGateway } from './infrastructure/vscode/vscodeDocumentGateway';
import { VscodeFolderPicker } from './infrastructure/vscode/vscodeFolderPicker';
import { VscodeMessageService } from './infrastructure/vscode/vscodeMessageService';
import { VscodeOutputChannelLogger } from './infrastructure/vscode/vscodeOutputChannelLogger';
import { VscodeWorkspaceGateway } from './infrastructure/vscode/vscodeWorkspaceGateway';
import { WatchStatusBarPresenter } from './presentation/watch/watchStatusBarPresenter';
import { DisposableStore } from './shared/lifecycle/disposable';
import { toDomainWorkspaceFolder } from './infrastructure/vscode/workspaceMapper';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function activate(context: vscode.ExtensionContext) {
  const disposables = new DisposableStore();
  context.subscriptions.push({
    dispose: () => disposables.dispose(),
  });

  const outputChannel = vscode.window.createOutputChannel(
    localize('extension.outputChannel', 'Dart Build Runner Watch')
  );
  context.subscriptions.push(outputChannel);

  const logger = new VscodeOutputChannelLogger(outputChannel);
  const messageService = new VscodeMessageService();
  const fileSystem = new NodeFileSystem();
  const processRunner = new ChildProcessRunner();
  const flutterSdk = new FlutterSdkResolver();
  const documentGateway = new VscodeDocumentGateway();
  const workspaceGateway = new VscodeWorkspaceGateway();
  const folderPicker = new VscodeFolderPicker();

  const watchService = new WatchService(processRunner, logger, messageService);
  const statusBarPresenter = new WatchStatusBarPresenter(watchService);

  disposables.add(watchService);
  disposables.add(statusBarPresenter);

  const buildSelected = new BuildSelectedCommand(
    documentGateway,
    workspaceGateway,
    fileSystem,
    flutterSdk,
    logger,
    messageService,
    processRunner
  );

  const toggleWatch = new ToggleWatchCommand(
    workspaceGateway,
    folderPicker,
    flutterSdk,
    messageService,
    watchService
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.toggleWatch', () =>
      toggleWatch.execute()
    ),
    vscode.commands.registerCommand(
      'extension.buildSelected',
      (uri?: vscode.Uri) => buildSelected.execute(uri?.fsPath)
    ),
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const folder of event.removed) {
        void watchService.handleWorkspaceRemoved(
          toDomainWorkspaceFolder(folder)
        );
      }
    })
  );
}

export function deactivate() {}
