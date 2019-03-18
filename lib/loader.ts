import * as urlParser from 'url';
const zlib = require('zlib');
const request = require('request');

import chalk from 'chalk';

const Spinner = require('cli-spinner').Spinner;
import FileManager from './file-manager';
import { settings } from './settings';
import { removeEndSlash, removeStartSlash } from './utils';

interface Resource {
  url: string,
  isLoaded: boolean,
  flags: Object
}

export default class Loader {
  resourcesQueue = new Map<string, Resource>();
  errors: string[] = [];

  constructor(private fileManager: FileManager,
              private folder: string,
              private originalUrl: string,
              public hostUrl: string) {}

  addToQueue(url: string, fileType: string, folder: string) {
    const host = urlParser.parse(url);
    if (url.startsWith('//') || /woff|woff2|ttf$/.test(url) ||
      settings.excludedDomains.indexOf(host.hostname) !== -1) {
      return url;
    }
    const split = url.split('/');
    const filename = split[split.length - 1].replace('%', '_');
    const subfolder = this.getLinkFolder(fileType);
    const savePath = `./save/${folder}/${subfolder}/${filename}`;

    if (!this.resourcesQueue.get(savePath)) {
      this.resourcesQueue.set(savePath, {
        url: this.normalizeUrl(url),
        isLoaded: false,
        flags: {}}
      );
    }
    const sanitizedHost = removeEndSlash(this.hostUrl);
    return `${sanitizedHost}/${subfolder}/${filename}`;
  }

  getLinkFolder(linkType) {
    const types = [
      {
        type: 'text/css',
        folder: 'assets/css'
      }, {
        type: 'javascript',
        folder: 'assets/js'
      }, {
        type: 'image',
        folder: 'assets/images'
      }
    ];
    const folder = types.find(item => item.type === linkType);
    return folder ? folder.folder : 'assets/images';
  }

  normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }

    return `${removeEndSlash(this.originalUrl)}/${removeStartSlash(url)}`;
  }

  async loadResources() {
    let counter = 0;
    for (let entry of this.resourcesQueue.entries()) {
      counter++;
      const [key, val] = entry;
      if (val.isLoaded) {
        continue;
      }
      await this.downloadResource(key, val, {total: this.resourcesQueue.size, index: counter});
      val.isLoaded = true;
    }

    if (this.errors.length > 0) {
      console.log(chalk.red(chalk.bold('Some errors was occurred')));
      this.errors.forEach(error => {
        console.log('\n\n\n');
        console.log(chalk.red(error));
      })
    }

  }

  downloadResource(filename, resource, meta) {
    return new Promise(async (resolve) => {
      const spinner = new Spinner({text: `${meta.index}/${meta.total}: ${resource.url} %s`});
      spinner.setSpinnerString(27);
      spinner.start();
      request({
        url: resource.url,
        method: 'head'
      }, (err, res) => {
        if (err) {
          this.errors.push(`${resource.url} was not loaded. Error: ${err.message}`);
          spinner.stop(true);
          console.log(resource.url + chalk.red(' error'));
          return resolve();
        }

        let piped = request(resource.url);

        if (res && res.headers) {
          if (res.headers['content-encoding'] === 'gzip')  {
            piped = piped.pipe(zlib.createGunzip());
          }
        }

        piped.on('close', () => {
            spinner.stop(true);
            console.log(resource.url + chalk.green(' done'));
            resolve();
        });

        piped.on('error', (error) => {
          this.errors.push(`${resource.url} was not loaded. Error: ${error.message}`);
          spinner.stop(true);
          console.log(resource.url + chalk.red(' error'));
          resolve();
        });
        piped.pipe(this.fileManager.getWriteStream(filename));
      });
    });
  }

  processCssFiles(filesList: string[], dd) {
    return new Promise(async res => {
      filesList.forEach(async (file) => {
        await this.postProcessCSS(`./save/${dd.folder}/assets/css/${file}`, dd.folder);
        res();
      })
    });
  }

  postProcessCSS(filePath: string, folder) {
    return new Promise(async (res) => {
      if (!filePath.endsWith('.css')) {
        return;
      }
      const content = await this.fileManager.read(filePath);

      const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;()]*[-A-Z0-9+&@#\/%=~_|])/ig;
      const outFB = content.toString().replace(urlRegex, (url) => {
        return this.addToQueue(url, 'image', folder);
      });

      await this.fileManager.directSave(filePath, outFB);
      res();
    });
  }
}
