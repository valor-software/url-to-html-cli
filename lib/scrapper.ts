import Loader from './loader';

const request = require("request");
import * as urlParser from 'url';
const JSDOM = require("jsdom").JSDOM;
import FileManager from './file-manager';
import TagsProcessor from './tags-processor';
import { addExtension } from './utils';

export default class Scrapper {
  tagsProcessor: TagsProcessor;

  constructor(private url: string, private host: string,
              private fManager: FileManager, private loader: Loader) {
    this.tagsProcessor = new TagsProcessor(url, host, this.fManager, this.loader);
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
