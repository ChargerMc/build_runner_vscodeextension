import * as vscode from 'vscode';
import { MessageService } from '../../application/ports/messageService';

export class VscodeMessageService implements MessageService {
  showError(message: string): void {
    void vscode.window.showErrorMessage(message);
  }

  showInfo(message: string): void {
    void vscode.window.showInformationMessage(message);
  }
}
