export interface FileSystemGateway {
  exists(path: string): boolean;
  readFile(path: string): Promise<string>;
}
