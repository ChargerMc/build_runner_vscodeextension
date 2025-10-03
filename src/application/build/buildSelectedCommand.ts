import * as nls from 'vscode-nls';
import { resolveBuildFilters } from '../../domain/build/buildFilterResolver';
import { DocumentGateway } from '../ports/document';
import { FileSystemGateway } from '../ports/fileSystem';
import { FlutterSdkGateway } from '../ports/flutterSdk';
import { Logger } from '../ports/logger';
import { MessageService } from '../ports/messageService';
import { ProcessRunner } from '../ports/processRunner';
import { WorkspaceGateway } from '../ports/workspace';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const BUILD_ARGS = ['run', 'build_runner', 'build', '--delete-conflicting-outputs'];

export class BuildSelectedCommand {
  constructor(
    private readonly documentGateway: DocumentGateway,
    private readonly workspaceGateway: WorkspaceGateway,
    private readonly fileSystem: FileSystemGateway,
    private readonly flutterSdk: FlutterSdkGateway,
    private readonly logger: Logger,
    private readonly messages: MessageService,
    private readonly processRunner: ProcessRunner
  ) {}

  async execute(targetPath?: string): Promise<void> {
    const document = targetPath
      ? await this.documentGateway.openDocument(targetPath)
      : await this.documentGateway.getActiveDocument();

    if (!document) {
      this.messages.showError(
        localize('extension.noActiveFileMessage', 'No active file to build.')
      );
      return;
    }

    if (document.languageId !== 'dart') {
      this.messages.showError(
        localize('extension.noActiveFileMessage', 'No active file to build.')
      );
      return;
    }

    const workspaceFolder = this.documentGateway.getWorkspaceFolder(document.path);
    if (!workspaceFolder || !this.workspaceGateway.isDartWorkspace(workspaceFolder)) {
      this.messages.showError(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current directory.'
        )
      );
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

    const resolution = resolveBuildFilters({
      documentPath: document.path,
      documentText: document.text,
      workspaceRoot: workspaceFolder.path,
      fileExists: (target) => this.fileSystem.exists(target),
    });

    if (!resolution) {
      this.messages.showError(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current directory.'
        )
      );
      return;
    }

    if (resolution.buildFilters.length === 0) {
      this.logger.clear();
      this.logger.show(true);
      this.logger.appendLine(
        `[build_runner]: No generated file targets found for: ${resolution.relativeDocumentPath}`
      );
      this.logger.appendLine(
        '[build_runner]: Add part directives (e.g. part "*.g.dart";) to enable targeted builds.'
      );
      return;
    }

    const missingFilters = new Set(resolution.missingFilters);

    const args = [...BUILD_ARGS];
    for (const filter of resolution.buildFilters) {
      args.push('--build-filter', filter);
    }

    this.logger.clear();
    this.logger.show(true);
    this.logger.appendLine(
      `[build_runner]: Building generated files for: ${resolution.relativeDocumentPath}`
    );
    this.logger.appendLine('');
    this.logger.appendLine('[build_runner]: Using build filters:');
    for (const filter of resolution.buildFilters) {
      this.logger.appendLine(`  - ${filter}`);
    }
    this.logger.appendLine('');

    if (missingFilters.size > 0) {
      this.logger.appendLine('[build_runner]: Pending generated files will be created if needed:');
      for (const filter of missingFilters) {
        this.logger.appendLine(`  - ${filter}`);
      }
      this.logger.appendLine('');
    }

    const handle = this.processRunner.runDart(args, {
      cwd: workspaceFolder.path,
    });

    handle.onStdout((chunk) => {
      this.logger.append(`[build_runner]: ${chunk}`);
    });

    handle.onStderr((chunk) => {
      this.logger.append(`[build_runner error]: ${chunk}`);
    });

    handle.onExit((code) => {
      handle.dispose();
      if (code === 0) {
        this.messages.showInfo(
          localize('extension.buildSuccessMessage', 'Build completed.')
        );
      } else {
        this.messages.showError(
          localize(
            'extension.buildErrorMessage',
            'Build failed with code {0}.',
            code ?? 'unknown'
          )
        );
      }
    });
  }
}
