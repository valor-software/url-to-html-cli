import { addExtension, removeEndSlash } from './utils';
import FileManager from './file-manager';
import Loader from './loader';

export default class TagsProcessor {
  sanitizedHost: string;

  constructor(private originalUrl: string, hostUrl: string,
              private fileManager: FileManager, private loader: Loader) {
    this.sanitizedHost = removeEndSlash(hostUrl)
  }


  processATag(item: any, url: string, host: string): string[] {
    const linksList = [];
    if (item.attributes.href) {
      const href = removeEndSlash(item.attributes.href.value);
      
      if (href.startsWith(url)) {
        linksList.push(href);
        item.attributes.href.value = addExtension(
          host,
          href.replace(url, host)
        );

      }
      if (!href.startsWith('http') && !href.startsWith('#')) {
        linksList.push(`${url}${href}`);
        item.attributes.href.value = addExtension(host, href);
      }
    }
    return linksList;
  }
  
  processScript(item: any, folder) {
    if (!item.attributes || !(item.attributes as any).src) {
      return;
    }
    item.attributes.src.value = this.loader.addToQueue(item.attributes.src.value, 'javascript', folder);

  }


  processLink(item: any, folder) {
    if (!item.attributes.href) {
      return;
    }

    // for links such favicon and similar
    const linkType = item.attributes.type ? item.attributes.type.value : 'image';
    item.attributes.href.value = this.loader.addToQueue(item.attributes.href.value, linkType, folder);
  }

  processImage(item, folder) {
    if (!item.attributes || !(item.attributes as any).src || (item.attributes as any).src.value === '') {
      return;
    }
    const srcVal = (item.attributes as any).src.value;
    const srcset = (item.attributes as any).srcset;
    if (srcset && srcset.value) {
      const srcsetVals = srcset.value
        .split(',')
        .map(srcsetItem => srcsetItem.trim().split(' '))
        .map(item => item[0]);
      if (srcsetVals && srcsetVals.length > 0) {
        srcsetVals.forEach(val => {
          (item.attributes as any).srcset.value =
            (item.attributes as any).srcset.value
              .replace(val, this.loader.addToQueue(val, 'image', folder));

        });
      }
    }
    (item.attributes as any).src.value = this.loader.addToQueue(srcVal, 'image', folder);
  }

  processStyleAttr(item, folder) {
    if (item.attributes && item.attributes.style) {
      const style = item.attributes.style.value;
      const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;()]*[-A-Z0-9+&@#\/%=~_|])/ig;
      item.attributes.style.value = style.replace(urlRegex, (url) => {
        return this.loader.addToQueue(url, 'image', folder);
      });
    }
  }
}
