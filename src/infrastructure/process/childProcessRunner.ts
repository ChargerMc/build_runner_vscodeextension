import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as kill from 'tree-kill';
import { Disposable } from '../../shared/lifecycle/disposable';
import {
  ProcessHandle,
  ProcessOptions,
  ProcessRunner,
} from '../../application/ports/processRunner';

class ChildProcessHandle implements ProcessHandle {
  private readonly disposables: Array<() => void> = [];
  private disposed = false;

  constructor(private readonly child: ChildProcessWithoutNullStreams) {}

  get pid(): number | undefined {
    return this.child.pid ?? undefined;
  }

  onStdout(listener: (chunk: string) => void): Disposable {
    const handler = (data: Buffer | string) => listener(data.toString());
    this.child.stdout.on('data', handler);
    return this.track(() => this.child.stdout.off('data', handler));
  }

  onStderr(listener: (chunk: string) => void): Disposable {
    const handler = (data: Buffer | string) => listener(data.toString());
    this.child.stderr.on('data', handler);
    return this.track(() => this.child.stderr.off('data', handler));
  }

  onExit(
    listener: (code: number | null, signal: NodeJS.Signals | null) => void
  ): Disposable {
    const handler = (code: number | null, signal: NodeJS.Signals | null) => {
      listener(code, signal);
    };
    this.child.on('exit', handler);
    return this.track(() => this.child.off('exit', handler));
  }

  async terminate(signal: NodeJS.Signals | number = 'SIGTERM'): Promise<void> {
    const pid = this.child.pid;
    if (pid === undefined) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      kill(pid, signal, (error) => {
        if (error && (error as NodeJS.ErrnoException).code !== 'ESRCH') {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    while (this.disposables.length > 0) {
      try {
        const dispose = this.disposables.pop();
        dispose?.();
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  private track(dispose: () => void): Disposable {
    this.disposables.push(dispose);
    return { dispose };
  }
}

export class ChildProcessRunner implements ProcessRunner {
  runDart(args: string[], options: ProcessOptions): ProcessHandle {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'cmd' : 'dart';
    const commandArgs = isWindows ? ['/c', 'dart', ...args] : args;

    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'pipe',
    });

    return new ChildProcessHandle(child);
  }
}
