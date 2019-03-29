import * as urlParser from 'url';
const zlib = require('zlib');
const request = require('request');

import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import FileManager from './file-manager';
import { settings } from './settings';
import { getLinkFolder, normalizeUrl, processResourcesFromString, removeEndSlash } from './utils';

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
              private hostUrl: string) {}

  addToQueue(url: string, fileType: string, folder: string) {
    const host = urlParser.parse(url);
    if (url.startsWith('//') || /woff|woff2|ttf$/.test(url) ||
      settings.excludedDomains.indexOf(host.hostname) !== -1) {
      return url;
    }
    const split = url.split('/');
    const filename = split[split.length - 1].replace(/[\s%]/g, '_');
    const subfolder = getLinkFolder(fileType);
    const savePath = `./save/${folder}/${subfolder}/${filename}`;

    if (!this.resourcesQueue.get(savePath)) {
      this.resourcesQueue.set(savePath, {
        url: normalizeUrl(url, this.originalUrl),
        isLoaded: false,
        flags: {}}
      );
    }
    const sanitizedHost = removeEndSlash(this.hostUrl);
    return `${sanitizedHost}/${subfolder}/${filename}`;
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

  getContentByUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const spinner = new Spinner({text: `Processing sitemap %s`});
      spinner.setSpinnerString(27);
      spinner.start();
      request({
        url: url,
        method: 'head'
      }, (err, res) => {
        if (err) {
          console.log(err);
          spinner.stop(true);
          reject('Sitemap loading error');

          return;
        }

        if (res.statusCode !== 200) {
          spinner.stop(true);
          reject('Sitemap not found');

          return;
        }

        request({
          url: url,
          method: 'get'
        }, (error, response) => {
          if (error) {
            console.log(error);
            spinner.stop(true);
            reject('Sitemap loading error');

            return;
          }
          spinner.stop(true);
          console.log(chalk.green(chalk.bold('Sitemap loaded successfully')));
          resolve(response.body);
        });
      });
    });
  }

  processCssFiles() {
    return new Promise(async res => {
      // todo: refactor next
      const cssFilesList = await this.fileManager.getFolderContent(`./save/${this.folder}/assets/css`);
      const cssFiles = cssFilesList.map(async file => {
        await this.postProcessCSS(`./save/${this.folder}/assets/css/${file}`, this.folder);
      });

      await Promise.all(cssFiles);
      res();
    });
  }

  postProcessCSS(filePath: string, folder) {
    return new Promise(async (res) => {
      if (!filePath.endsWith('.css')) {
        return;
      }
      const content = await this.fileManager.read(filePath);

      const out = processResourcesFromString(content, (url) => {
        return this.addToQueue(url, 'image', folder);
      });

      await this.fileManager.directSave(filePath, out);
      res();
    });
  }
}
