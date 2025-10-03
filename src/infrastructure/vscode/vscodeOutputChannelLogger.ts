import * as vscode from 'vscode';
import { Logger } from '../../application/ports/logger';

export class VscodeOutputChannelLogger implements Logger {
  constructor(private readonly channel: vscode.OutputChannel) {}

  clear(): void {
    this.channel.clear();
  }

  show(preserveFocus?: boolean): void {
    this.channel.show(preserveFocus);
  }

  append(value: string): void {
    this.channel.append(value);
  }

  appendLine(value: string): void {
    this.channel.appendLine(value);
  }

  get outputChannel(): vscode.OutputChannel {
    return this.channel;
  }
}
