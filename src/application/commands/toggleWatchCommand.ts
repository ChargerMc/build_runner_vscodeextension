import * as nls from 'vscode-nls';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import { FolderPickerService } from '../ports/folderPicker';
import { FlutterSdkGateway } from '../ports/flutterSdk';
import { MessageService } from '../ports/messageService';
import { WorkspaceGateway } from '../ports/workspace';
import { WatchService } from '../watch/watchService';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class ToggleWatchCommand {
  constructor(
    private readonly workspaceGateway: WorkspaceGateway,
    private readonly folderPicker: FolderPickerService,
    private readonly flutterSdk: FlutterSdkGateway,
    private readonly messages: MessageService,
    private readonly watchService: WatchService
  ) {}

  async execute(): Promise<void> {
    const dartFolders = this.workspaceGateway.getDartWorkspaceFolders();
    if (dartFolders.length === 0) {
      this.messages.showError(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current workspace.'
        )
      );
      return;
    }

    const targetFolder = await this.resolveTargetFolder(dartFolders);
    if (!targetFolder) {
      return;
    }

    if (this.watchService.isWatching(targetFolder)) {
      await this.watchService.stop(targetFolder);
      return;
    }

    const sdkPath =
      (await this.flutterSdk.resolveFlutterSdk()) ??
      (await this.flutterSdk.promptForFlutterSdk());

    if (!sdkPath) {
      this.messages.showError(
        localize(
          'extension.flutterSdkRequiredMessage',
          'Flutter SDK is required to run this command.'
        )
      );
      return;
    }

    await this.watchService.start(targetFolder);
  }

  private async resolveTargetFolder(
    folders: WorkspaceFolder[]
  ): Promise<WorkspaceFolder | null> {
    if (folders.length === 1) {
      return folders[0];
    }

    const watching = new Set(
      this.watchService.getActiveSessions().map((session) => session.folder.uri)
    );

    return this.folderPicker.pickWorkspaceFolder(folders, {
      currentlyWatching: watching,
    });
  }
}
