import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { BuildSelectedCommand } from './application/build/buildSelectedCommand';
import { CleanBuildRunnerCommand } from './application/commands/cleanBuildRunnerCommand';
import { ToggleWatchCommand } from './application/commands/toggleWatchCommand';
import { WatchService } from './application/watch/watchService';
import { NodeFileSystem } from './infrastructure/fs/nodeFileSystem';
import { NodeBuildRunnerDetector } from './infrastructure/fs/nodeBuildRunnerDetector';
import { FlutterSdkResolver } from './infrastructure/dart/flutterSdkResolver';
import { ChildProcessRunner } from './infrastructure/process/childProcessRunner';
import { VscodeDocumentGateway } from './infrastructure/vscode/vscodeDocumentGateway';
import { VscodeFolderPicker } from './infrastructure/vscode/vscodeFolderPicker';
import { VscodeMessageService } from './infrastructure/vscode/vscodeMessageService';
import { VscodeOutputChannelLogger } from './infrastructure/vscode/vscodeOutputChannelLogger';
import { VscodeWorkspaceGateway } from './infrastructure/vscode/vscodeWorkspaceGateway';
import { WatchStatusBarPresenter } from './presentation/watch/watchStatusBarPresenter';
import { WatchExplorerView } from './presentation/watch/watchExplorerView';
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
  const buildRunnerDetector = new NodeBuildRunnerDetector(fileSystem);
  const processRunner = new ChildProcessRunner();
  const flutterSdk = new FlutterSdkResolver();
  const documentGateway = new VscodeDocumentGateway();
  const workspaceGateway = new VscodeWorkspaceGateway();
  const folderPicker = new VscodeFolderPicker();

  const watchService = new WatchService(processRunner, logger, messageService);
  const statusBarPresenter = new WatchStatusBarPresenter(watchService);
  const watchExplorerView = new WatchExplorerView(
    watchService,
    workspaceGateway,
    buildRunnerDetector
  );

  disposables.add(watchService);
  disposables.add(statusBarPresenter);
  disposables.add(watchExplorerView);

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
    buildRunnerDetector,
    messageService,
    watchService
  );

  const cleanBuildRunner = new CleanBuildRunnerCommand(
    workspaceGateway,
    folderPicker,
    flutterSdk,
    buildRunnerDetector,
    logger,
    messageService,
    processRunner
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.toggleWatch',
      (folderUri?: string) => toggleWatch.execute(folderUri)
    ),
    vscode.commands.registerCommand(
      'extension.watch.start',
      (folderUri: string) => toggleWatch.execute(folderUri)
    ),
    vscode.commands.registerCommand(
      'extension.watch.stop',
      (folderUri: string) => toggleWatch.execute(folderUri)
    ),
    vscode.commands.registerCommand('extension.watch.startInline', (item) =>
      toggleWatch.execute(item)
    ),
    vscode.commands.registerCommand('extension.watch.stopInline', (item) =>
      toggleWatch.execute(item)
    ),
    vscode.commands.registerCommand(
      'extension.buildSelected',
      (uri?: vscode.Uri) => buildSelected.execute(uri?.fsPath)
    ),
    vscode.commands.registerCommand(
      'extension.buildRunnerClean',
      (folderUri?: string) => cleanBuildRunner.execute(folderUri)
    ),
    vscode.commands.registerCommand(
      'extension.buildRunnerCleanInline',
      (item) => cleanBuildRunner.execute(item)
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
