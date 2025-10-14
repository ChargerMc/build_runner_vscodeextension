import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { FileSystemGateway } from '../../application/ports/fileSystem';

export class NodeFileSystem implements FileSystemGateway {
  exists(path: string): boolean {
    return fs.existsSync(path);
  }

  async readFile(path: string): Promise<string> {
    return fsPromises.readFile(path, 'utf8');
  }
}
