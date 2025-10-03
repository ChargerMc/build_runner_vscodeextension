import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';

export interface DocumentSnapshot {
  readonly path: string;
  readonly languageId: string;
  readonly text: string;
}

export interface DocumentGateway {
  getActiveDocument(): Promise<DocumentSnapshot | null>;
  openDocument(path: string): Promise<DocumentSnapshot | null>;
  getWorkspaceFolder(documentPath: string): WorkspaceFolder | null;
}
