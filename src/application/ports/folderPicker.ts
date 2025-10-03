import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';

export interface FolderPickerService {
  pickWorkspaceFolder(
    folders: WorkspaceFolder[],
    options: { currentlyWatching: Set<string> }
  ): Promise<WorkspaceFolder | null>;
}
