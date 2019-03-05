// export function removeTrailingSlashes(link: string): string {
//   return removeStartSlash(removeEndSlash(link));
// }

export function removeEndSlash(link: string): string {
  return link.replace(/#\/$/, '');
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
