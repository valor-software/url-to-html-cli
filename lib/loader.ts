import { TransformCallback } from 'stream';
import * as fs from 'fs';

const zlib = require("zlib");
const request = require("request");
import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;
import FileManager from './file-manager';
const Transform = require('stream').Transform;

interface Resource {
  url: string,
  isLoaded: boolean,
  flags: Object
}

class cssAnalyzer extends Transform {
  constructor() {
    super();
  }
  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    console.log('\n\n CHUNK!!\n');

    // console.log(chunk.toString());
    // this.push(chunk);
    callback(undefined, chunk);
  }

  // _flush(done)
  // {
  //   console.log('IN FLUSH');
  //
  //   this.end('some');
  //   // done(null, 'some11');
  // }
}

const transformer = new Transform({
  transform: (data, encoding, cb) => {
    // console.log('HERE', data, encoding);
    // const result = data.toString() + '-';

    cb(null, data.toString());
  }});

export default class Loader {
  resourcesQueue = new Map<string, Resource>();
  errors: string[] = [];

  constructor(private fileManager: FileManager) {}

  addToLoadingQueue(filename: string, url: string, flags?: {}): void {
    if (this.resourcesQueue.get(filename)) {
      return;
    }

    this.resourcesQueue.set(filename, {url, isLoaded: false, flags});
  }


  async loadResources() {
    let counter = 0;
    for (let entry of this.resourcesQueue.entries()) {
      counter++;
      const [key, val] = entry;
      await this.downloadResource(key, val, {total: this.resourcesQueue.size, index: counter});
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
    let lastPiped;
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
          // if (res.headers['content-type'].includes('text/css'))  {
          //   piped = piped.pipe(new cssAnalyzer());
          // }
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

        piped.on('finish', () => this.postProcessCSS(lastPiped.path));

        lastPiped = piped.pipe(this.fileManager.getWriteStream(filename));
      });
    });
  }

  postProcessCSS(lastPipedPath: string): void {
    if (!lastPipedPath.endsWith('.css')) {
      return;
    }

    const commonUrlRegexp = /url\(.*?\)/ig;

    fs.readFile(lastPipedPath, {encoding: 'utf8'}, (err: Error, fileBody: string) => {
      if (err) {
        console.error(err);
        return;
      }
      const httpURLs = fileBody.match(commonUrlRegexp)
        .map((url: string) => url.replace(/url\("|'^/, ''))
        .map((url: string) => url.replace(/'|"|\)$/g, ''))
        .filter((url: string) => !url.startsWith('data:'));

      this.useLocalAssets({
        urls: httpURLs,
        cssFilePath: lastPipedPath,
        fileBody
      });
    });
  }

  useLocalAssets({
    cssFilePath,
    fileBody,
    urls
  }): void {
    const last = (list: string[] | string): string => list[list.length - 1];
    let resultFileBody = fileBody;

    urls.forEach((url: string) => {
      const assetName = last(url.split('/'));
      const isImage = /jpeg|jpg|png|gif|svg$/.test(assetName);
      const isFont = /woff|woff2|ttf$/.test(assetName) || assetName.includes('');
  
      let assetsSubFolder;
  
      if (isImage) {
        assetsSubFolder = 'images';
      } else if (isFont) {
        assetsSubFolder = 'fonts';
      } else {
        throw new Error(`Unhandled asset extension ${last(assetName.split('.'))}`);
      }

      const resultAssetPath = `../${assetsSubFolder}/${assetName}`;

      resultFileBody = resultFileBody.replace(url, resultAssetPath);
    });

    try {
      fs.writeFileSync(cssFilePath, resultFileBody, {encoding: 'utf8'});
    } catch(ex) {
      console.error('Error, while overwriting css file', ex);
    }
  }
}
