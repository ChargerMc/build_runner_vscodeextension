import * as nls from 'vscode-nls';
import { WorkspaceFolder } from '../../domain/workspace/workspaceFolder';
import { FolderPickerService } from '../ports/folderPicker';
import { FlutterSdkGateway } from '../ports/flutterSdk';
import { BuildRunnerDetector } from '../ports/buildRunner';
import { Logger } from '../ports/logger';
import { MessageService } from '../ports/messageService';
import { ProcessRunner } from '../ports/processRunner';
import { WorkspaceGateway } from '../ports/workspace';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const CLEAN_ARGS = ['run', 'build_runner', 'clean'];

export class CleanBuildRunnerCommand {
  constructor(
    private readonly workspaceGateway: WorkspaceGateway,
    private readonly folderPicker: FolderPickerService,
    private readonly flutterSdk: FlutterSdkGateway,
    private readonly buildRunnerDetector: BuildRunnerDetector,
    private readonly logger: Logger,
    private readonly messages: MessageService,
    private readonly processRunner: ProcessRunner
  ) {}

  async execute(target?: unknown): Promise<void> {
    const { supported: folders, candidates } = await this.getSupportedFolders();
    const hasCandidates = candidates.length > 0;
    if (folders.length === 0) {
      const messageKey = hasCandidates
        ? 'extension.noBuildRunnerDependencyMessage'
        : 'extension.noDartProjectMessage';
      this.messages.showError(
        localize(
          messageKey,
          hasCandidates
            ? 'No build_runner dependency detected. Install build_runner to use this command.'
            : 'No Dart project detected in the current directory.'
        )
      );
      return;
    }

    let targetFolder: WorkspaceFolder | null = null;
    if (typeof target !== 'undefined') {
      const resolution = this.findTargetFolder(folders, candidates, target);
      targetFolder = resolution?.folder ?? null;

      if (!targetFolder) {
        const messageKey = resolution?.candidateExists
          ? 'extension.noBuildRunnerDependencyMessageForFolder'
          : 'extension.noDartProjectMessageForFolder';
        this.messages.showError(
          localize(
            messageKey,
            resolution?.candidateLabel ??
              localize(
                'extension.unknownFolderLabel',
                'the selected workspace folder'
              )
          )
        );
        return;
      }
    } else {
      targetFolder = await this.resolveTargetFolder(folders);
    }

    if (!targetFolder) {
      return;
    }

    await this.cleanFolder(targetFolder);
  }

  private async resolveTargetFolder(
    folders: WorkspaceFolder[]
  ): Promise<WorkspaceFolder | null> {
    if (folders.length === 1) {
      return folders[0];
    }

    return this.folderPicker.pickWorkspaceFolder(folders, {
      currentlyWatching: new Set<string>(),
    });
  }

  private async cleanFolder(targetFolder: WorkspaceFolder): Promise<void> {
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

    this.logger.clear();
    this.logger.show(true);
    this.logger.appendLine(
      `[build_runner:${targetFolder.name}]: cleaning build cache`
    );
    this.logger.appendLine('');

    try {
      const handle = this.processRunner.runDart(CLEAN_ARGS, {
        cwd: targetFolder.path,
      });

      handle.onStdout((chunk) => {
        this.logger.append(`[build_runner:${targetFolder.name}]: ${chunk}`);
      });

      handle.onStderr((chunk) => {
        this.logger.append(
          `[build_runner error:${targetFolder.name}]: ${chunk}`
        );
      });

      handle.onExit((code) => {
        handle.dispose();
        if (code === 0) {
          this.messages.showInfo(
            localize(
              'extension.cleanSuccessMessage',
              'Build runner cache cleaned.'
            )
          );
        } else {
          this.messages.showError(
            localize(
              'extension.cleanErrorMessage',
              'Build runner clean failed with code {0}.',
              code ?? 'unknown'
            )
          );
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.messages.showError(
        localize(
          'extension.cleanStartError',
          'Failed to run build_runner clean: {0}',
          message
        )
      );
    }
  }

  private extractFolderCandidate(
    target: unknown
  ): { uri?: string; path?: string } | null {
    if (!target) {
      return null;
    }

    if (typeof target === 'string') {
      return { uri: target };
    }

    if (typeof target === 'object') {
      const maybeFolder = this.extractFolderLike(target);
      if (maybeFolder) {
        return maybeFolder;
      }

      if ('folder' in target) {
        const nested = (target as { folder?: unknown }).folder;
        if (nested && typeof nested === 'object') {
          return this.extractFolderLike(nested);
        }
      }
    }

    return null;
  }

  private async getSupportedFolders(): Promise<{
    supported: WorkspaceFolder[];
    candidates: WorkspaceFolder[];
  }> {
    const candidates = this.workspaceGateway.getDartWorkspaceFolders();
    const results = await Promise.all(
      candidates.map(async (folder) => ({
        folder,
        hasBuildRunner: await this.buildRunnerDetector.hasBuildRunner(
          folder.path
        ),
      }))
    );

    const supported = results
      .filter(({ hasBuildRunner }) => hasBuildRunner)
      .map(({ folder }) => folder);

    return { supported, candidates };
  }

  private findTargetFolder(
    supported: WorkspaceFolder[],
    candidates: WorkspaceFolder[],
    target: unknown
  ): {
    folder?: WorkspaceFolder;
    candidateExists: boolean;
    candidateLabel?: string;
  } | null {
    const candidate = this.extractFolderCandidate(target);
    if (!candidate) {
      return null;
    }

    const byUri = candidate.uri
      ? supported.find((folder) => folder.uri === candidate.uri)
      : undefined;
    if (byUri) {
      return {
        folder: byUri,
        candidateExists: true,
        candidateLabel: byUri.name,
      };
    }

    if (candidate.path) {
      const normalizedPath = candidate.path.toLowerCase();
      const byPath = supported.find(
        (folder) => folder.path.toLowerCase() === normalizedPath
      );
      if (byPath) {
        return {
          folder: byPath,
          candidateExists: true,
          candidateLabel: byPath.name,
        };
      }
    }

    const candidateExists = this.matchesCandidate(candidates, candidate);
    return {
      candidateExists,
      candidateLabel: candidate.path ?? candidate.uri,
    };
  }

  private matchesCandidate(
    candidates: WorkspaceFolder[],
    candidate: { uri?: string; path?: string }
  ): boolean {
    if (candidate.uri) {
      const match = candidates.some((folder) => folder.uri === candidate.uri);
      if (match) {
        return true;
      }
    }

    if (candidate.path) {
      const normalizedPath = candidate.path.toLowerCase();
      return candidates.some(
        (folder) => folder.path.toLowerCase() === normalizedPath
      );
    }

    return false;
  }

  private extractFolderLike(
    value: unknown
  ): { uri?: string; path?: string } | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate: { uri?: string; path?: string } = {};
    if (
      'uri' in value &&
      typeof (value as { uri?: unknown }).uri === 'string'
    ) {
      candidate.uri = (value as { uri: string }).uri;
    }

    if (
      'path' in value &&
      typeof (value as { path?: unknown }).path === 'string'
    ) {
      candidate.path = (value as { path: string }).path;
    }

    if (!candidate.path && 'fsPath' in value) {
      const fsPath = (value as { fsPath?: unknown }).fsPath;
      if (typeof fsPath === 'string') {
        candidate.path = fsPath;
      }
    }

    if (
      !candidate.uri &&
      'toString' in value &&
      typeof value.toString === 'function'
    ) {
      const maybeUri = value.toString();
      if (typeof maybeUri === 'string' && maybeUri.startsWith('file:')) {
        candidate.uri = maybeUri;
      }
    }

    if (candidate.uri || candidate.path) {
      return candidate;
    }

    return null;
  }
}
