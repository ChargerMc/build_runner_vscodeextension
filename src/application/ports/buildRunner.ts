export interface BuildRunnerDetector {
  hasBuildRunner(folderPath: string): Promise<boolean>;
}
