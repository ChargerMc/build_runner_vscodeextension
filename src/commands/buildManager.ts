import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
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
        ); return;
      }
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    let relativePath = path.relative(
      workspaceRoot,
      editor.document.uri.fsPath
    );

    if (path.sep === "\\") {
      relativePath = relativePath.replace(/\\/g, "/");
    }

    const basePath = relativePath.replace(/\.dart$/, '');

    const potentialBuildFilters = [
      `${basePath}.g.dart`,           // json_serializable, built_value, etc.
      `${basePath}.freezed.dart`,     // freezed package
      `${basePath}.gr.dart`,          // auto_route package
      `${basePath}.config.dart`,      // injectable package
      `${basePath}.mocks.dart`,       // mockito package
    ];

    const existingFilters: string[] = [];
    const potentialFilters: string[] = [];

    for (const filter of potentialBuildFilters) {
      const fullPath = path.join(workspaceRoot, filter);
      if (fs.existsSync(fullPath)) {
        existingFilters.push(filter);
      } else {
        potentialFilters.push(filter);
      }
    }

    // Use existing files as filters, or all potential ones if none exist yet
    const buildFilters = existingFilters.length > 0 ? existingFilters : potentialBuildFilters;

    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const baseArgs = process.platform === 'win32'
      ? ['/c', 'dart', 'run', 'build_runner', 'build', '--delete-conflicting-outputs']
      : ['run', 'build_runner', 'build', '--delete-conflicting-outputs'];

    // Add all build filters
    const args = [...baseArgs];
    buildFilters.forEach(filter => {
      args.push('--build-filter', filter);
    }); this.outputChannel.clear();
    this.outputChannel.show(true);

    // Log which file is being processed and what filters are being used
    this.outputChannel.appendLine(`[build_runner]: Building generated files for: ${relativePath}`);
    this.outputChannel.appendLine('');

    if (existingFilters.length === 0) {
      this.outputChannel.appendLine(`[build_runner]: No existing generated files found.`);
      this.outputChannel.appendLine(`[build_runner]: Exited. No build filters applied.`);
      return;
    }

    this.outputChannel.appendLine(`[build_runner]: Using build filters:`);
    buildFilters.forEach(filter => {
      this.outputChannel.appendLine(`  - ${filter}`);
    });
    this.outputChannel.appendLine('');

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
