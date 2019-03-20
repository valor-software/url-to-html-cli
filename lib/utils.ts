// export function removeTrailingSlashes(link: string): string {
//   return removeStartSlash(removeEndSlash(link));
// }

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
