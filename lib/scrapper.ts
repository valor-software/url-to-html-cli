import * as urlParser from 'url';

const request = require('request');
const Spinner = require('cli-spinner').Spinner;
import chalk from 'chalk';
const JSDOM = require('jsdom').JSDOM;

import FileManager from './file-manager';
import TagsProcessor from './tags-processor';
import Loader from './loader';
import { addExtension, getUniqueItems, removeProtocol } from './utils';

export default class Scrapper {
  tagsProcessor: TagsProcessor;
  scrappedPages: string[] = [];
  url: string;
  host: string;
  constructor(private fManager: FileManager, private loader: Loader) {}

  scrap(answers) {
    this.scrappedPages = [];
    this.url = answers.url;
    this.host = answers.host;
    this.tagsProcessor = new TagsProcessor(this.loader);

    return new Promise(async (res) => {
      let pages = [{
        page: this.url,
        isProcessed: false
      }];
      let isSitemap = false;
      if (answers.sitemap && answers.sitemap !== '') {
        try {
          const sitemap = await this.loader.getContentByUrl(`${answers.url}/${answers.sitemap}`);

          pages = sitemap
            .match(/<loc>(.*?)<\/loc>/g)
            .map(val => {
              return {
                page: val.replace(/<\/?loc>/g, ''),
                isProcessed: false
              };
            });
          isSitemap = true;
          console.log(chalk.green(chalk.bold(`Sitemap processed. Found ${pages.length} links\n`)));
        } catch (e) {
          console.log(chalk.red(chalk.bold(e)));
        }
      }

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

        if (!isSitemap) {
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
        }

        pages.find(page => page.page === currentUrl).isProcessed = true;

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

  addFiles(filesList: {path: string; name: string}[], folder) {
    return new Promise(async (res) => {
      console.log(chalk.green(chalk.yellow('Adding files')));
      const toCopy = filesList.map(async file => {
        await this.fManager.copy(file.path, `./save/${folder}/${file.name}`);
      });
      await Promise.all(toCopy);
      console.log(chalk.green(chalk.bold('All files were added\n')));
      res();
    });
  }

  generateSitemap(folder: string) {
    const forbiddenPatterns = ['/cdn-cgi/l/'];
    const host = removeProtocol(this.host);
    const url = removeProtocol(this.url);

    const sitemap =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      ].concat(
        this.scrappedPages
          .filter(page =>
            typeof forbiddenPatterns.find(pattern =>
              page.indexOf(pattern) > -1) === 'undefined')
          .map(item => {
            const finalPage = item.replace(url, host);

            return `  <url><loc>${finalPage}</loc></url>`;
          })
      )
      .concat(['</urlset>'])
      .join('\n');

    return this.fManager.save(folder, 'sitemap.xml', sitemap);
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
        case 'base':
          if (item.attributes.href) {
            item.attributes.href.value = this.host;
          }
          break;
        case 'link':
          this.tagsProcessor.processLink(item, folder);
          break;
        default:
      }

      this.tagsProcessor.processDataAttrs(item, folder);
      if (!item.children || item.children.length === 0) {
        return;
      }
      const links = this.getLinksList(item.children, folder);
      linksList = linksList.concat(links);
    });
    return linksList;
  }

  getPageHTML(url: string, folder: string, originalUrl: string): Promise<string[]> {
    this.scrappedPages.push(url);
    return new Promise(async (res, rej) => {
      await request(url, async (err, resp, body) => {
        if (err) {
          return rej(err);
        }

        const dom = new JSDOM(body);
        const links = getUniqueItems(this.getLinksList(dom.window.document.children, folder));

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

        this.fManager.save(fullPath, filename, fileBody);

        res(links);
      });
      
    });
  }

}
