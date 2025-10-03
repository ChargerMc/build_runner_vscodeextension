import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import { WatchSession } from '../../domain/watch/watchSession';
import { Disposable } from '../../shared/lifecycle/disposable';
import { WatchService } from '../../application/watch/watchService';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class WatchStatusBarPresenter implements Disposable {
  private readonly statusBar: vscode.StatusBarItem;
  private readonly subscription: Disposable;

  constructor(private readonly watchService: WatchService) {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0
    );
    this.statusBar.command = 'extension.toggleWatch';
    this.statusBar.show();

    this.subscription = this.watchService.onDidChangeSessions((sessions) => {
      this.updateStatusBar(sessions);
    });

    this.updateStatusBar(this.watchService.getActiveSessions());
  }

  dispose(): void {
    this.subscription.dispose();
    this.statusBar.dispose();
  }

  private updateStatusBar(sessions: WatchSession[]): void {
    const activeCount = sessions.length;
    if (activeCount === 0) {
      this.statusBar.text = '$(eye-closed) Watch';
      this.statusBar.tooltip = localize(
        'extension.toggleWatch.tooltip.start',
        'Start build_runner watch'
      );
      return;
    }

    this.statusBar.tooltip = localize(
      'extension.toggleWatch.tooltip.stop',
      'Stop build_runner watch'
    );

    if (activeCount === 1) {
      const [session] = sessions;
      const label = localize(
        'extension.statusBar.single',
        'Watching {0}',
        session.folder.name
      );
      this.statusBar.text = `$(watch) ${label}`;
      return;
    }

    const label = localize(
      'extension.statusBar.multiple',
      'Watching {0} folders',
      activeCount
    );
    this.statusBar.text = `$(watch) ${label}`;
  }
}
