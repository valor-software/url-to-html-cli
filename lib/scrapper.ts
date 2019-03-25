import * as urlParser from 'url';

const request = require('request');
const Spinner = require('cli-spinner').Spinner;
import chalk from 'chalk';
const JSDOM = require('jsdom').JSDOM;

import FileManager from './file-manager';
import TagsProcessor from './tags-processor';
import Loader from './loader';
import { addExtension } from './utils';

export default class Scrapper {
  tagsProcessor: TagsProcessor;
  url: string;
  host: string;
  constructor(private fManager: FileManager, private loader: Loader) {}

  scrap(answers) {
    this.url = answers.url;
    this.host = answers.host;
    this.tagsProcessor = new TagsProcessor(this.loader);

    let pages = [{
      page: this.url,
      isProcessed: false
    }];

    return new Promise(async (res, rej) => {
      while(true) {
        const current = pages.find(p => !p.isProcessed);

        if (!current) {
          break;
        }

        const currentUrl = current.page;
        const spinner = new Spinner({text: `Parsing: ${currentUrl} %s`});
        spinner.setSpinnerString(27);
        spinner.start();
        let newpages = await this.getPageHTML(currentUrl, answers.folder, answers.url);

        newpages = newpages.reduce((list, item) => {
          if (list.indexOf(item) === -1) {
            list.push(item);
          }
          return list;
        }, []);

        pages.find(page => page.page === currentUrl).isProcessed = true;
        pages = pages.concat(
          newpages
            .filter(page => {
              return (pages.findIndex(p => p.page === page)) === -1;
            })
            .map(page => {
              return {
                page,
                isProcessed: false
              }
            }));

        spinner.stop(true);
        console.log(currentUrl + chalk.green(' done'));
      }
      console.log(chalk.green(chalk.bold('Parsing complete. Uploading resources\n')));

      await this.loader.loadResources();

      console.log(chalk.green(chalk.bold('Uploading complete. Analyzing CSS files\n')));

      await this.loader.processCssFiles();
      await this.loader.loadResources();

      console.log(chalk.green(chalk.bold('Scrapping complete\n')));

      res();
    });

  }

  getLinksList(inp, folder) {
    // array for saving found internal links
    let linksList = [];
    Object.values(inp).forEach((item: any) => {
      switch(item.nodeName.toLowerCase()) {
        case 'a':
          linksList = linksList
            .concat(this.tagsProcessor.processATag(item, this.url, this.host));
          break;
        case 'meta':
          this.tagsProcessor.processMeta(item, folder);
          break;
        case 'base':
          if (item.attributes.href) {
            item.attributes.href.value = this.host;
          }
          break;
        case 'link':
          this.tagsProcessor.processLink(item, folder);
          break;
        case 'script':
          this.tagsProcessor.processScript(item, folder);
          break;
        case 'img':
          this.tagsProcessor.processImage(item, folder);
          break;
        default:
      }

      this.tagsProcessor.processStyleAttr(item, folder);
      if (!item.children || item.children.length === 0) {
        return;
      }
      const links = this.getLinksList(item.children, folder);
      linksList = linksList.concat(links);
    });
    return linksList;
  }

  getPageHTML(url: string, folder: string, originalUrl: string): Promise<string[]> {

    return new Promise(async (res, rej) => {
      await request(url, async (err, resp, body) => {
        if (err) {
          return rej(err);
        }

        const dom = new JSDOM(body);
        const links = this.getLinksList(dom.window.document.children, folder);

        const split = urlParser.parse(url).pathname.split('/');
        const pageName = split.pop();

        let fullPath = folder;
        // building nested html paths, e.g. /articles/category/content
        for (let i = 0; i < split.length; i++) {
          const currentSegment = split[i];
          if (!currentSegment || currentSegment === '') {
            continue;
          }

          fullPath += `/${currentSegment}`;

          await this.fManager.createFolder(fullPath);
        }

        let filename = pageName === '/' || pageName === '' ? 'index' : pageName;

        filename = addExtension(this.host, filename);

        const urlDomain = originalUrl.replace(/(^\w+:|^)\/\//, '');
        const fileBody = dom.window.document.documentElement.outerHTML.replace(urlDomain, this.host);

        this.fManager.save(`${fullPath}/`, filename, fileBody);

        res(links);
      });
      
    });
  }

}
