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

  public async buildSelectedFile(targetUri?: vscode.Uri): Promise<void> {
    let document: vscode.TextDocument | undefined;

    if (targetUri) {
      try {
        document = await vscode.workspace.openTextDocument(targetUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(message);
        return;
      }
    } else {
      document = vscode.window.activeTextEditor?.document;
    }

    if (!document) {
      vscode.window.showErrorMessage(
        localize('extension.noActiveFileMessage', 'No active file to build.')
      );
      return;
    }

    if (document.languageId !== 'dart') {
      vscode.window.showErrorMessage(
        localize('extension.noActiveFileMessage', 'No active file to build.')
      );
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
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
    const documentText = document.getText();
    const documentDir = path.dirname(document.uri.fsPath);
    let relativePath = path.relative(workspaceRoot, document.uri.fsPath);

    if (relativePath.startsWith('..')) {
      vscode.window.showErrorMessage(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current directory.'
        )
      );
      return;
    }

    if (path.sep === '\\') {
      relativePath = relativePath.replace(/\\/g, '/');
    }

    const basePath = relativePath.replace(/\.dart$/, '');

    const generatedPartPatterns = [
      /\.g\.dart$/i,
      /\.freezed\.dart$/i,
      /\.gr\.dart$/i,
      /\.mocks\.dart$/i,
      /\.config\.dart$/i,
      /\.mapper\.dart$/i,
      /\.graphql\.dart$/i,
      /\.gql\.dart$/i,
      /\.chopper\.dart$/i,
      /\.swagger\.dart$/i,
    ];

    const partFilters = new Set<string>();
    const partRegex = /part\s+['"]([^'"]+)['"];?/g;
    let match: RegExpExecArray | null;

    while ((match = partRegex.exec(documentText)) !== null) {
      const partPath = match[1];
      if (!generatedPartPatterns.some((pattern) => pattern.test(partPath))) {
        continue;
      }

      const resolvedPartPath = path.resolve(documentDir, partPath);
      let relativePartPath = path.relative(workspaceRoot, resolvedPartPath);
      if (relativePartPath.startsWith('..')) {
        continue;
      }

      relativePartPath = relativePartPath.split(path.sep).join('/');
      partFilters.add(relativePartPath);
    }

    const heuristicSuffixes = [
      '.g.dart',
      '.freezed.dart',
      '.gr.dart',
      '.config.dart',
      '.mocks.dart',
    ];

    const heuristicFilters = new Set<string>();
    for (const suffix of heuristicSuffixes) {
      heuristicFilters.add(`${basePath}${suffix}`);
    }

    const existingFilters = new Set<string>();
    const missingPartFilters: string[] = [];

    for (const filter of partFilters) {
      const fullPath = path.join(workspaceRoot, filter);
      if (fs.existsSync(fullPath)) {
        existingFilters.add(filter);
      } else {
        missingPartFilters.push(filter);
      }
    }

    for (const filter of heuristicFilters) {
      if (partFilters.has(filter)) {
        continue;
      }
      const fullPath = path.join(workspaceRoot, filter);
      if (fs.existsSync(fullPath)) {
        existingFilters.add(filter);
      }
    }

    if (existingFilters.size === 0 && missingPartFilters.length === 0) {
      this.outputChannel.clear();
      this.outputChannel.show(true);
      this.outputChannel.appendLine(
        `[build_runner]: No generated file targets found for: ${relativePath}`
      );
      this.outputChannel.appendLine(
        '[build_runner]: Add part directives (e.g. part "*.g.dart";) to enable targeted builds.'
      );
      return;
    }

    const buildFilters = [...existingFilters, ...missingPartFilters];
    const uniqueBuildFilters = [...new Set(buildFilters)];

    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const baseArgs =
      process.platform === 'win32'
        ? [
            '/c',
            'dart',
            'run',
            'build_runner',
            'build',
            '--delete-conflicting-outputs',
          ]
        : ['run', 'build_runner', 'build', '--delete-conflicting-outputs'];

    const args = [...baseArgs];
    uniqueBuildFilters.forEach((filter) => {
      args.push('--build-filter', filter);
    });

    this.outputChannel.clear();
    this.outputChannel.show(true);

    this.outputChannel.appendLine(
      `[build_runner]: Building generated files for: ${relativePath}`
    );
    this.outputChannel.appendLine('');

    this.outputChannel.appendLine(`[build_runner]: Using build filters:`);
    uniqueBuildFilters.forEach((filter) => {
      this.outputChannel.appendLine(`  - ${filter}`);
    });
    this.outputChannel.appendLine('');

    if (missingPartFilters.length > 0) {
      this.outputChannel.appendLine(
        '[build_runner]: Pending generated files will be created if needed:'
      );
      missingPartFilters.forEach((filter) => {
        this.outputChannel.appendLine(`  • ${filter}`);
      });
      this.outputChannel.appendLine('');
    }

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
