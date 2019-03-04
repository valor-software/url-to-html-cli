import { TransformCallback } from 'stream';

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

        piped.on('finish', () => { console.log('FINISH')});
        piped.on('end', () => { console.log('END')});

        piped.on('close', () => {
          console.log('IN CLOSE');
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
}
