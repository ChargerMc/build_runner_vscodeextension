import * as vscode from 'vscode';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';

export function toDomainWorkspaceFolder(
  folder: vscode.WorkspaceFolder
): WorkspaceFolder {
  return {
    name: folder.name,
    path: folder.uri.fsPath,
    uri: folder.uri.toString(),
  };
}
