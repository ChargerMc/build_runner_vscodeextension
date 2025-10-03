import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';

export interface WorkspaceGateway {
  getDartWorkspaceFolders(): WorkspaceFolder[];
  isDartWorkspace(folder: WorkspaceFolder): boolean;
}
