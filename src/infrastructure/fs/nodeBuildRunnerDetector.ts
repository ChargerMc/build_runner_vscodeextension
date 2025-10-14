import * as path from 'path';
import { FileSystemGateway } from '../../application/ports/fileSystem';
import { BuildRunnerDetector } from '../../application/ports/buildRunner';

const BUILD_RUNNER_DEP_REGEX = /build_runner\s*:/;

export class NodeBuildRunnerDetector implements BuildRunnerDetector {
  constructor(private readonly fileSystem: FileSystemGateway) {}

  async hasBuildRunner(folderPath: string): Promise<boolean> {
    const pubspecPath = path.join(folderPath, 'pubspec.yaml');
    if (!this.fileSystem.exists(pubspecPath)) {
      return false;
    }

    try {
      const contents = await this.fileSystem.readFile(pubspecPath);
      return BUILD_RUNNER_DEP_REGEX.test(contents);
    } catch {
      return false;
    }
  }
}
