import { spawn } from 'child_process';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import { FlutterSdkGateway } from '../../application/ports/flutterSdk';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class FlutterSdkResolver implements FlutterSdkGateway {
  async resolveFlutterSdk(): Promise<string | null> {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'cmd' : 'flutter';
      const args = isWindows ? ['/c', 'flutter', '--version'] : ['--version'];

      const flutterProcess = spawn(command, args);

      flutterProcess.on('error', () => resolve(null));

      flutterProcess.on('close', (code) => {
        if (code === 0) {
          resolve(command);
        } else {
          resolve(null);
        }
      });
    });
  }

  async promptForFlutterSdk(): Promise<string | null> {
    const sdkPath = await vscode.window.showInputBox({
      placeHolder: localize(
        'extension.enterFlutterSdkPath',
        'Enter the Flutter SDK path'
      ),
      prompt: localize(
        'extension.sdkPromptMessage',
        'Flutter SDK not found. Please enter its installation path.'
      ),
    });

    return sdkPath || null;
  }
}
