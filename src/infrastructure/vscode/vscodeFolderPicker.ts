import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import { FolderPickerService } from '../../application/ports/folderPicker';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

interface FolderQuickPickItem extends vscode.QuickPickItem {
  folder: WorkspaceFolder;
}

export class VscodeFolderPicker implements FolderPickerService {
  async pickWorkspaceFolder(
    folders: WorkspaceFolder[],
    options: { currentlyWatching: Set<string> }
  ): Promise<WorkspaceFolder | null> {
    const items: FolderQuickPickItem[] = folders.map((folder) => ({
      label: folder.name,
      description: folder.path,
      detail: options.currentlyWatching.has(folder.uri)
        ? localize('extension.folderStatus.watching', 'Currently watching')
        : localize('extension.folderStatus.idle', 'Not watching'),
      folder,
    }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: localize(
        'extension.chooseWorkspaceFolder',
        'Select a workspace folder'
      ),
    });

    return selection?.folder ?? null;
  }
}
