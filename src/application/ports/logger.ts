export interface Logger {
  clear(): void;
  show(preserveFocus?: boolean): void;
  append(value: string): void;
  appendLine(value: string): void;
}
