import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as kill from 'tree-kill';
import * as nls from 'vscode-nls';
import {
  isDartProject,
  getFlutterSdkPath,
  promptForFlutterSdkPath,
} from '../utils/projectUtils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class WatchManager {
  private watchProcess: ChildProcessWithoutNullStreams | null = null;
  private userInitiatedStop = false;
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

    context.subscriptions.push(this.statusBarItem, this.outputChannel);
  }

  public async toggle(): Promise<void> {
    if (this.watchProcess) {
      await this.stopWatch();
    } else {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder || !isDartProject(workspaceFolder.uri)) {
        vscode.window.showErrorMessage(
          localize(
            'extension.noDartProjectMessage',
            'No Dart project detected in the current directory.'
          )
        );
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

      await this.startWatch();
    }
  }

  private async startWatch() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const args =
      process.platform === 'win32'
        ? ['/c', 'dart', 'run', 'build_runner', 'watch', '--delete-conflicting-outputs']
        : ['run', 'build_runner', 'watch', '--delete-conflicting-outputs'];

    this.outputChannel.clear();
    this.outputChannel.show(true);

    this.watchProcess = spawn(command, args, { cwd: workspaceFolder?.uri.fsPath });

    this.watchProcess.stdout.on('data', (data) => {
      this.outputChannel.append(`[build_runner]: ${data}`);
    });

    this.watchProcess.stderr.on('data', (data) => {
      this.outputChannel.append(`[build_runner error]: ${data}`);
    });

    this.watchProcess.on('exit', (code, signal) => {
      this.watchProcess = null;
      this.statusBarItem.text = '$(eye-closed) Watch';
      this.statusBarItem.tooltip = localize(
        'extension.toggleWatch.tooltip.start',
        'Start build_runner watch'
      );

      if (this.userInitiatedStop) {
        vscode.window.showInformationMessage(
          localize('extension.stopMessage', 'Build runner watch stopped.')
        );
        this.userInitiatedStop = false;
        return;
      }

      if (signal === null || signal === 'SIGKILL' || code === 0) {
        vscode.window.showInformationMessage(
          localize('extension.restartMessage', 'Build runner watch restarted.')
        );
        this.startWatch();
      } else {
        vscode.window.showErrorMessage(
          localize(
            'extension.errorStopMessage',
            'Build runner watch stopped unexpectedly with code {0}.',
            code
          )
        );
      }
    });

    this.statusBarItem.text = '$(eye) Watching...';
    this.statusBarItem.tooltip = localize(
      'extension.toggleWatch.tooltip.stop',
      'Stop build_runner watch'
    );
    vscode.window.showInformationMessage(
      localize('extension.startMessage', 'Build runner watch started.')
    );
  }

  private async stopWatch() {
    if (this.watchProcess && this.watchProcess.pid !== undefined) {
      this.userInitiatedStop = true;
      kill(this.watchProcess.pid, 'SIGINT', (err) => {
        if (err) {
          vscode.window.showErrorMessage(
            localize(
              'extension.errorStopMessage',
              'Error stopping process: {0}',
              err.message
            )
          );
        } else {
          this.watchProcess = null;
          this.statusBarItem.text = '$(eye-closed) Watch';
          this.statusBarItem.tooltip = localize(
            'extension.toggleWatch.tooltip.start',
            'Start build_runner watch'
          );
          vscode.window.showInformationMessage(
            localize('extension.stopMessage', 'Build runner watch stopped.')
          );
          this.userInitiatedStop = false;
        }
      });
    }
  }
}
