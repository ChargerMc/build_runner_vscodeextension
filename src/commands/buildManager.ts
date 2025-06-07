import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as nls from 'vscode-nls';
import {
  isDartProject,
  getFlutterSdkPath,
  promptForFlutterSdkPath,
} from '../utils/projectUtils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class BuildManager {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel(
      localize('extension.outputChannel', 'Dart Build Runner Watch')
    );
    context.subscriptions.push(this.outputChannel);
  }

  public async buildSelectedFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        localize('extension.noActiveFileMessage', 'No active file to build.')
      );
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
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

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, editor.document.uri.fsPath);

    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const args =
      process.platform === 'win32'
        ? [
            '/c',
            'dart',
            'run',
            'build_runner',
            'build',
            '--delete-conflicting-outputs',
            '--build-filter',
            relativePath,
          ]
        : [
            'run',
            'build_runner',
            'build',
            '--delete-conflicting-outputs',
            '--build-filter',
            relativePath,
          ];

    this.outputChannel.clear();
    this.outputChannel.show(true);

    const buildProcess = spawn(command, args, { cwd: workspaceRoot });

    buildProcess.stdout.on('data', (data) => {
      this.outputChannel.append(`[build_runner]: ${data}`);
    });

    buildProcess.stderr.on('data', (data) => {
      this.outputChannel.append(`[build_runner error]: ${data}`);
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        vscode.window.showInformationMessage(
          localize('extension.buildSuccessMessage', 'Build completed.')
        );
      } else {
        vscode.window.showErrorMessage(
          localize(
            'extension.buildErrorMessage',
            'Build failed with code {0}.',
            code
          )
        );
      }
    });
  }
}
