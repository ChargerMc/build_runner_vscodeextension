import { Disposable } from '../../shared/lifecycle/disposable';

export interface ProcessOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessHandle extends Disposable {
  readonly pid?: number;
  onStdout(listener: (chunk: string) => void): Disposable;
  onStderr(listener: (chunk: string) => void): Disposable;
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): Disposable;
  terminate(signal?: NodeJS.Signals | number): Promise<void>;
}

export interface ProcessRunner {
  runDart(args: string[], options: ProcessOptions): ProcessHandle;
}
