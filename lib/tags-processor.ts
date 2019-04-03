import {
  addExtension,
  getResExtension,
  processResourcesFromString,
  removeEndSlash, removeStartSlash
} from './utils';
import Loader from './loader';

export default class TagsProcessor {
  constructor(private loader: Loader) {}

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

      if (!href.startsWith('http') &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:')
      ) {
        const normalizedHref = href !== '' ? '/' + removeStartSlash(href) : '';
        linksList.push(`${url}${normalizedHref}`);
        item.attributes.href.value = addExtension(host, normalizedHref);
      }
    }
    return linksList;
  }

  processLink(item: any, folder) {
    if (!item.attributes.href) {
      return;
    }

    // for links such favicon and similar
    const linkType = item.attributes.type ? item.attributes.type.value : 'image';
    item.attributes.href.value = this.loader.addToQueue(item.attributes.href.value, linkType, folder);
  }

  processDataAttrs(item, folder) {
    if (!item.attributes || item.attributes.length === 0) {
      return;
    }

    Object.keys(item.attributes).forEach(key => {
      const attribute = item.attributes[key];
      if (attribute.name === 'href') {
        return;
      }
      const attrVal = attribute.value;
      item.attributes[key].value = processResourcesFromString(attrVal, (url) => {
        const ext = getResExtension(url);
        
        return this.loader.addToQueue(url, ext, folder);
      });
    });
  }
}
