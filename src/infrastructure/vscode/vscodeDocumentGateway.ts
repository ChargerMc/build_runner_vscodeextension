import * as vscode from 'vscode';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import {
  DocumentGateway,
  DocumentSnapshot,
} from '../../application/ports/document';
import { toDomainWorkspaceFolder } from './workspaceMapper';

export class VscodeDocumentGateway implements DocumentGateway {
  async getActiveDocument(): Promise<DocumentSnapshot | null> {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) {
      return null;
    }

    return this.fromTextDocument(document);
  }

  async openDocument(path: string): Promise<DocumentSnapshot | null> {
    try {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(path)
      );
      return this.fromTextDocument(document);
    } catch {
      return null;
    }
  }

  getWorkspaceFolder(documentPath: string): WorkspaceFolder | null {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(documentPath)
    );
    return workspaceFolder ? toDomainWorkspaceFolder(workspaceFolder) : null;
  }

  private fromTextDocument(document: vscode.TextDocument): DocumentSnapshot {
    return {
      path: document.uri.fsPath,
      languageId: document.languageId,
      text: document.getText(),
    };
  }
}
