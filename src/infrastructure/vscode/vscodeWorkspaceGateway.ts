import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { WorkspaceGateway } from '../../application/ports/workspace';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import { toDomainWorkspaceFolder } from './workspaceMapper';

export class VscodeWorkspaceGateway implements WorkspaceGateway {
  getDartWorkspaceFolders(): WorkspaceFolder[] {
    return (vscode.workspace.workspaceFolders ?? [])
      .map(toDomainWorkspaceFolder)
      .filter((folder) => this.isDartWorkspace(folder));
  }

  isDartWorkspace(folder: WorkspaceFolder): boolean {
    const pubspecPath = path.join(folder.path, 'pubspec.yaml');
    return fs.existsSync(pubspecPath);
  }
}
