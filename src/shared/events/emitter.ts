import { Disposable } from '../lifecycle/disposable';

type Listener<T> = (event: T) => void;

class ListenerDisposable<T> implements Disposable {
  constructor(
    private readonly listeners: Set<Listener<T>>,
    private readonly listener: Listener<T>
  ) {}

  dispose(): void {
    this.listeners.delete(this.listener);
  }
}

export class Emitter<T> implements Disposable {
  private readonly listeners = new Set<Listener<T>>();

  event = (listener: Listener<T>): Disposable => {
    this.listeners.add(listener);
    return new ListenerDisposable(this.listeners, listener);
  };

  fire(event: T): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors to keep other listeners running.
      }
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}
