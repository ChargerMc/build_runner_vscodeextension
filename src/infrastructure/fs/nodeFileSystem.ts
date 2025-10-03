import * as fs from 'fs';
import { FileSystemGateway } from '../../application/ports/fileSystem';

export class NodeFileSystem implements FileSystemGateway {
  exists(path: string): boolean {
    return fs.existsSync(path);
  }
}
