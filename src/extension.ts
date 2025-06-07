import * as vscode from 'vscode';
import { WatchManager } from './commands/watchManager';
import { BuildManager } from './commands/buildManager';

export function activate(context: vscode.ExtensionContext) {
  const watchManager = new WatchManager(context);
  const buildManager = new BuildManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.toggleWatch', () => watchManager.toggle()),
    vscode.commands.registerCommand('extension.buildSelected', () => buildManager.buildSelectedFile()),
  );
}

export function deactivate() {}
