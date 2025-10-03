import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function isDartProject(uri?: vscode.Uri): boolean {
  const folder = uri
    ? vscode.workspace.getWorkspaceFolder(uri)
    : vscode.workspace.workspaceFolders?.[0];
  const rootPath = folder?.uri.fsPath || '';
  const pubspecPath = path.join(rootPath, 'pubspec.yaml');
  return fs.existsSync(pubspecPath);
}

export function getFlutterSdkPath(): Promise<string | null> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'cmd' : 'flutter';
    const args =
      process.platform === 'win32'
        ? ['/c', 'flutter', '--version']
        : ['--version'];

    const flutterProcess = spawn(command, args);

    flutterProcess.on('error', () => {
      resolve(null);
    });

    flutterProcess.stdout.on('data', () => {});

    flutterProcess.on('close', (code) => {
      if (code === 0) {
        resolve(command);
      } else {
        resolve(null);
      }
    });
  });
}

export async function promptForFlutterSdkPath(): Promise<string | null> {
  const sdkPath = await vscode.window.showInputBox({
    placeHolder: localize(
      'extension.enterFlutterSdkPath',
      'Enter the Flutter SDK path'
    ),
    prompt: localize(
      'extension.sdkPromptMessage',
      'Flutter SDK not found. Please enter its installation path.'
    ),
  });
  return sdkPath || null;
}

export function getDartWorkspaceFolders(): vscode.WorkspaceFolder[] {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders.filter((folder) => {
    const pubspecPath = path.join(folder.uri.fsPath, 'pubspec.yaml');
    return fs.existsSync(pubspecPath);
  });
}
