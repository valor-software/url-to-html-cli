import * as fs from 'fs';

const promisify = require('util').promisify;

const rmdir = promisify(require('rimraf'));
const writeFile = promisify(require('fs').writeFile);
const mkdir = promisify(require('fs').mkdir);
const dirExists = promisify(require('fs').access);
const readdir = promisify(require('fs').readdir);
const readFile = promisify(require('fs').readFile);

export default class FileManager {
  createSiteStructure(folderName: string) {
    return new Promise(async(res, rej) => {
      try {
        await mkdir(`./save/${folderName}`);
        await mkdir(`./save/${folderName}/assets`);

        await Promise.all([
          mkdir(`./save/${folderName}/assets/fonts`) as any,
          mkdir(`./save/${folderName}/assets/images`) as any,
          mkdir(`./save/${folderName}/assets/css`) as any,
          mkdir(`./save/${folderName}/assets/js`)  as any,
        ]);
        res();
      } catch (e) {
        rej(e);
      }
    })
  }

  async read(path: string) {
    return readFile(path);
  }

  async save(folder: string, fname: string, content: any) {
    return writeFile(`./save/${folder}${fname}`, content);
  }

  async directSave(path: string, content: any) {
    return writeFile(path, content);
  }

  async createFolder(folder: string) {
    const dirname = `./save/${folder}`;
    return new Promise(async (res, rej) => {
      try {
        await dirExists(dirname);
        res();
        return;
      } catch (e) {
        if (e.code === 'ENOENT') {
          await mkdir(dirname);
          return res();
        }
        rej(e);
      }
    });

  }

  async clearBatch(folderNames: string[]) {
    const list = folderNames.map(folder => rmdir(`./save/${folder}`));
    return Promise.all(list);
  }

  getWriteStream(filename) {
    return fs.createWriteStream(filename);
  }


  getFolderContent(folderName) {
    return readdir(`./save/${folderName}`);
  }

  async getList() {
    return readdir('./save');
  }
}
