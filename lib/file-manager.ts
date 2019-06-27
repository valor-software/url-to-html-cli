import * as fs from 'fs';

const promisify = require('util').promisify;

const rmdir = promisify(require('rimraf'));
const writeFile = promisify(require('fs').writeFile);
const mkdir = promisify(require('fs').mkdir);
const dirExists = promisify(require('fs').access);
const readdir = promisify(require('fs').readdir);
const readFile = promisify(require('fs').readFile);
const copyFile = promisify(require('fs').copyFile);

export default class FileManager {
  createSiteStructure(folderName: string) {
    return new Promise(async(res, rej) => {
      try {
        await mkdir(`./save/${folderName}`);
        await mkdir(`./save/${folderName}/assets`);

        await Promise.all([
          mkdir(`./save/${folderName}/assets/fonts`),
          mkdir(`./save/${folderName}/assets/images`),
          mkdir(`./save/${folderName}/assets/videos`),
          mkdir(`./save/${folderName}/assets/css`),
          mkdir(`./save/${folderName}/assets/js`)
        ]);
        res();
      } catch (e) {
        rej(e);
      }
    })
  }

  async read(path: string) {
    return readFile(path, {encoding: 'utf8'});
  }

  async save(folder: string, fname: string, content: any) {
    return writeFile(`./save/${folder}/${fname}`, content);
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

  getFilesList(folderName: string, excludeFoldersList = []): Promise<{name: string; path: string}[]> {
    return new Promise(async res => {
      const result = await readdir(folderName, {withFileTypes: true});
      let folderContent = [];
      for (const item of result) {
        if (item.isFile()) {
          folderContent.push({
            path: `${folderName}/${item.name}`,
            name: item.name
          });
          continue;
        }
        if (excludeFoldersList.indexOf(`${folderName}/${item.name}`) === -1) {
          const sub = await this.getFilesList(`${folderName}/${item.name}`, excludeFoldersList);
          folderContent = folderContent.concat(sub);
        }
      }

      res(folderContent);
    });
  }

  getFolderContent(folderName) {
    return readdir(folderName);
  }

  async getList() {
    return readdir('./save');
  }

  async copy(fromPath, toFolder) {
    return copyFile(fromPath, toFolder);
  }
}
