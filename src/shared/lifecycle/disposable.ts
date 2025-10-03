export interface Disposable {
  dispose(): void;
}

export class DisposableStore implements Disposable {
  private readonly disposables: Disposable[] = [];

  add<T extends Disposable>(disposable: T): T {
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      try {
        disposable?.dispose();
      } catch {
        // Swallow errors on dispose to avoid crashing shutdown flow.
      }
    }
  }
}

export class MutableDisposable<T extends Disposable> implements Disposable {
  private value: T | undefined;

  set(disposable: T | undefined): void {
    this.value?.dispose();
    this.value = disposable;
  }

  dispose(): void {
    this.set(undefined);
  }
}
