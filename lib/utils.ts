export function removeEndSlash(link: string): string {
  return link.replace(/#\/$/, '').replace(/\/$/, '');
}

export function removeStartSlash(link: string): string {
  return link.replace(/^\//, '');
}

export function addExtension(host: string, link: string): string {
  if (link === '' || link === '/') {
    return host;
  }

  if (link.startsWith('/')) {
    return `${host}${link}.html`;
  }
  
  if (link.endsWith('.html')) {
    return link;
  }

  return `${link}.html`;
}

export function getLinkFolder(linkType) {
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
    }, {
      type: 'js',
      folder: 'assets/js'
    }, {
      type: 'webm',
      folder: 'assets/videos'
    }, {
      type: 'mp4',
      folder: 'assets/videos'
    }
  ];
  const folder = types.find(item => item.type === linkType);
  return folder ? folder.folder : 'assets/images';
}

export function normalizeUrl(path: string, originalUrl): string {
  if (path.startsWith('http')) {
    return path;
  }

  return `${removeEndSlash(originalUrl)}/${removeStartSlash(path)}`;
}

export function processResourcesFromString(txt: string, replacer): string {
  const rgx = /(http(s?):)([()%/|.|\w|\s|-])*\.(?:png|jpg|jpeg|gif|svg|mp4|webm|js|css)/ig;
  return txt.toString().replace(rgx, replacer);
}

export function getResExtension(url: string): string {
  return url.split('.').pop();
}

export function getUniqueItems<T>(list: T[]): T[] {
  return list.reduce((list: T[], item: T) => {
    if (list.indexOf(item) === -1) {
      list.push(item);
    }
    return list;
  }, []);
}
