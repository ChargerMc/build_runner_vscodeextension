import { WorkspaceFolder } from '../workspace/workspaceFolder';

enum WatchState {
  Starting = 'starting',
  Running = 'running',
  Restarting = 'restarting',
  Stopped = 'stopped',
}

export interface WatchSession {
  readonly folder: WorkspaceFolder;
  readonly pid?: number;
  readonly state: WatchState;
}

export { WatchState };
