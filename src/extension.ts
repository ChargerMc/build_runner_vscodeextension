import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as kill from 'tree-kill';
import * as nls from 'vscode-nls';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

let watchProcess: ChildProcessWithoutNullStreams | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  // Crear el ítem de la barra de estado
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarItem.text = '$(eye-closed) Watch';
  statusBarItem.command = 'extension.toggleWatch';
  statusBarItem.tooltip = localize(
    'extension.toggleWatch.tooltip.start',
    'Start build_runner watch'
  );
  statusBarItem.show();

  // Crear el canal de salida
  outputChannel = vscode.window.createOutputChannel(
    localize('extension.outputChannel', 'Dart Build Runner Watch')
  );
  context.subscriptions.push(statusBarItem);

  // Registrar el comando
  let disposable = vscode.commands.registerCommand(
    'extension.toggleWatch',
    toggleWatch
  );
  context.subscriptions.push(disposable);
}

async function toggleWatch() {
  if (watchProcess) {
    // Intentar detener el proceso si está en ejecución usando tree-kill
    if (watchProcess && watchProcess.pid !== undefined) {
      kill(watchProcess.pid, 'SIGINT', (err) => {
        if (err) {
          vscode.window.showErrorMessage(
            localize(
              'extension.errorStopMessage',
              'Error stopping process: {0}',
              err.message
            )
          );
        } else {
          watchProcess = null;
          statusBarItem.text = '$(eye-closed) Watch';
          statusBarItem.tooltip = localize(
            'extension.toggleWatch.tooltip.start',
            'Start build_runner watch'
          );
          vscode.window.showInformationMessage(
            localize('extension.stopMessage', 'Build runner watch stopped.')
          );
        }
      });
    }
  } else {
    // Verificar si estamos en un proyecto Dart y si Flutter SDK está instalado
    if (!isDartProject()) {
      vscode.window.showErrorMessage(
        localize(
          'extension.noDartProjectMessage',
          'No Dart project detected in the current directory.'
        )
      );
      return;
    }

    let flutterSdkPath = await getFlutterSdkPath();
    if (!flutterSdkPath) {
      flutterSdkPath = await promptForFlutterSdkPath();
      if (!flutterSdkPath) {
        vscode.window.showErrorMessage(
          localize(
            'extension.flutterSdkRequiredMessage',
            'Flutter SDK is required to run this command.'
          )
        );
        return;
      }
    }

    // Iniciar el proceso
    const command = process.platform === 'win32' ? 'cmd' : 'dart';
    const args =
      process.platform === 'win32'
        ? [
            '/c',
            'dart',
            'run',
            'build_runner',
            'watch',
            '--delete-conflicting-outputs',
          ]
        : ['run', 'build_runner', 'watch', '--delete-conflicting-outputs'];

    outputChannel.clear();
    outputChannel.show(true);

    watchProcess = spawn(command, args, { cwd: vscode.workspace.rootPath });

    watchProcess.stdout.on('data', (data) => {
      outputChannel.append(`[build_runner]: ${data}`);
    });

    watchProcess.stderr.on('data', (data) => {
      outputChannel.append(`[build_runner error]: ${data}`);
    });

    watchProcess.on('exit', (code, signal) => {
      watchProcess = null;
      statusBarItem.text = '$(eye-closed) Watch';
      statusBarItem.tooltip = localize(
        'extension.toggleWatch.tooltip.start',
        'Start build_runner watch'
      );

      // Si el proceso fue detenido manualmente, ignoramos el código de error
      if (signal === null || signal === 'SIGKILL' || code === 0) {
        vscode.window.showInformationMessage(
          localize('extension.stopMessage', 'Build runner watch stopped.')
        );
      } else {
        vscode.window.showErrorMessage(
          localize(
            'extension.errorStopMessage',
            'Build runner watch stopped unexpectedly with code {0}.',
            code
          )
        );
      }
    });

    statusBarItem.text = '$(eye) Watching...';
    statusBarItem.tooltip = localize(
      'extension.toggleWatch.tooltip.stop',
      'Stop build_runner watch'
    );
    vscode.window.showInformationMessage(
      localize('extension.startMessage', 'Build runner watch started.')
    );
  }
}

function isDartProject(): boolean {
  const pubspecPath = path.join(
    vscode.workspace.rootPath || '',
    'pubspec.yaml'
  );
  return fs.existsSync(pubspecPath);
}

function getFlutterSdkPath(): Promise<string | null> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'cmd' : 'flutter';
    const args =
      process.platform === 'win32'
        ? ['/c', 'flutter', '--version']
        : ['--version'];

    const flutterProcess = spawn(command, args);

    flutterProcess.on('error', () => {
      resolve(null);
    });

    flutterProcess.stdout.on('data', () => {});

    flutterProcess.on('close', (code) => {
      if (code === 0) {
        resolve(command);
      } else {
        resolve(null);
      }
    });
  });
}

async function promptForFlutterSdkPath(): Promise<string | null> {
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
